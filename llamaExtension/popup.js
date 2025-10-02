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

const displayResult = (action, isSequence = false, stepNumber = null) => {
    const resultDiv = document.getElementById('result');
    const rawDiv = document.getElementById('raw');
    
    // Display raw JSON
    if (!isSequence) {
        rawDiv.textContent = JSON.stringify(action, null, 2);
    }
    
    // Display human-readable result
    if (action.error) {
        resultDiv.innerHTML += `<div class="status error">Error${stepNumber ? ` (Step ${stepNumber})` : ''}</div><div>${action.error}</div>`;
        return;
    }
    
    const { action: act, data } = action;
    let html = `<div class="status success">Action${stepNumber ? ` (Step ${stepNumber})` : ''}: ${act}</div>`;
    
    if (act === 'query' || act === 'extract') {
        if (Array.isArray(data)) {
            html += `<div><strong>Found ${data.length} items:</strong></div>`;
            data.slice(0, 10).forEach((item) => {
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
            if (data.length > 10) {
                html += `<div class="response-item"><em>... and ${data.length - 10} more items</em></div>`;
            }
        } else if (typeof data === 'object') {
            html += '<div class="response-item">';
            Object.entries(data).forEach(([key, value]) => {
                html += `<div><strong>${key}:</strong> ${value}</div>`;
            });
            html += '</div>';
        } else {
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
    
    resultDiv.innerHTML += html;
};

// Wait for page load after navigation
async function waitForPageLoad(tabId, maxWait = 10000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = setInterval(async () => {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (tab.status === 'complete' || Date.now() - startTime > maxWait) {
                    clearInterval(checkInterval);
                    // Additional delay for JS to execute
                    setTimeout(resolve, 1000);
                }
            } catch (e) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 500);
    });
}

// Execute a sequence of actions
async function executeSequence(tabId, steps) {
    const results = [];
    
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNum = step.step || (i + 1);
        
        setStatus('info', `Executing Step ${stepNum}: ${step.instruction}`);
        displayResult(step, true, stepNum);
        
        if (step.error) {
            setStatus('error', `Step ${stepNum} failed: ${step.error}`);
            results.push({ step: stepNum, success: false, error: step.error });
            continue;
        }
        
        try {
            // Execute the action
            const result = await executeAction(tabId, step);
            results.push({ step: stepNum, success: true, result });
            
            // Wait for page to stabilize after navigation or click
            if (step.action === 'navigate' || step.action === 'click') {
                setStatus('info', `Waiting for page to load after Step ${stepNum}...`);
                await waitForPageLoad(tabId);
                
                // Get updated page content for next step
                if (i < steps.length - 1) {
                    setStatus('info', 'Refreshing page content...');
                    const [htmlResult] = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => ({
                            html: document.documentElement.outerHTML,
                            text: document.body.innerText,
                            url: window.location.href,
                            title: document.title
                        })
                    });
                    // Store updated page data for next step (if needed)
                    window.lastPageData = htmlResult.result;
                }
            }
            
            // Small delay between steps
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            setStatus('error', `Step ${stepNum} execution failed: ${error.message}`);
            results.push({ step: stepNum, success: false, error: error.message });
        }
    }
    
    return results;
}

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
        
        // Display raw JSON
        document.getElementById('raw').textContent = JSON.stringify(action, null, 2);
        
        // Handle response
        if (action.error) {
            setStatus('error', action.error);
            displayResult({ error: action.error });
        } else if (action.action === 'sequence') {
            // Multiple instructions - execute sequentially
            setStatus('info', `Executing ${action.data.total} steps sequentially...`);
            const steps = action.data.steps;
            
            const results = await executeSequence(activeTab.id, steps);
            
            // Summary
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            setStatus('success', `Sequence completed: ${successful} successful, ${failed} failed`);
            
        } else {
            // Single instruction
            displayResult(action);
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
            return 'Data extracted';
            
        case 'fill_form':
            setStatus('info', 'Filling form...');
            const [fillResult] = await chrome.scripting.executeScript({
                target: { tabId },
                func: fillFormInPage,
                args: [action.data]
            });
            setStatus('success', fillResult.result);
            return fillResult.result;
            
        case 'click':
            setStatus('info', `Clicking: ${action.data}`);
            const [clickResult] = await chrome.scripting.executeScript({
                target: { tabId },
                func: clickElementInPage,
                args: [action.data]
            });
            setStatus('success', clickResult.result);
            return clickResult.result;
            
        case 'navigate':
            setStatus('info', `Navigating to: ${action.data.url}`);
            await chrome.tabs.update(tabId, { url: action.data.url });
            setStatus('success', 'Navigation initiated');
            return 'Navigated';
            
        default:
            setStatus('info', `Action completed: ${act}`);
            return 'Completed';
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