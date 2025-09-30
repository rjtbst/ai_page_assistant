// Background service worker for Chrome extension
// Handles long-running tasks and manages extension lifecycle

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('AI Browser Automation installed successfully');
    } else if (details.reason === 'update') {
        console.log('AI Browser Automation updated to version', chrome.runtime.getManifest().version);
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({ status: 'ok' });
    }
    return true;
});

// Handle extension icon click (optional)
chrome.action.onClicked.addListener((tab) => {
    // Open popup (default behavior is already set in manifest)
    console.log('Extension clicked on tab:', tab.id);
});