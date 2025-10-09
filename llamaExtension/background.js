// Background service worker for future enhancements
// Currently minimal, can be extended for:
// - Task scheduling
// - Background automation
// - Cross-tab coordination
// - Storage management

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Browser Automation Extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ status: 'ready' });
  }
  
  // Add more message handlers as needed
  return true; // Keep message channel open for async response
});

// Optional: Monitor tab changes for context awareness
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Tab finished loading
    console.log('Tab loaded:', tab.url);
  }
});

// Optional: Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'execute-automation') {
    // Open popup or trigger automation
    chrome.action.openPopup();
  }
});