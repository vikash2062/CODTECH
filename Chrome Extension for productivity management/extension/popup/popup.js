// DOM elements
const tabs = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const closeBtns = document.querySelectorAll('.close');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

// API URL
const API_BASE_URL = 'http://localhost:5000/api';

// User state
let userData = {
  isLoggedIn: false,
  userId: null,
  username: null
};

// App data
let activityData = {};
let productiveSites = [];
let distractionSites = [];
let blockedSites = [];
let goals = {
  productiveTime: 120,
  distractionLimit: 60
};

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  loadAppData();
  setupEventListeners();
  updateDashboard();
});

// Load user data from storage
function loadUserData() {
  chrome.storage.sync.get(['userId', 'username'], (result) => {
    if (result.userId) {
      userData.isLoggedIn = true;
      userData.userId = result.userId;
      userData.username = result.username;
      updateAuthUI();
    }
  });
}

// Load app data from storage
function loadAppData() {
  chrome.storage.sync.get(['productiveSites', 'distractionSites', 'blockedSites', 'goals'], (result) => {
    if (result.productiveSites) productiveSites = result.productiveSites;
    if (result.distractionSites) distractionSites = result.distractionSites;
    if (result.blockedSites) blockedSites = result.blockedSites;
    if (result.goals) goals = result.goals;
    
    updateSettingsUI();
  });
  
  chrome.storage.local.get(['activityData'], (result) => {
    if (result.activityData) {
      activityData = result.activityData;
      updateDashboard();
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Tab navigation
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Auth buttons
  loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'block';
  });
  
  signupBtn.addEventListener('click', () => {
    signupModal.style.display = 'block';
  });
  
  logoutBtn.addEventListener('click', () => {
    logout();
  });
  
  // Close modals
  closeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      this.parentElement.parentElement.style.display = 'none';
    });
  });
  
  // Handle clicks outside modals
  window.addEventListener('click', (event) => {
    if (event.target === loginModal) {
      loginModal.style.display = 'none';
    }
    if (event.target === signupModal) {
      signupModal.style.display = 'none';
    }
  });
  
  // Auth forms
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginUser();
  });
  
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signupUser();
  });
  
  // Settings tab event listeners
  document.getElementById('add-productive-btn').addEventListener('click', addProductiveSite);
  document.getElementById('add-distraction-btn').addEventListener('click', addDistractionSite);
  document.getElementById('add-blocked-btn').addEventListener('click', addBlockedSite);
  document.getElementById('save-goals-btn').addEventListener('click', saveGoals);
  
  // Reports tab event listeners
  const timeframeBtns = document.querySelectorAll('.timeframe-btn');
  timeframeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeframeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateReports(btn.getAttribute('data-timeframe'));
    });
  });
  
  document.getElementById('download-report-btn').addEventListener('click', downloadReport);
}

// Switch between tabs
function switchTab(tabName) {
  tabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-tab') === tabName) {
      tab.classList.add('active');
    }
  });
  
  tabPanels.forEach(panel => {
    panel.classList.remove('active');
    if (panel.id === tabName) {
      panel.classList.add('active');
      
      // Load specific tab data if needed
      if (tabName === 'reports' && userData.isLoggedIn) {
        updateReports('day');
      }
    }
  });
}

// Update the auth UI based on login state
function updateAuthUI() {
  const loggedOut = document.getElementById('logged-out');
  const loggedIn = document.getElementById('logged-in');
  const username = document.getElementById('username');
  
  if (userData.isLoggedIn) {
    loggedOut.classList.add('hidden');
    loggedIn.classList.remove('hidden');
    username.textContent = userData.username;
  } else {
    loggedOut.classList.remove('hidden');
    loggedIn.classList.add('hidden');
  }
}

// Update the dashboard with activity data
function updateDashboard() {
  const todayTotal = document.getElementById('today-total');
  const productiveTime = document.getElementById('productive-time');
  const distractedTime = document.getElementById('distracted-time');
  const activityContainer = document.getElementById('activity-container');
  
  let totalSeconds = 0;
  let productiveSeconds = 0;
  let distractedSeconds = 0;
  
  // Calculate time metrics
  for (const domain in activityData) {
    const seconds = activityData[domain];
    totalSeconds += seconds;
    
    if (productiveSites.includes(domain)) {
      productiveSeconds += seconds;
    } else if (distractionSites.includes(domain)) {
      distractedSeconds += seconds;
    }
  }
  
  // Update summary metrics
  todayTotal.textContent = formatTime(totalSeconds);
  productiveTime.textContent = formatTime(productiveSeconds);
  distractedTime.textContent = formatTime(distractedSeconds);
  
  // Create activity list
  activityContainer.innerHTML = '';
  
  const sortedDomains = Object.keys(activityData).sort((a, b) => {
    return activityData[b] - activityData[a];
  });
  
  for (const domain of sortedDomains) {
    const seconds = activityData[domain];
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    let domainClass = 'neutral';
    if (productiveSites.includes(domain)) {
      domainClass = 'productive';
    } else if (distractionSites.includes(domain)) {
      domainClass = 'distraction';
    }
    
    item.innerHTML = `
      <span class="domain ${domainClass}">${domain}</span>
      <span class="time">${formatTime(seconds)}</span>
    `;
    
    activityContainer.appendChild(item);
  }
  
  // If no activity yet
  if (sortedDomains.length === 0) {
    activityContainer.innerHTML = '<div class="no-data">No activity recorded yet today</div>';
  }
}

// Update the settings UI
function updateSettingsUI() {
  const productiveSitesList = document.getElementById('productive-sites');
  const distractionSitesList = document.getElementById('distraction-sites');
  const blockedSitesList = document.getElementById('blocked-sites');
  
  // Productive sites
  productiveSitesList.innerHTML = '';
  productiveSites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'site-item';
    item.innerHTML = `
      <span>${site}</span>
      <button class="remove-btn" data-site="${site}" data-type="productive">×</button>
    `;
    productiveSitesList.appendChild(item);
  });
  
  // Distraction sites
  distractionSitesList.innerHTML = '';
  distractionSites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'site-item';
    item.innerHTML = `
      <span>${site}</span>
      <button class="remove-btn" data-site="${site}" data-type="distraction">×</button>
    `;
    distractionSitesList.appendChild(item);
  });
  
  // Blocked sites
  blockedSitesList.innerHTML = '';
  blockedSites.forEach(site => {
    const item = document.createElement('div');
    item.className = 'site-item';
    item.innerHTML = `
      <span>${site}</span>
      <button class="remove-btn" data-site="${site}" data-type="blocked">×</button>
    `;
    blockedSitesList.appendChild(item);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const site = this.getAttribute('data-site');
      const type = this.getAttribute('data-type');
      removeSite(site, type);
    });
  });
  
  // Set goals
  document.getElementById('productive-goal').value = goals.productiveTime;
  document.getElementById('distraction-limit').value = goals.distractionLimit;
}

// Update the reports UI
function updateReports(timeframe) {
  if (!userData.isLoggedIn) {
    document.getElementById('reports').innerHTML = `
      <div class="login-prompt">
        <p>Please login to view detailed reports</p>
        <button id="reports-login-btn">Login</button>
      </div>
    `;
    document.getElementById('reports-login-btn').addEventListener('click', () => {
      loginModal.style.display = 'block';
    });
    return;
  }
  
  // Here you would fetch report data from the backend
  // For demonstration, we'll use dummy data
  const statsContent = document.getElementById('stats-content');
  
  let statsHTML = '';
  
  if (timeframe === 'day') {
    statsHTML = `
      <div class="stat-item">
        <span class="label">Most Productive Hour</span>
        <span class="value">10:00 AM - 11:00 AM</span>
      </div>
      <div class="stat-item">
        <span class="label">Most Distracting Site</span>
        <span class="value">facebook.com (45 min)</span>
      </div>
      <div class="stat-item">
        <span class="label">Focus Score</span>
        <span class="value">72%</span>
      </div>
    `;
  } else if (timeframe === 'week') {
    statsHTML = `
      <div class="stat-item">
        <span class="label">Most Productive Day</span>
        <span class="value">Tuesday (3.5 hrs)</span>
      </div>
      <div class="stat-item">
        <span class="label">Weekly Productive Average</span>
        <span class="value">2.8 hrs/day</span>
      </div>
      <div class="stat-item">
        <span class="label">Weekly Focus Score</span>
        <span class="value">68%</span>
      </div>
    `;
  } else {
    statsHTML = `
      <div class="stat-item">
        <span class="label">Monthly Productive Total</span>
        <span class="value">64.5 hrs</span>
      </div>
      <div class="stat-item">
        <span class="label">Productivity Trend</span>
        <span class="value">↑ 12% vs Last Month</span>
      </div>
      <div class="stat-item">
        <span class="label">Monthly Focus Score</span>
        <span class="value">70%</span>
      </div>
    `;
  }
  
  statsContent.innerHTML = statsHTML;
  
  // In a real implementation, you would create charts with Chart.js or similar
  // Here we'll just simulate it with a placeholder
  const chartContainer = document.querySelector('.chart-container');
  chartContainer.innerHTML = `<div style="text-align: center; padding-top: 80px;">Chart for ${timeframe} would appear here</div>`;
}

// Login user
function loginUser() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      userData.isLoggedIn = true;
      userData.userId = data.userId;
      userData.username = data.username;
      
      // Save to storage
      chrome.storage.sync.set({ 
        userId: data.userId,
        username: data.username
      });
      
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'login',
        userId: data.userId
      });
      
      // Update UI
      updateAuthUI();
      loginModal.style.display = 'none';
      
      // If currently on reports tab, refresh it
      if (document.getElementById('reports').classList.contains('active')) {
        updateReports('day');
      }
    } else {
      alert('Login failed: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error logging in:', error);
    alert('Error logging in. Please try again.');
  });
}

// Sign up user
function signupUser() {
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  
  if (password !== confirmPassword) {
    alert('Passwords do not match!');
    return;
  }
  
  fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, email, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('Account created successfully! You can now log in.');
      signupModal.style.display = 'none';
      loginModal.style.display = 'block';
    } else {
      alert('Sign up failed: ' + data.message);
    }
  })
  .catch(error => {
    console.error('Error signing up:', error);
    alert('Error signing up. Please try again.');
  });
}

// Logout user
function logout() {
  userData.isLoggedIn = false;
  userData.userId = null;
  userData.username = null;
  
  // Clear from storage
  chrome.storage.sync.remove(['userId', 'username']);
  
  // Notify background script
  chrome.runtime.sendMessage({
    action: 'logout'
  });
  
  // Update UI
  updateAuthUI();
  
  // If currently on reports tab, update it
  if (document.getElementById('reports').classList.contains('active')) {
    updateReports('day');
  }
}

// Add a productive site
function addProductiveSite() {
  const input = document.getElementById('add-productive-input');
  const site = input.value.trim();
  
  if (!site) return;
  
  if (!productiveSites.includes(site)) {
    productiveSites.push(site);
    chrome.storage.sync.set({ productiveSites });
    
    // Remove from distractions if it exists there
    if (distractionSites.includes(site)) {
      removeSite(site, 'distraction', false);
    }
    
    updateSettingsUI();
    updateDashboard();
  }
  
  input.value = '';
}

// Add a distraction site
function addDistractionSite() {
  const input = document.getElementById('add-distraction-input');
  const site = input.value.trim();
  
  if (!site) return;
  
  if (!distractionSites.includes(site)) {
    distractionSites.push(site);
    chrome.storage.sync.set({ distractionSites });
    
    // Remove from productive if it exists there
    if (productiveSites.includes(site)) {
      removeSite(site, 'productive', false);
    }
    
    updateSettingsUI();
    updateDashboard();
  }
  
  input.value = '';
}

// Add a blocked site
function addBlockedSite() {
  const input = document.getElementById('add-blocked-input');
  const site = input.value.trim();
  
  if (!site) return;
  
  if (!blockedSites.includes(site)) {
    blockedSites.push(site);
    chrome.storage.sync.set({ blockedSites });
    
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'setBlockedSites',
      sites: blockedSites
    });
    
    updateSettingsUI();
  }
  
  input.value = '';
}

// Remove a site from a category
function removeSite(site, type, updateUI = true) {
  if (type === 'productive') {
    productiveSites = productiveSites.filter(s => s !== site);
    chrome.storage.sync.set({ productiveSites });
  } else if (type === 'distraction') {
    distractionSites = distractionSites.filter(s => s !== site);
    chrome.storage.sync.set({ distractionSites });
  } else if (type === 'blocked') {
    blockedSites = blockedSites.filter(s => s !== site);
    chrome.storage.sync.set({ blockedSites });
    
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'setBlockedSites',
      sites: blockedSites
    });
  }
  
  if (updateUI) {
    updateSettingsUI();
    updateDashboard();
  }
}

// Save goals
function saveGoals() {
  goals.productiveTime = parseInt(document.getElementById('productive-goal').value) || 120;
  goals.distractionLimit = parseInt(document.getElementById('distraction-limit').value) || 60;
  
  chrome.storage.sync.set({ goals });
  alert('Goals saved successfully!');
}

// Download report
function downloadReport() {
  if (!userData.isLoggedIn) {
    alert('Please login to download reports.');
    return;
  }
  
  const timeframe = document.querySelector('.timeframe-btn.active').getAttribute('data-timeframe');
  
  // In a real implementation, you would call the backend to generate a report
  // For this demo, we'll just show an alert
  alert(`Your ${timeframe} report would be downloaded here.`);
}

// Format seconds into a readable time string
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}