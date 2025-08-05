// Vinegar Popup - Unified state management

document.addEventListener('DOMContentLoaded', async () => {
    // Load current state
    const data = await chrome.storage.local.get([
        'onboardingComplete',
        'timeSaved'
    ]);
    
    if (data.onboardingComplete) {
        showActiveState(data);
    } else {
        showOnboarding();
    }
});

function showOnboarding() {
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('active-state').classList.add('hidden');
    
    // Begin button opens settings
    document.getElementById('begin-btn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });
}

function showActiveState(data) {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('active-state').classList.remove('hidden');
    
    // Format time saved
    const timeSaved = data.timeSaved || 0;
    let timeDisplay;
    
    if (timeSaved === 0) {
        timeDisplay = '0h';
    } else if (timeSaved < 1) {
        timeDisplay = `${Math.round(timeSaved * 60)}m`;
    } else if (timeSaved < 24) {
        const hours = Math.floor(timeSaved);
        const minutes = Math.round((timeSaved - hours) * 60);
        timeDisplay = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
        const days = Math.floor(timeSaved / 24);
        const hours = Math.floor(timeSaved % 24);
        timeDisplay = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
    
    document.getElementById('time-saved').textContent = timeDisplay;
    
    // Dashboard button - opens options page with dashboard tab
    document.getElementById('dashboard-btn').addEventListener('click', () => {
        chrome.tabs.create({ 
            url: chrome.runtime.getURL('options.html?tab=dashboard') 
        });
        window.close();
    });
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });
}