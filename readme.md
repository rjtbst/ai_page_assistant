
# 🤖 AI Browser Automation - Production Ready

A powerful Chrome extension powered by LLaMA3 AI for intelligent browser automation. Extract data, fill forms, click buttons, and automate web tasks using natural language.

## ✨ Features

### 🔍 Data Extraction
- **Extract all links** - Get every hyperlink with text and URL
- **Find images** - Retrieve all images with src and alt text
- **Get headings** - Extract all H1-H6 tags
- **CSS Selectors** - Query any element using CSS selectors
- **Forms analysis** - Identify all form fields
- **Metadata extraction** - Get page meta information

### 📝 Form Automation
- **Smart field matching** - Automatically matches fields by name, ID, or placeholder
- **Multiple input types** - Supports text, email, password, textarea, select, checkbox, radio
- **Event triggering** - Properly triggers input, change, and blur events

### 🖱️ Element Interaction
- **Click buttons** - Find and click by text, ID, class, or selector
- **Smart element finding** - Uses multiple strategies to locate elements
- **Visual feedback** - Highlights elements before clicking

### 🧭 Navigation
- **URL navigation** - Go to any website
- **Intelligent URL handling** - Automatically adds https:// if needed

## 📦 Installation

### 1. Backend Setup

#### Prerequisites
- Python 3.8+
- Ollama installed with LLaMA3 model

#### Install Ollama and LLaMA3
```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull LLaMA3 model
ollama pull llama3
```

#### Install Python Dependencies
```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Project Structure
```
project/
├── main.py
├── requirements.txt
├── prompts/
│   └── systemInstruction.txt
└── extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    ├── background.js
    └── icons/ (create these)
```

Create the prompts directory:
```bash
mkdir -p prompts
# Copy systemInstruction.txt to prompts/systemInstruction.txt
```

#### Run the Backend
```bash
python main.py
```

Server will start at `http://127.0.0.1:8000`

### 2. Chrome Extension Setup

#### Create Icons
Create three icon files (or use placeholders):
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

#### Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select your extension folder
5. The extension icon should appear in your toolbar

## 🚀 Usage

### Basic Examples

#### Data Extraction
```
Get all links from this page
Show me all images
Extract all headings
Find all buttons
Get text from .main-content selector
```

#### Form Filling
```
Fill email with test@example.com and password with secret123
Login as john@example.com
Enter username: testuser
```

#### Element Clicking
```
Click the submit button
Press the login button
Click on "Sign Up"
Click the first button
```

#### Navigation
```
Go to google.com
Open amazon.com
Navigate to https://example.com
```

### Advanced Examples

#### Complex Queries
```
Get all links with their text and URLs
Find all images and their alt text
Extract all headings with their levels
Show me all form fields on this page
```

#### Research Tasks
```
Extract all email addresses from this page
Find all phone numbers
Get all social media links
Extract product prices
```

#### Automation Sequences
1. Fill form: `Fill email with test@test.com and password with pass123`
2. Submit: `Click the login button`
3. Extract data: `Get all product links`

## 🛠️ Configuration

### Backend Configuration

#### Change Port
Edit `main.py`:
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)  # Change port here
```

#### Change AI Model
Edit `main.py`:
```python
ai_processor = AIProcessor(model="llama3.1")  # Use different model
```

#### Adjust Content Limits
Edit `main.py` in `build_context` method:
```python
text_preview = request.page_text[:5000]  # Increase character limit
```

### Frontend Configuration

#### Change API Endpoint
Edit `popup.js`:
```javascript
const response = await fetch('http://127.0.0.1:8080/ask', {  // Change URL
```

## 🔧 Troubleshooting

### Backend Issues

#### "Connection refused"
- Ensure backend is running: `python main.py`
- Check if port 8000 is available
- Verify firewall settings

#### "Model not found"
```bash
# Pull the model again
ollama pull llama3
```

#### "Module not found"
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Extension Issues

#### Extension not loading
- Check manifest.json for syntax errors
- Ensure all files are in correct locations
- Check Chrome console for errors (F12)

#### No response from AI
- Check if backend is running
- Open browser console (F12) and check for errors
- Verify CORS is enabled in backend

#### Elements not clicking
- Try more specific selectors
- Check if element is visible and clickable
- Look for iframes (elements in iframes need special handling)

## 📊 API Reference

### POST /ask

Request body:
```json
{
  "prompt": "Get all links",
  "page_html": "<html>...</html>",
  "page_text": "Page content...",
  "page_url": "https://example.com",
  "page_title": "Example Page"
}
```

Response format:
```json
{
  "action": "query|fill_form|click|navigate",
  "data": "action-specific data"
}
```

### Action Types

#### query/extract
```json
{
  "action": "query",
  "data": [{"text": "Link", "href": "/path"}]
}
```

#### fill_form
```json
{
  "action": "fill_form",
  "data": {"email": "test@test.com", "password": "pass"}
}
```

#### click
```json
{
  "action": "click",
  "data": "#submitBtn"
}
```

#### navigate
```json
{
  "action": "navigate",
  "data": {"url": "https://example.com"}
}
```

## 🔒 Security Considerations

- Backend runs locally only (127.0.0.1)
- No data is sent to external servers except Ollama locally
- Extension requires explicit permissions
- Always review extracted data before using
- Be cautious with form filling on sensitive sites

## 🚀 Performance Optimization

### Backend
- Uses BeautifulSoup for fast HTML parsing
- Direct extraction for common queries (no AI needed)
- Limits content size sent to AI
- Proper error handling and logging

### Frontend
- Async/await for non-blocking operations
- Efficient DOM queries
- Minimal memory footprint
- Visual feedback for long operations

## 📈 Future Enhancements

- [ ] Support for iframes
- [ ] Screenshot capture
- [ ] Wait for element conditions
- [ ] Multi-step automation workflows
- [ ] Export/import automation scripts
- [ ] Custom AI model support
- [ ] Proxy support
- [ ] Headless mode

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Better element selection algorithms
- More intelligent form field matching
- Additional data extraction patterns
- UI/UX improvements
- Documentation

## 📝 License

MIT License - feel free to use and modify

## 🙏 Acknowledgments

- Built with FastAPI
- Powered by Ollama and LLaMA3
- BeautifulSoup for HTML parsing
- Chrome Extensions API

---

**Note**: This is a development tool. Always respect website terms of service and robots.txt when automating interactions.
