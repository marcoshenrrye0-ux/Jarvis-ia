import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .database import connect, init_db
from .schemas import ChatRequest, ChatResponse
from .ai import generate_reply

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("jarvis")
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "assistant": settings.app_name,
        "ai_configured": bool(settings.llm_api_key),
        "model": settings.llm_model if settings.llm_api_key else None,
    }

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    with connect() as db:
        rows = db.execute(
            "SELECT role, content, created_at FROM messages WHERE conversation_id=? ORDER BY id",
            (conversation_id,)
        ).fetchall()
    return {"conversation_id": conversation_id, "messages": [dict(row) for row in rows]}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Only accept user/assistant roles from the validated schema. The system prompt stays server-side.
    conversation_id = request.conversation_id or str(uuid.uuid4())
    history = [{"role": item.role, "content": item.content} for item in request.messages]
    try:
        reply = await generate_reply(history)
    except httpx_error_types() as exc:
        log.warning("AI provider request failed: %s", exc)
        raise HTTPException(status_code=502, detail="The AI provider could not be reached. Check provider settings and try again.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        log.exception("Unexpected chat failure")
        raise HTTPException(status_code=500, detail="JARVIS encountered an unexpected error.") from None

    # Persist the latest user message and assistant reply.
    with connect() as db:
        last_user = next((m for m in reversed(history) if m["role"] == "user"), None)
        if last_user:
            db.execute("INSERT INTO messages(conversation_id, role, content) VALUES(?,?,?)",
                       (conversation_id, "user", last_user["content"]))
        db.execute("INSERT INTO messages(conversation_id, role, content) VALUES(?,?,?)",
                   (conversation_id, "assistant", reply))
    return ChatResponse(conversation_id=conversation_id, reply=reply, model=settings.llm_model)

def httpx_error_types():
    import httpx
    return (httpx.HTTPError,)
