// This script runs on any page ending with .js via content_scripts in manifest
(function() {
  console.log('Content script running on: ' + window.location.href);
  console.log('Content type:', document.contentType);
  console.log('Body children:', document.body.childNodes.length);
  
  // Always run for .js files
  if (window.location.href.toLowerCase().endsWith('.js')) {
    console.log('JS file detected by URL pattern, forcing beautification');
    runBeautifier();
    return;
  }
  
  // More comprehensive check for JavaScript files
  function isJavaScriptContent() {
    // Check content type
    if (document.contentType === 'application/javascript' || 
        document.contentType === 'text/javascript' ||
        document.contentType === 'application/x-javascript') {
      return true;
    }
    
    // Check URL
    const url = window.location.href.toLowerCase();
    if (url.endsWith('.js') || 
        url.includes('.js?') || 
        url.includes('/js/') ||
        url.includes('type=javascript')) {
      return true;
    }
    
    // Check document structure
    if (document.body.childNodes.length <= 3) {
      return true;
    }
    
    if (document.body.firstChild && document.body.firstChild.nodeName === 'PRE') {
      return true;
    }
    
    return false;
  }
  
  // Function to run the beautifier
  function runBeautifier() {
    // Check if this page is already beautified by our extension
    if (document.querySelector('#js-beautifier-applied')) {
      console.log('Already beautified, skipping');
      return;
    }
    
    console.log('Running beautifier...');
    
    try {
      // Get the raw JavaScript code
      let code = '';
      if (document.body.firstChild && document.body.firstChild.nodeName === 'PRE') {
        code = document.body.firstChild.textContent;
      } else {
        code = document.body.textContent || document.body.innerText;
      }
      
      // Make sure we have some actual content to beautify
      if (code.trim().length < 5) {
        console.log('Not enough code content to beautify');
        return;
      }
      
      // Check if js_beautify is available
      if (typeof js_beautify === 'function') {
        console.log('Beautifier found, processing code...');
        // Beautify the code with some options for better formatting
        const beautifiedCode = js_beautify(code, {
          indent_size: 2,
          indent_char: ' ',
          preserve_newlines: true,
          max_preserve_newlines: 2
        });
          
        // Add a toolbar at the top
        const toolbar = `
          <div id="js-beautifier-toolbar" style="position: fixed; top: 0; left: 0; right: 0; background: #f0f0f0; border-bottom: 1px solid #ccc; padding: 10px; z-index: 10000; display: flex; justify-content: space-between;">
            <div>JS Beautifier Auto</div>
            <div>
              <button onclick="document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) + 1) + 'px'">A+</button>
              <button onclick="document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) - 1) + 'px'">A-</button>
              <select onchange="document.body.style.backgroundColor = this.value; document.body.style.color = this.value === '#282c34' ? '#e6e6e6' : '#333';">
                <option value="#f8f8f8">Light</option>
                <option value="#282c34">Dark</option>
              </select>
            </div>
          </div>
        `;
        
        // Create a marker to indicate this page has been beautified
        const marker = document.createElement('div');
        marker.id = 'js-beautifier-applied';
        marker.style.display = 'none';
        
        // Replace the content with beautified version
        document.body.innerHTML = toolbar + 
          '<pre style="white-space: pre-wrap; padding: 20px; margin-top: 50px;">' + 
          beautifiedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
        
        document.body.appendChild(marker);
        
        // Add some styling
        document.body.style.fontFamily = 'monospace';
        document.body.style.fontSize = '14px';
        document.body.style.backgroundColor = '#f8f8f8';
        document.body.style.color = '#333';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        
        console.log('JavaScript beautified successfully');
      } else {
        console.error('js_beautify function not found');
        // Try to inject the beautifier library
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('beautify-lib.js');
        document.head.appendChild(script);
      }
    } catch (e) {
      console.error('JS Beautifier error:', e);
    }
  }
  
  // Wait a moment to ensure the page is fully loaded
  setTimeout(() => {
    // Only run if this is actually a JavaScript file being viewed directly
    if (isJavaScriptContent()) {
      console.log('JavaScript content detected, beautifying...');
      runBeautifier();
    } else {
      console.log('Not JavaScript content, skipping');
    }
  }, 300); // Small delay to ensure page is loaded
})();
