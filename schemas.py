from typing import Literal
from pydantic import BaseModel, Field

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=20000)

class ChatRequest(BaseModel):
    conversation_id: str = Field(min_length=1, max_length=100)
    messages: list[Message] = Field(min_length=1, max_length=40)

class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    model: str
