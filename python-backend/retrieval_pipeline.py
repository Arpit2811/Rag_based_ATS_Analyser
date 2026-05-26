from dotenv import load_dotenv
import os
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
import warnings
warnings.filterwarnings("ignore")

load_dotenv()

chroma_path = "chroma_db"


def get_embedding_model():
    return OpenAIEmbeddings(
        model="openai/text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_api_base=os.getenv("OPENAI_BASE_URL"),
    )


def load_vector_store(embedding_model):
    return Chroma(
        persist_directory=chroma_path,
        embedding_function=embedding_model,
        collection_metadata={"hnsw:space": "cosine"},
    )


def load_llm():
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_api_base=os.getenv("OPENAI_BASE_URL"),
    )


def retrieve_chunks(vector_store, query, doc_type, k=5):
    return vector_store.similarity_search(
        query=query,
        k=k,
        filter={"document_type": doc_type}
    )


def format_documents(documents):
    formatted = []
    for doc in documents:
        source = doc.metadata.get("source_file", "unknown")
        formatted.append(f"[Source: {source}]\n{doc.page_content}")
    return "\n\n".join(formatted)


# ✅ NEW: Rephrases follow-up questions into standalone queries
def rephrase_query(llm, chat_history, current_question):
    """
    If the user asks 'what about the missing skills?', this rewrites it
    to a fully self-contained question using the conversation history.
    """
    if not chat_history:
        # No history yet — use the question as-is
        return current_question

    rephrase_prompt = ChatPromptTemplate.from_messages([
        ("system", """Given the conversation history and the latest user question, \
rephrase the question to be fully self-contained (no pronouns like 'it', 'that', 'those' \
that refer to prior context). Do NOT answer the question — only rephrase it. \
If the question is already self-contained, return it unchanged."""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    chain = rephrase_prompt | llm | StrOutputParser()
    return chain.invoke({
        "chat_history": chat_history,
        "question": current_question
    })


def analyze_resume_vs_jd(llm, resume_context, jd_context, chat_history, question):
    """
    History-aware ATS analysis. Passes the full conversation history
    so the LLM can answer follow-up questions with full context.
    """
    system_prompt = """You are an expert ATS Resume Analyzer.

You have access to resume chunks and a job description. Use the conversation \
history to answer follow-up questions accurately.

For a new analysis, return output in this format:
1. Match Score (0-100)
2. Strong Matching Skills
3. Missing Skills
4. Missing ATS Keywords
5. Resume Improvement Suggestions
6. Final Verdict

For follow-up questions, answer concisely and directly.

Resume context:
{resume}

Job Description context:
{job_description}"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    chain = prompt | llm | StrOutputParser()

    return chain.invoke({
        "resume": resume_context,
        "job_description": jd_context,
        "chat_history": chat_history,
        "question": question,
    })


def main():
    print("Loading history-aware RAG pipeline...\n")
    print("Type 'exit' or 'quit' to stop.\n")

    embedding_model = get_embedding_model()
    vector_store = load_vector_store(embedding_model)
    llm = load_llm()

    # ✅ Persistent chat history across turns
    chat_history = []

    # ✅ Cache contexts so we don't re-retrieve on every follow-up
    resume_context = None
    jd_context = None

    while True:
        user_input = input("You: ").strip()

        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break

        # ✅ Step 1: Rephrase follow-up questions using history
        standalone_query = rephrase_query(llm, chat_history, user_input)
        print(f"\n[Rephrased query]: {standalone_query}\n")

        # ✅ Step 2: Retrieve context (only on first turn or if role changes)
        if resume_context is None or jd_context is None:
            print("Retrieving resume chunks...")
            resume_docs = retrieve_chunks(
                vector_store,
                f"skills experience qualifications for {standalone_query}",
                "resume"
            )
            print("Retrieving JD chunks...")
            jd_docs = retrieve_chunks(
                vector_store,
                f"required skills responsibilities qualifications for {standalone_query}",
                "job_description"
            )

            if not resume_docs:
                print("⚠️  No resume chunks found.")
                continue
            if not jd_docs:
                print("⚠️  No JD chunks found.")
                continue

            resume_context = format_documents(resume_docs)
            jd_context = format_documents(jd_docs)

        # ✅ Step 3: Generate answer with full history
        print("Analyzing...\n")
        answer = analyze_resume_vs_jd(
            llm,
            resume_context,
            jd_context,
            chat_history,
            standalone_query
        )

        print(f"Assistant: {answer}\n")
        print("-" * 60 + "\n")

        # ✅ Step 4: Append this turn to history for next iteration
        chat_history.append(HumanMessage(content=user_input))
        chat_history.append(AIMessage(content=answer))


if __name__ == "__main__":
    main()