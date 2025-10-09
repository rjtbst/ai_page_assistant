# AI Browser Automation Extension v3.0

## 🎯 What's New in v3.0

### Multi-Step Instruction Support
The extension now intelligently handles multiple sequential instructions! You can chain actions together using natural language.

## 🚀 Features

### Single Instructions
Execute one action at a time:
- ✅ Extract detailed data from pages
- ✅ Fill form with dummy data
- ✅ Click elements
- ✅ Navigate to URLs

### Multi-Step Sequences (NEW!)
Chain multiple actions together:
- ✅ Navigate → Fill Form → Click Submit
- ✅ Go to page → Extract data → Click next
- ✅ Fill multiple forms → Click buttons
- ✅ Automatic page loading between steps
- ✅ Sequential execution with error handling

## 📝 Usage Examples

### Single Instructions
```
Get all links from this page
Fill email with test@example.com
Click the submit button
Go to https://google.com
Extract all headings
```

### Multi-Step Instructions
```
Go to contact page and then fill name with John Doe and then click submit

Navigate to google.com, then search for AI automation, then click the first result

Click login button; Fill email with user@example.com; Fill password with pass123; Click submit

Step 1: Go to the about page
Step 2: Extract all team member names
Step 3: Click the contact button
```

### Supported Separators
The AI understands multiple ways to chain commands:
- ✅ `and then` - "Go to page and then fill form"
- ✅ `then` - "Fill form then click submit"
- ✅ `after that` - "Navigate to page, after that click login"
- ✅ `next` - "Click menu, next click settings"
- ✅ `;` - "Fill email; Fill password; Click submit"
- ✅ Line breaks - Use each line as a separate step
- ✅ Numbered steps - "1. Go to page 2. Fill form 3. Submit"

## 🔧 How It Works

### Backend (main.py)
1. **Instruction Detection**: Identifies if prompt contains multiple instructions
2. **Instruction Splitting**: Intelligently splits the prompt into individual steps
3. **Sequential Processing**: Each step is processed separately by the AI
4. **Returns Sequence**: Sends back all steps as a sequence action

### Frontend (popup.js)
1. **Receives Sequence**: Gets all steps from the backend
2. **Sequential Execution**: Executes each step one by one
3. **Page Loading Wait**: Waits for page to load after navigation/clicks
4. **Content Refresh**: Updates page content between steps for accuracy
5. **Error Handling**: Continues to next step even if one fails
6. **Progress Tracking**: Shows which step is currently executing

## 📊 Sequence Response Format

When multiple instructions are detected, the API returns:

```json
{
  "action": "sequence",
  "data": {
    "steps": [
      {
        "step": 1,
        "instruction": "Go to contact page",
        "action": "click",
        "data": "a[href*='contact']"
      },
      {
        "step": 2,
        "instruction": "Fill name with John Doe",
        "action": "fill_form",
        "data": {"name": "John Doe"}
      },
      {
        "step": 3,
        "instruction": "Click submit",
        "action": "click",
        "data": "Submit"
      }
    ],
    "total": 3
  }
}
```

## ⚙️ Installation

### 1. Install Dependencies
```bash
pip install fastapi uvicorn ollama beautifulsoup4 pydantic
```

### 2. Update System Instruction
Replace the content of `prompts/systemInstruction.txt` with the new multi-step aware version.

### 3. Start the Backend
```bash
python main.py
```
Server runs on `http://127.0.0.1:8000`

### 4. Load Extension in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your extension folder

## 🎮 Advanced Usage

### Complex Workflows
```
Navigate to https://example.com/products
Extract all product names and prices
Click on the first product
Fill quantity with 2
Click add to cart
Go to checkout page
```

### Conditional Flows
```
Go to login page
Fill email with user@test.com
Fill password with secret123
Click login button
Wait for dashboard to load
Extract user profile information
```

### Data Collection
```
Get all article titles
Extract publish dates
Find all author names
Click next page
Repeat for page 2
```

## 🛠️ Configuration

### Adjust Wait Times
In `popup.js`, modify:
```javascript
async function waitForPageLoad(tabId, maxWait = 10000) {
  // maxWait: Maximum time to wait (milliseconds)
}
```

### Change Delays Between Steps
```javascript
// In executeSequence function
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
```

### AI Model Selection
In `main.py`:
```python
ai_processor = AIProcessor(model="llama3")  # Change model here
```

## 🐛 Troubleshooting

### Steps Execute Too Fast
- Increase delay in `executeSequence` function
- Increase `maxWait` in `waitForPageLoad`

### Form Fields Not Filled
- Check field name matching in `fillFormInPage`
- Use more specific field names
- Inspect page HTML to verify field attributes

### Clicks Not Working
- Element might not be visible/clickable
- Try using more specific selectors
- Check if page uses shadow DOM

### Navigation Fails
- Ensure URL includes `https://`
- Check for redirect loops
- Verify URL is accessible

## 📈 Best Practices

### 1. Be Specific
❌ Bad: "Fill the form"
✅ Good: "Fill name with John, email with john@example.com"

### 2. Use Clear Separators
❌ Bad: "Go page fill form click button"
✅ Good: "Go to page, then fill form, then click button"

### 3. Wait for Page Loads
❌ Bad: "Click menu settings submit"
✅ Good: "Click menu, then click settings, then click submit"

### 4. Break Complex Tasks
❌ Bad: "Do everything on the contact page"
✅ Good: "Go to contact, fill name John, fill email test@test.com, click send"

## 🔍 Debug Mode

Enable detailed logging to see what's happening:

1. **Check Raw JSON Tab**: See exact AI responses
2. **Check Debug Tab**: View step-by-step execution logs
3. **Browser Console**: Open DevTools to see injected script logs

## 🚦 Action Types Reference

| Action | Use Case | Example |
|--------|----------|---------|
| `search` | Extract data | "open amazon then search for iphone " |
| `query` | Extract data | "Get all links" | "extract all marketing services" | "get all news on crypto"
| `fill_form` | Fill inputs | "Fill email with test@example.com" | "fill form with test data"
| `click` | Click elements | "Click submit button" |
| `navigate` | Open URLs | "Go to google.com" | "open instagram"
| `sequence` | Multiple steps | Automatically detected |

## 📦 File Structure

```
extension/
├── main.py                    # Backend API (updated for multi-step)
├── popup.html                 # UI (updated with examples)
├── popup.js                   # Frontend logic (sequential execution)
├── background.js              # Extension background
├── manifest.json              # Extension config
└── prompts/
    └── systemInstruction.txt  # AI system prompt (multi-step aware)
```

## 🎯 Roadmap

- [ ] optional Screenshot capture after each step


## 📄 License

MIT License - Feel free to modify and distribute!

## 🤝 Contributing

Contributions welcome! Please test multi-step scenarios thoroughly.

---

**Version**: 3.0  
**Last Updated**: 2025-01-02  
**Requires**: Python 3.8+, Chrome/Edge Browser, Ollama


