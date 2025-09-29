document.getElementById("send").addEventListener("click", () => {
  const responseDiv = document.getElementById("response");
  responseDiv.textContent = "Loading...";

  const instruction = document.getElementById("prompt").value; // get user input

  // Get the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => document.body.innerText // grab the whole page text
    }, (results) => {
      const tabContent = results[0].result;

      // Combine user instruction with tab content
      const prompt = `${instruction}\n\n${tabContent}`;

      // Send to FastAPI server
      fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      })
      .then(res => res.json())
      .then(data => {
        if (data.response) {
          responseDiv.textContent = data.response;
        } else if (data.error) {
          responseDiv.textContent = "Error: " + data.error;
        }
      })
      .catch(err => {
        responseDiv.textContent = "Failed to connect to server: " + err;
      });
    });
  });
});
