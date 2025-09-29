🧩 AI Page Assistant – Chrome Extension
📖 Overview

This Chrome extension lets you interact with any webpage using natural language. You type an instruction or question, the extension collects the page text, sends it to a local FastAPI server (LLM backend), and shows the model’s response.

Think of it as “ChatGPT for the page you’re looking at”.

✨ Features

Extracts the entire visible text of the active page.

Combines it with your instruction (prompt).

Sends it to a FastAPI backend (LLM like llama.cpp, Ollama, or OpenAI API).

Displays the model’s response inside the extension popup.

⚙️ Installation

Clone this repo.

git clone https://github.com/yourname/ai-page-assistant.git
cd ai-page-assistant


Load the extension in Chrome:

Open chrome://extensions

Enable Developer Mode

Click Load unpacked and select the project folder

Start your FastAPI backend (make sure it runs on http://127.0.0.1:8000). with- uvicorn server:app --reload --host 0.0.0.0 --port 8000

🛠️ Usage

Open any webpage (e.g., Wikipedia, news article, job description).

Click the extension icon.

Type your instruction (e.g., “Summarize this page in 3 bullet points”).

The extension sends the page text + instruction to the backend.

The backend responds, and the extension displays the result.

📂 Project Structure
chrome-extension/
│── manifest.json        # Extension config
│── popup.html           # Popup UI
│── popup.js             # Handles user input, tab query, and API call
│── background.js        # (optional) Extension lifecycle
api/
│── server.py              # FastAPI server (handles /ask requests)

🧩 Example Use Cases

Summarize long articles or blog posts.

Extract key points from research papers.

Ask questions about job descriptions or resumes.

Get a TL;DR of a product page before buying.

Translate visible text into another language.

🚀 Roadmap (Future Ideas)

 Execute actions on the page (click, fill forms).

