"""
FastAPI server exposing the session-isolated ATS RAG pipeline.

Each session gets its own ChromaDB persist directory:
    chroma_db/<session_id>/

Endpoints:
  POST /sessions/{sid}/ingest   form-data: resume, jd
  POST /sessions/{sid}/analyze  -> { analysis }
  POST /sessions/{sid}/chat     json: { message, history } -> { answer }
  DELETE /sessions/{sid}        wipes session collection + files

Run:
    pip install fastapi uvicorn python-multipart python-dotenv \
        langchain langchain-community langchain-chroma langchain-openai \
        langchain-text-splitters pypdf docx2txt
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload

Set CORS_ORIGINS env var to your deployed app URL (comma separated) or "*".
"""
import os
import shutil
from typing import List, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_chroma import Chroma
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from retrieval_pipeline import (
    analyze_resume_vs_jd,
    format_documents,
    rephrase_query,
    retrieve_chunks,
)

load_dotenv()

BASE_CHROMA_DIR = os.path.abspath("chroma_db")
BASE_UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(BASE_CHROMA_DIR, exist_ok=True)
os.makedirs(BASE_UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="ATS RAG API")

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_methods=["*"],
    allow_headers=["*"],
)


def session_paths(sid: str):
    return (
        os.path.join(BASE_CHROMA_DIR, sid),
        os.path.join(BASE_UPLOAD_DIR, sid),
    )


def get_embedding_model():
    return OpenAIEmbeddings(
        model="openai/text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_api_base=os.getenv("OPENAI_BASE_URL"),
    )


def get_llm():
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_api_base=os.getenv("OPENAI_BASE_URL"),
    )


def get_vector_store(sid: str):
    chroma_dir, _ = session_paths(sid)
    return Chroma(
        persist_directory=chroma_dir,
        embedding_function=get_embedding_model(),
        collection_metadata={"hnsw:space": "cosine"},
    )


def load_file(path: str, filename: str, doc_type: str):
    loader = PyPDFLoader(path) if filename.lower().endswith(".pdf") else Docx2txtLoader(path)
    docs = loader.load()
    for d in docs:
        d.metadata["document_type"] = doc_type
        d.metadata["source_file"] = filename
    return docs


@app.post("/sessions/{sid}/ingest")
async def ingest(sid: str, resume: UploadFile = File(...), jd: UploadFile = File(...)):
    chroma_dir, upload_dir = session_paths(sid)
    # fully reset this session's collection
    if os.path.exists(chroma_dir):
        shutil.rmtree(chroma_dir)
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir, exist_ok=True)

    resume_path = os.path.join(upload_dir, resume.filename)
    jd_path = os.path.join(upload_dir, jd.filename)
    with open(resume_path, "wb") as f:
        f.write(await resume.read())
    with open(jd_path, "wb") as f:
        f.write(await jd.read())

    docs = load_file(resume_path, resume.filename, "resume") + load_file(
        jd_path, jd.filename, "job_description"
    )
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=400, chunk_overlap=100, length_function=len
    ).split_documents(docs)

    vs = get_vector_store(sid)
    vs.add_documents(documents=chunks, ids=[str(uuid4()) for _ in chunks])

    return {"ok": True, "chunks": len(chunks), "session_id": sid}


class ChatMsg(BaseModel):
    role: str
    content: str


class ChatBody(BaseModel):
    message: str
    history: List[ChatMsg] = []


def to_lc_history(history: List[ChatMsg]):
    out = []
    for m in history:
        if m.role == "user":
            out.append(HumanMessage(content=m.content))
        else:
            out.append(AIMessage(content=m.content))
    return out


@app.post("/sessions/{sid}/analyze")
def analyze(sid: str):
    vs = get_vector_store(sid)
    llm = get_llm()
    resume_docs = retrieve_chunks(vs, "skills experience qualifications", "resume", k=8)
    jd_docs = retrieve_chunks(vs, "required skills responsibilities qualifications", "job_description", k=8)
    if not resume_docs or not jd_docs:
        raise HTTPException(400, "Session has no ingested documents")
    answer = analyze_resume_vs_jd(
        llm,
        format_documents(resume_docs),
        format_documents(jd_docs),
        [],
        "Perform a full ATS analysis of this resume against the job description.",
    )
    return {"analysis": answer}


@app.post("/sessions/{sid}/chat")
def chat(sid: str, body: ChatBody):
    vs = get_vector_store(sid)
    llm = get_llm()
    history = to_lc_history(body.history)
    standalone = rephrase_query(llm, history, body.message)
    resume_docs = retrieve_chunks(vs, f"skills experience for {standalone}", "resume")
    jd_docs = retrieve_chunks(vs, f"required skills for {standalone}", "job_description")
    if not resume_docs or not jd_docs:
        raise HTTPException(400, "Session has no ingested documents")
    answer = analyze_resume_vs_jd(
        llm,
        format_documents(resume_docs),
        format_documents(jd_docs),
        history,
        standalone,
    )
    return {"answer": answer}


@app.delete("/sessions/{sid}")
def delete_session(sid: str):
    chroma_dir, upload_dir = session_paths(sid)
    for p in (chroma_dir, upload_dir):
        if os.path.exists(p):
            shutil.rmtree(p)
    return {"ok": True}


@app.get("/health")
def health():
    return {"ok": True}
