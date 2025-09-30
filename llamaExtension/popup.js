// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// Logging utilities
const setStatus = (type, message) => {
    const debugDiv = document.getElementById('debug');
    const timestamp = new Date().toLocaleTimeString();
    const statusClass = type === 'error' ? 'error' : type === 'success' ? 'success' : 'loading';
    debugDiv.innerHTML += `<div class="status ${statusClass}">[${timestamp}] ${type.toUpperCase()}</div><div>${message}</div><br>`;
    debugDiv.scrollTop = debugDiv.scrollHeight;
};

const displayResult = (action) => {
    const resultDiv = document.getElementById('result');
    const rawDiv = document.getElementById('raw');
    
    // Display raw JSON
    rawDiv.textContent = JSON.stringify(action, null, 2);
    
    // Display human-readable result
    if (action.error) {
        resultDiv.innerHTML = `<div class="status error">Error</div><div>${action.error}</div>`;
        return;
    }
    
    const { action: act, data } = action;
    let html = `<div class="status success">Action: ${act}</div>`;
    
    if (act === 'query' || act === 'extract') {
        if (Array.isArray(data)) {
            // Handle array of items (like links, images, etc.)
            html += `<div><strong>Found ${data.length} items:</strong></div>`;
            data.forEach((item, idx) => {
                if (typeof item === 'object') {
                    html += '<div class="response-item">';
                    Object.entries(item).forEach(([key, value]) => {
                        if (key === 'href' || key === 'url' || key === 'src') {
                            html += `<div><strong>${key}:</strong> <a href="${value}" class="link-item" target="_blank">${value}</a></div>`;
                        } else {
                            html += `<div><strong>${key}:</strong> ${value || 'N/A'}</div>`;
                        }
                    });
                    html += '</div>';
                } else {
                    html += `<div class="response-item">${item}</div>`;
                }
            });
        } else if (typeof data === 'object') {
            // Handle object
            html += '<div class="response-item">';
            Object.entries(data).forEach(([key, value]) => {
                html += `<div><strong>${key}:</strong> ${value}</div>`;
            });
            html += '</div>';
        } else {
            // Handle string/primitive
            html += `<div class="response-item">${data}</div>`;
        }
    } else if (act === 'fill_form') {
        html += '<div class="response-item">Form will be filled with:</div>';
        Object.entries(data).forEach(([key, value]) => {
            html += `<div class="response-item"><strong>${key}:</strong> ${value}</div>`;
        });
    } else if (act === 'click') {
        html += `<div class="response-item">Will click: <code>${data}</code></div>`;
    } else if (act === 'navigate') {
        html += `<div class="response-item">Navigating to: <a href="${data.url}" class="link-item" target="_blank">${data.url}</a></div>`;
    } else {
        html += `<div class="response-item">${JSON.stringify(data)}</div>`;
    }
    
    resultDiv.innerHTML = html;
};

// Main execution
document.getElementById('send').addEventListener('click', async () => {
    const button = document.getElementById('send');
    const instruction = document.getElementById('prompt').value.trim();
    
    if (!instruction) {
        alert('Please enter an instruction');
        return;
    }
    
    // Clear previous results
    document.getElementById('result').innerHTML = '';
    document.getElementById('debug').innerHTML = '';
    document.getElementById('raw').innerHTML = '';
    
    // Disable button
    button.disabled = true;
    button.textContent = 'Processing...';
    
    setStatus('info', `Instruction: ${instruction}`);
    
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        
        setStatus('info', 'Extracting page content...');
        
        // Get page HTML and text content
        const [htmlResult] = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => ({
                html: document.documentElement.outerHTML,
                text: document.body.innerText,
                url: window.location.href,
                title: document.title
            })
        });
        
        const pageData = htmlResult.result;
        setStatus('success', `Page extracted: ${pageData.title}`);
        
        // Send to server
        setStatus('info', 'Sending to AI server...');
        
        const response = await fetch('http://127.0.0.1:8000/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: instruction,
                page_html: pageData.html,
                page_text: pageData.text,
                page_url: pageData.url,
                page_title: pageData.title
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const action = await response.json();
        setStatus('success', 'AI response received');
        
        // Display result
        displayResult(action);
        
        // Execute action
        if (action.error) {
            setStatus('error', action.error);
        } else {
            await executeAction(activeTab.id, action);
        }
        
    } catch (error) {
        setStatus('error', error.message);
        displayResult({ error: error.message });
    } finally {
        button.disabled = false;
        button.textContent = 'Execute';
    }
});

async function executeAction(tabId, action) {
    const act = action.action;
    
    switch (act) {
        case 'query':
        case 'extract':
            setStatus('success', 'Data extracted successfully');
            break;
            
        case 'fill_form':
            setStatus('info', 'Filling form...');
            const [fillResult] = await chrome.scripting.executeScript({
                target: { tabId },
                func: fillFormInPage,
                args: [action.data]
            });
            setStatus('success', fillResult.result);
            break;
            
        case 'click':
            setStatus('info', `Clicking: ${action.data}`);
            const [clickResult] = await chrome.scripting.executeScript({
                target: { tabId },
                func: clickElementInPage,
                args: [action.data]
            });
            setStatus('success', clickResult.result);
            break;
            
        case 'navigate':
            setStatus('info', `Navigating to: ${action.data.url}`);
            await chrome.tabs.update(tabId, { url: action.data.url });
            setStatus('success', 'Navigation initiated');
            break;
            
        default:
            setStatus('info', `Action completed: ${act}`);
    }
}

// Content script functions (injected into page)
function fillFormInPage(fields) {
    let filledCount = 0;
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        const name = (input.name || input.id || input.placeholder || '').toLowerCase();
        const type = (input.type || '').toLowerCase();
        
        for (const [key, value] of Object.entries(fields)) {
            if (!value) continue;
            
            const keyLower = key.toLowerCase();
            if (name.includes(keyLower) || keyLower.includes(name.split(/[-_]/)[0])) {
                if (input.tagName === 'SELECT') {
                    const option = Array.from(input.options).find(opt => 
                        opt.value === value || opt.text.toLowerCase().includes(value.toLowerCase())
                    );
                    if (option) {
                        input.value = option.value;
                        filledCount++;
                    }
                } else if (type === 'checkbox' || type === 'radio') {
                    if (value === true || value === 'true' || value === input.value) {
                        input.checked = true;
                        filledCount++;
                    }
                } else {
                    input.value = value;
                    filledCount++;
                }
                
                // Trigger events
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        }
    });
    
    return `✓ Filled ${filledCount} field(s)`;
}

function clickElementInPage(selector) {
    let element = null;
    
    // Try different methods to find element
    if (selector.startsWith('#')) {
        element = document.querySelector(selector);
    } else if (selector.startsWith('.')) {
        element = document.querySelector(selector);
    } else if (selector.includes(':contains')) {
        // Handle :contains pseudo-selector
        const match = selector.match(/(.+):contains\(['"](.+)['"]\)/);
        if (match) {
            const [, tag, text] = match;
            const elements = document.querySelectorAll(tag || '*');
            element = Array.from(elements).find(el => 
                el.textContent.trim().toLowerCase().includes(text.toLowerCase())
            );
        }
    } else {
        // Try as ID first, then as selector
        element = document.getElementById(selector) || document.querySelector(selector);
    }
    
    if (!element) {
        // Try finding by text content
        const buttons = document.querySelectorAll('button, a, input[type="submit"], input[type="button"]');
        element = Array.from(buttons).find(btn => 
            btn.textContent.trim().toLowerCase().includes(selector.toLowerCase()) ||
            (btn.value && btn.value.toLowerCase().includes(selector.toLowerCase()))
        );
    }
    
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    
    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight briefly
    const originalBg = element.style.backgroundColor;
    const originalOutline = element.style.outline;
    element.style.backgroundColor = '#ffeb3b';
    element.style.outline = '2px solid #ff5722';
    
    setTimeout(() => {
        element.style.backgroundColor = originalBg;
        element.style.outline = originalOutline;
        
        // Click
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        
        if (element.click) element.click();
    }, 300);
    
    return `✓ Clicked: ${selector}`;
}