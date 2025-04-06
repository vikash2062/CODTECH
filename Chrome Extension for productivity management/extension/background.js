// Global variables to track activity
let currentTab = null;
let startTime = null;
let activityData = {};
let blockedSites = [];
let isUserLoggedIn = false;
let userId = null;
const API_BASE_URL = 'http://localhost:5000/api';

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Productivity Tracker installed');
  
  // Load user data from storage
  chrome.storage.sync.get(['userId', 'blockedSites'], (result) => {
    if (result.userId) {
      isUserLoggedIn = true;
      userId = result.userId;
    }
    
    if (result.blockedSites) {
      blockedSites = result.blockedSites;
    }
  });
  
  // Set up daily reset alarm
  chrome.alarms.create('dailyReset', {
    periodInMinutes: 24 * 60 // Once per day
  });
});

// Track tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  trackTabChange(activeInfo.tabId);
});

// Track URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    trackTabChange(tabId);
  }
});

// Handle alarm for daily reset and report generation
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    generateDailyReport();
    resetDailyTracking();
  }
});

// Function to track tab changes
function trackTabChange(tabId) {
  // Save time spent on previous tab
  if (currentTab && startTime) {
    const domain = extractDomain(currentTab.url);
    const timeSpent = Math.round((Date.now() - startTime) / 1000); // in seconds
    
    if (domain) {
      if (!activityData[domain]) {
        activityData[domain] = 0;
      }
      activityData[domain] += timeSpent;
      
      // Save to local storage
      chrome.storage.local.set({ activityData: activityData });
      
      // If user is logged in, sync with backend
      if (isUserLoggedIn) {
        syncWithBackend(domain, timeSpent);
      }
    }
  }
  
  // Get info about current tab
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    currentTab = tab;
    startTime = Date.now();
    
    // Check if current site is blocked
    const domain = extractDomain(tab.url);
    if (domain && blockedSites.includes(domain)) {
      // Send message to content script to show blocking overlay
      chrome.tabs.sendMessage(tabId, { action: "blockSite" });
    }
  });
}

// Extract domain from URL
function extractDomain(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error("Invalid URL:", url);
    return null;
  }
}

// Sync activity data with backend
function syncWithBackend(domain, timeSpent) {
  if (!userId) return;
  
  fetch(`${API_BASE_URL}/activity/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      domain: domain,
      timeSpent: timeSpent,
      timestamp: new Date().toISOString()
    })
  })
  .then(response => response.json())
  .catch(error => console.error('Error syncing with backend:', error));
}

// Generate daily report
function generateDailyReport() {
  if (!isUserLoggedIn) return;
  
  fetch(`${API_BASE_URL}/activity/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userId,
      date: new Date().toISOString()
    })
  })
  .then(response => response.json())
  .then(data => {
    // Notify user about report
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Daily Productivity Report',
      message: 'Your daily productivity report is ready! Click to view.',
      priority: 2
    });
  })
  .catch(error => console.error('Error generating report:', error));
}

// Reset daily tracking data
function resetDailyTracking() {
  activityData = {};
  chrome.storage.local.set({ activityData: {} });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getActivityData') {
    sendResponse({ activityData: activityData });
  } else if (message.action === 'setBlockedSites') {
    blockedSites = message.sites;
    chrome.storage.sync.set({ blockedSites: blockedSites });
    sendResponse({ success: true });
  } else if (message.action === 'login') {
    isUserLoggedIn = true;
    userId = message.userId;
    chrome.storage.sync.set({ userId: userId });
    sendResponse({ success: true });
  } else if (message.action === 'logout') {
    isUserLoggedIn = false;
    userId = null;
    chrome.storage.sync.remove('userId');
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});