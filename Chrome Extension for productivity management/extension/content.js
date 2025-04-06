// Track user activity on the current page
let idleTime = 0;
let isActive = true;
const IDLE_THRESHOLD = 60; // 60 seconds of inactivity considered idle

// Listen for user activity
document.addEventListener('mousemove', resetIdleTimer);
document.addEventListener('keypress', resetIdleTimer);
document.addEventListener('scroll', resetIdleTimer);

// Set up idle timer
setInterval(() => {
  if (isActive) {
    idleTime++;
    if (idleTime >= IDLE_THRESHOLD) {
      isActive = false;
      notifyBackgroundScript();
    }
  }
}, 1000);

// Reset idle timer when user is active
function resetIdleTimer() {
  if (!isActive) {
    isActive = true;
    notifyBackgroundScript();
  }
  idleTime = 0;
}

// Notify background script about activity state
function notifyBackgroundScript() {
  chrome.runtime.sendMessage({
    action: 'activityStatus',
    isActive: isActive
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'blockSite') {
    createBlockOverlay();
  }
  return true;
});

// Create overlay for blocked sites
function createBlockOverlay() {
  // Check if overlay already exists
  if (document.getElementById('productivity-blocker-overlay')) {
    return;
  }
  
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'productivity-blocker-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  overlay.style.color = 'white';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999999';
  overlay.style.fontSize = '24px';
  
  // Add message
  overlay.innerHTML = `
    <h1>Site Blocked</h1>
    <p>This site has been blocked to help you stay productive.</p>
    <button id="proceed-anyway" style="padding: 10px 20px; margin-top: 20px; cursor: pointer; background-color: #e74c3c; border: none; color: white; border-radius: 4px;">Proceed Anyway (15s)</button>
    <div id="timer" style="margin-top: 10px;">15</div>
  `;
  
  // Add overlay to body
  document.body.appendChild(overlay);
  
  // Set up proceed anyway button with timer
  let timeLeft = 15;
  const timerElement = document.getElementById('timer');
  const proceedButton = document.getElementById('proceed-anyway');
  
  proceedButton.disabled = true;
  
  const countdownInterval = setInterval(() => {
    timeLeft--;
    timerElement.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      proceedButton.disabled = false;
      proceedButton.textContent = 'Proceed Anyway';
      proceedButton.style.backgroundColor = '#3498db';
    }
  }, 1000);
  
  // Add event listener to proceed button
  proceedButton.addEventListener('click', () => {
    if (timeLeft <= 0) {
      overlay.remove();
    }
  });
}