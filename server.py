# server.py
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import ollama

app = FastAPI()

# Allow requests from your extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class Request(BaseModel):
    prompt: str

@app.post("/ask")
def ask(request: Request):
    try:
        response = ollama.chat(
            model="llama3",
            messages=[{"role": "user", "content": request.prompt}]
        )

        # Extract only the assistant's text
        response_text = response.message.content  # this is the text you want

        return {"response": response_text}

    except Exception as e:
        return {"error": str(e)}
    
    
    # uvicorn server:app --reload --host 0.0.0.0 --port 8000


