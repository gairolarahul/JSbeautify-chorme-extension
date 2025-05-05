// This background script handles JS files that are loaded directly in the browser
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // More comprehensive check for JavaScript files
  if (changeInfo.status === 'complete' && tab.url) {
    const isJsFile = tab.url.endsWith('.js') || 
                    tab.url.includes('.js?') || 
                    tab.url.includes('/js/') ||
                    tab.url.includes('javascript') ||
                    tab.url.includes('application/javascript');
    
    if (isJsFile) {
      console.log('JS file detected:', tab.url);
      
      // Execute the beautifier on the page
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['beautify-lib.js']
      }, () => {
        chrome.scripting.executeScript({
          target: { tabId },
          function: beautifyPage,
          args: [tab.url]
        });
      });
    }
  }
});

// Add a browser action click handler to manually trigger beautification
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked for tab:', tab.url);
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['beautify-lib.js']
  }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: beautifyPage,
      args: [tab.url]
    });
  });
});

// Function to be injected into the page
function beautifyPage(url) {
  console.log('Attempting to beautify JavaScript at:', url);
  
  // Check if this page likely contains raw JavaScript
  const isLikelyJsContent = 
    document.contentType === 'application/javascript' || 
    document.contentType === 'text/javascript' ||
    document.querySelector('pre') ||
    document.body.childNodes.length <= 3 ||
    url.endsWith('.js');
  
  if (isLikelyJsContent) {
    console.log('Content appears to be JavaScript');
    
    // Try to get the content from the page first
    let code = '';
    if (document.body.querySelector('pre')) {
      code = document.body.querySelector('pre').textContent;
      processCode(code);
    } else if (document.body.childNodes.length <= 3) {
      code = document.body.textContent || document.body.innerText;
      processCode(code);
    } else {
      // If we can't easily extract code from the page, fetch it
      fetch(url)
        .then(res => res.text())
        .then(code => processCode(code))
        .catch(err => {
          console.error('Fetch error:', err);
          document.body.innerHTML += '<div style="color: red; padding: 20px; position: fixed; top: 0; right: 0; background: white; border: 1px solid black; z-index: 10000;">Error fetching code: ' + 
            err.toString().replace(/</g, '&lt;') + '</div>';
        });
    }
  } else {
    console.log('Content does not appear to be JavaScript');
  }
  
  function processCode(code) {
    try {
      // Make sure js_beautify is available
      if (typeof js_beautify === 'function') {
        console.log('Beautifying code...');
        const beautified = js_beautify(code, {
          indent_size: 2,
          indent_char: ' ',
          preserve_newlines: true,
          max_preserve_newlines: 2
        });
        
        // Add a toolbar at the top
        const toolbar = `
          <div style="position: fixed; top: 0; left: 0; right: 0; background: #f0f0f0; border-bottom: 1px solid #ccc; padding: 10px; z-index: 10000; display: flex; justify-content: space-between;">
            <div>JS Beautifier Auto</div>
            <div>
              <button onclick="document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) + 1) + 'px'">A+</button>
              <button onclick="document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) - 1) + 'px'">A-</button>
              <select onchange="document.body.style.backgroundColor = this.value">
                <option value="#f8f8f8">Light</option>
                <option value="#282c34">Dark</option>
              </select>
            </div>
          </div>
        `;
        
        document.body.innerHTML = toolbar + '<pre style="white-space: pre-wrap; padding: 20px; margin-top: 50px;">' +
          beautified.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
        
        document.body.style.fontFamily = 'monospace';
        document.body.style.fontSize = '14px';
        document.body.style.backgroundColor = '#f8f8f8';
        document.body.style.color = '#333';
        console.log('Beautification complete');
      } else {
        console.error('js_beautify function not found');
        document.body.innerHTML += '<div style="color: red; padding: 20px; position: fixed; top: 0; right: 0; background: white; border: 1px solid black; z-index: 10000;">Error: js_beautify function not found</div>';
      }
    } catch (err) {
      console.error('Beautify error:', err);
      document.body.innerHTML += '<div style="color: red; padding: 20px; position: fixed; top: 0; right: 0; background: white; border: 1px solid black; z-index: 10000;">Error beautifying code: ' + 
        err.toString().replace(/</g, '&lt;') + '</div>';
    }
  }
}