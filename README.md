# J.A.R.V.I.S. — Personal AI Assistant

A runnable full-stack starter for a JARVIS-inspired assistant. The project includes:
- React + TypeScript + Vite frontend with a responsive HUD-style interface.
- FastAPI backend with an OpenAI-compatible chat provider (Groq and other compatible APIs).
- Server-side API-key handling via environment variables.
- Browser speech recognition and speech synthesis (where supported).
- SQLite-backed conversation history on the backend.
- Task list stored in browser local storage.
- Health/status endpoint and basic backend tests.

## Requirements
- Python 3.10+
- Node.js 20+
- An API key for an OpenAI-compatible provider (optional for UI; required for live AI replies).

## Quick start

### 1. Configure the backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
Edit `backend/.env` and set `LLM_API_KEY`. For Groq, the default base URL is
`https://api.groq.com/openai/v1`. Never put provider keys in frontend files.

### 2. Start the API
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API docs: http://127.0.0.1:8000/docs

### 3. Start the frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## Voice support
The microphone uses the browser Web Speech API where available (commonly Chrome/Edge).
Speech output uses the browser SpeechSynthesis API. Browser support and voice quality vary.
Microphone access requires permission and a secure context (localhost is allowed).

## Current capability boundaries
- AI chat is live when a valid backend provider key is configured.
- Web research, calendar/email integrations, computer control, camera analysis, and smart-home control are **not enabled** in this starter. They require explicit integrations, permissions, and provider-specific implementation.
- No arbitrary shell execution is exposed.
- Task data is stored in this browser's local storage; it is not synced between devices.
- Conversation history is stored locally in the backend SQLite database at `backend/jarvis.db`.
- This starter is not production-hardened. Before public deployment, add authentication, rate limiting, HTTPS, secret management, CSRF/CORS review, backups, and operational monitoring.

## Provider configuration
The backend uses the OpenAI-compatible `/chat/completions` API.
- Groq: `LLM_BASE_URL=https://api.groq.com/openai/v1`
- Other compatible providers: set their base URL, model, and key in `.env`.

## Tests
```bash
cd backend
pytest
```


## Android — instalar como aplicativo
O frontend inclui manifest e service worker para instalação como PWA. Depois de publicar o frontend em HTTPS:
1. Abra o endereço do JARVIS no Chrome do Android.
2. Toque no menu ⋮ e escolha **Instalar app** ou **Adicionar à tela inicial**.
3. Abra pelo ícone JARVIS. O navegador pode pedir permissão de microfone na primeira utilização.

O modo offline mantém apenas a estrutura básica da interface; conversar com a IA exige internet e o backend ativo.

## Publicação sem programar (Render)
O arquivo `render.yaml` descreve o serviço de API e o site. Para publicar:
1. Crie uma conta no Render e conecte o repositório GitHub contendo este projeto.
2. Crie um **Blueprint** usando `render.yaml`.
3. Quando solicitado, informe `LLM_API_KEY` como variável secreta no serviço `jarvis-api`. Nunca coloque a chave no frontend.
4. Após publicar, confirme que `/api/health` responde e teste o chat.
5. Instale pelo Chrome Android usando os passos acima.

Nota: o blueprint usa armazenamento temporário para SQLite; dados podem ser perdidos ao reiniciar/reimplantar. Para persistência real em produção, conecte PostgreSQL ou disco persistente e configure autenticação, limites de uso e backups.
