import os
import shutil
from uuid import uuid4
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import warnings
warnings.filterwarnings("ignore")

load_dotenv()

chroma_path = "chroma_db"
resume_folder = "data/resumes"
jd_folder = "data/jds"


# ✅ Wipes the ChromaDB directory so no previous session's chunks remain
def reset_chroma():
    if os.path.exists(chroma_path):
        shutil.rmtree(chroma_path)
        print("🗑️  Cleared previous ChromaDB session.")
    os.makedirs(chroma_path, exist_ok=True)


# ✅ Deletes uploaded files after ingestion so they don't re-appear next session
def clear_folder(folder_path):
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        if os.path.isfile(file_path):
            os.remove(file_path)
    print(f"🗑️  Cleared files from {folder_path}")


def load_resume():
    documents = []
    files = [f for f in os.listdir(resume_folder)
             if f.endswith((".pdf", ".docx"))]

    if not files:
        raise FileNotFoundError(
            f"No resume files found in '{resume_folder}'. "
            "Please add at least one .pdf or .docx file."
        )

    for file in files:
        file_path = os.path.join(resume_folder, file)
        loader = PyPDFLoader(file_path) if file.endswith(".pdf") else Docx2txtLoader(file_path)
        docs = loader.load()
        for doc in docs:
            doc.metadata["document_type"] = "resume"
            doc.metadata["source_file"] = file
        documents.extend(docs)

    print(f"Loaded {len(documents)} resume document(s) from {len(files)} file(s)")
    return documents


def load_jds():
    documents = []
    files = [f for f in os.listdir(jd_folder)
             if f.endswith((".pdf", ".docx"))]

    if not files:
        raise FileNotFoundError(
            f"No JD files found in '{jd_folder}'. "
            "Please add at least one .pdf or .docx file."
        )

    for file in files:
        file_path = os.path.join(jd_folder, file)
        loader = Docx2txtLoader(file_path) if file.endswith(".docx") else PyPDFLoader(file_path)
        docs = loader.load()
        for doc in docs:
            doc.metadata["document_type"] = "job_description"
            doc.metadata["source_file"] = file
        documents.extend(docs)

    print(f"Loaded {len(documents)} JD document(s) from {len(files)} file(s)")
    return documents


def split_documents(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=400, chunk_overlap=100, length_function=len
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks")
    return chunks


def get_embedding_model():
    return OpenAIEmbeddings(
        model="openai/text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_api_base=os.getenv("OPENAI_BASE_URL"),
    )


def store_in_chroma(chunks, embedding_model):
    vector_store = Chroma(
        persist_directory=chroma_path,
        embedding_function=embedding_model,
        collection_metadata={"hnsw:space": "cosine"},
    )
    ids = [str(uuid4()) for _ in range(len(chunks))]
    vector_store.add_documents(documents=chunks, ids=ids)
    print(f"✅ Stored {len(chunks)} chunks in ChromaDB")


def main():
    print("Starting ingestion pipeline...\n")

    # ✅ Step 1: Always wipe old session data first
    reset_chroma()

    # ✅ Step 2: Load only the current session's files
    try:
        resumes = load_resume()
        jds = load_jds()
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        return

    all_documents = resumes + jds
    chunks = split_documents(all_documents)
    embedding_model = get_embedding_model()
    store_in_chroma(chunks, embedding_model)

    # ✅ Step 3: Remove uploaded files so next session starts clean
    clear_folder(resume_folder)
    clear_folder(jd_folder)

    print("\nIngestion pipeline completed. Session is ready.")


if __name__ == "__main__":
    main()