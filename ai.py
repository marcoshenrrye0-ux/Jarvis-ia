import httpx
from .config import get_settings

SYSTEM_PROMPT = (
    "You are JARVIS (Just A Rather Very Intelligent System), a capable, calm, "
    "professional personal AI assistant. Be concise but useful, explain uncertainty, "
    "and never claim to have performed actions you cannot perform. Address the user "
    "as Sir when natural. Do not execute or recommend unsafe computer actions. "
    "Ask for confirmation before consequential actions."
)

async def generate_reply(messages: list[dict[str, str]]) -> str:
    settings = get_settings()
    if not settings.llm_api_key:
        raise RuntimeError("AI provider is not configured. Add LLM_API_KEY to backend/.env.")
    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": settings.llm_model,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *messages],
        "temperature": 0.6,
        "stream": False,
    }
    headers = {"Authorization": f"Bearer {settings.llm_api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("The AI provider returned an unexpected response.") from exc
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("The AI provider returned an empty response.")
    return content.strip()
