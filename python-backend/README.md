# ATS RAG Backend

Session-isolated FastAPI server. Each session has its own ChromaDB persist directory.

## Run

```bash
pip install fastapi uvicorn python-multipart python-dotenv \
  langchain langchain-community langchain-chroma langchain-openai \
  langchain-text-splitters pypdf docx2txt

# .env
# OPENAI_API_KEY=sk-...
# OPENAI_BASE_URL=https://api.openai.com/v1   (or your proxy)
# CORS_ORIGINS=https://your-app.lovable.app,http://localhost:5173

uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- `POST /sessions/{sid}/ingest` — form-data `resume`, `jd`
- `POST /sessions/{sid}/analyze` — returns `{ analysis }`
- `POST /sessions/{sid}/chat` — `{ message, history }` → `{ answer }`
- `DELETE /sessions/{sid}` — wipes that session
- `GET /health`

Put the deployed URL into the app's **Settings → API URL**.
