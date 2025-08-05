// Vinegar Options - MVP 1.0 with Enhanced UX, Dashboard Integration, and Premium Custom Sites

const DEFAULT_SITES = [
    'amazon.com',
    'ebay.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'etsy.com',
    'wayfair.com',
    'costco.com',
    'aliexpress.com',
    'shein.com',
    'nordstrom.com',
    'macys.com',
    'sephora.com',
    'ulta.com',
    'nike.com',
    'adidas.com',
    'zara.com',
    'hm.com',
    'asos.com',
    'shopify.com'
];

const POPULAR_SITES = [
    'amazon.com',
    'ebay.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'etsy.com'
];

let monitoredSites = [];
let blockedSites = [];
let customSites = [];
let isPremium = false;
let temporarySelections = new Set(); // Track current checkbox states

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupTabNavigation();
    setupIncomeHandlers();
    setupInterventionHandlers();
    setupCustomSitesHandlers();
    renderSitesGrid();
    renderCustomSites();
    setupEventListeners();
    
    // Check if navigating to dashboard tab from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'dashboard') {
        switchToTab('dashboard');
    }
});

async function loadSettings() {
    const data = await chrome.storage.local.get([
        'yearlyIncome',
        'monthlyIncome',
        'weeklyIncome',
        'hourlyIncome',
        'incomeType',
        'monitoredSites',
        'blockedSites',
        'customSites',
        'interventionTypes',
        'cooldownMinutes',
        'isPremium' // Check premium status
    ]);
    
    // Load premium status
    isPremium = data.isPremium || false;
    updatePremiumUI();
    
    // Load intervention types (with backward compatibility)
    if (data.interventionTypes) {
        // New format: array of enabled types
        document.getElementById('intervention-visit').checked = data.interventionTypes.includes('visit');
        document.getElementById('intervention-checkout').checked = data.interventionTypes.includes('checkout');
    } else {
        // Backward compatibility: check old interventionTiming field
        const oldData = await chrome.storage.local.get(['interventionTiming']);
        if (oldData.interventionTiming === 'checkout') {
            document.getElementById('intervention-visit').checked = false;
            document.getElementById('intervention-checkout').checked = true;
        } else {
            // Default: visit only
            document.getElementById('intervention-visit').checked = true;
            document.getElementById('intervention-checkout').checked = false;
        }
    }
    
    // Update income section visibility based on checkout checkbox
    updateIncomeVisibility();
    
    // Load income with new single-field approach
    const incomeType = data.incomeType || 'yearly';
    document.getElementById('income-type').value = incomeType;
    updateIncomeSuffix();
    
    // Load income amount based on type
    let incomeAmount = 0;
    if (incomeType === 'yearly' && data.yearlyIncome) incomeAmount = data.yearlyIncome;
    else if (incomeType === 'monthly' && data.monthlyIncome) incomeAmount = data.monthlyIncome;
    else if (incomeType === 'weekly' && data.weeklyIncome) incomeAmount = data.weeklyIncome;
    else if (incomeType === 'hourly' && data.hourlyIncome) incomeAmount = data.hourlyIncome;
    
    if (incomeAmount > 0) {
        document.getElementById('income-amount').value = incomeAmount;
    }
    
    // Load sites
    monitoredSites = data.monitoredSites || [];
    blockedSites = data.blockedSites || [];
    customSites = data.customSites || [];
    
    // Initialize temporary selections with saved monitored sites
    temporarySelections = new Set(monitoredSites);
    
    // Load cooldown
    const cooldown = data.cooldownMinutes !== undefined ? data.cooldownMinutes : 5;
    document.getElementById('cooldown-minutes').value = cooldown;
    document.getElementById('cooldown-range').value = cooldown;
    
    updateBlockedSitesList();
}

function updatePremiumUI() {
    const gate = document.getElementById('custom-sites-gate');
    const interface = document.getElementById('custom-sites-interface');
    
    if (isPremium) {
        gate.classList.add('hidden');
        interface.classList.remove('hidden');
    } else {
        gate.classList.remove('hidden');
        interface.classList.add('hidden');
    }
}

function setupCustomSitesHandlers() {
    const input = document.getElementById('custom-site-input');
    const addBtn = document.getElementById('add-custom-site');
    const upgradeBtn = document.getElementById('upgrade-btn');
    
    // Add custom site
    addBtn.addEventListener('click', addCustomSite);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCustomSite();
        }
    });
    
    // Input validation
    input.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        const isValid = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(value);
        addBtn.disabled = !isValid || customSites.includes(value);
    });
    
    // Premium upgrade
    upgradeBtn.addEventListener('click', () => {
        // In a real implementation, this would open a payment flow
        // For now, we'll simulate upgrading to premium
        simulatePremiumUpgrade();
    });
}

async function simulatePremiumUpgrade() {
    // In production, this would handle actual payment
    // For demo, we'll just set premium status
    isPremium = true;
    await chrome.storage.local.set({ isPremium: true });
    updatePremiumUI();
    
    // Show success message
    const btn = document.getElementById('upgrade-btn');
    btn.textContent = 'Welcome to Premium!';
    btn.style.background = 'var(--viridian)';
    btn.style.color = 'white';
    btn.disabled = true;
}

function addCustomSite() {
    const input = document.getElementById('custom-site-input');
    const site = input.value.trim().toLowerCase();
    
    // Validate
    if (!site || customSites.includes(site) || DEFAULT_SITES.includes(site)) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        return;
    }
    
    // Add to custom sites
    customSites.push(site);
    
    // Also add to monitored sites by default
    if (!monitoredSites.includes(site)) {
        monitoredSites.push(site);
        temporarySelections.add(site);
    }
    
    // Clear input
    input.value = '';
    
    // Re-render
    renderCustomSites();
    renderSitesGrid();
}

function renderCustomSites() {
    const list = document.getElementById('custom-sites-list');
    
    if (customSites.length === 0) {
        list.innerHTML = '<p class="custom-sites-empty">No custom sites added yet. Add your first site above!</p>';
        return;
    }
    
    list.innerHTML = customSites.map(site => {
        const isMonitored = monitoredSites.includes(site);
        const isBlocked = blockedSites.includes(site);
        
        return `
            <div class="custom-site-item">
                <div class="custom-site-info">
                    <div class="custom-site-icon">${site.charAt(0).toUpperCase()}</div>
                    <span class="custom-site-name">${site}</span>
                    <div class="custom-site-status">
                        <span class="status-dot" style="background: ${isBlocked ? 'var(--vermillion)' : isMonitored ? 'var(--viridian)' : 'var(--gray-300)'}"></span>
                        <span>${isBlocked ? 'Blocked' : isMonitored ? 'Monitored' : 'Inactive'}</span>
                    </div>
                </div>
                <div class="custom-site-actions">
                    <button class="custom-site-btn remove" data-site="${site}">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    list.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const site = e.target.dataset.site;
            removeCustomSite(site);
        });
    });
}

function removeCustomSite(site) {
    // Remove from all arrays
    customSites = customSites.filter(s => s !== site);
    monitoredSites = monitoredSites.filter(s => s !== site);
    blockedSites = blockedSites.filter(s => s !== site);
    temporarySelections.delete(site);
    
    // Re-render
    renderCustomSites();
    renderSitesGrid();
    updateBlockedSitesList();
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.vinegar-tab');
    const tabContents = document.querySelectorAll('.vinegar-tab-content');
    const indicator = document.querySelector('.vinegar-tab-indicator');
    const saveSection = document.getElementById('save-section');
    
    // Set initial indicator position
    updateIndicator(tabs[0]);
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchToTab(tabName);
        });
    });
    
    function updateIndicator(activeTab) {
        indicator.style.width = activeTab.offsetWidth + 'px';
        indicator.style.left = activeTab.offsetLeft + 'px';
    }
    
    // Update indicator on window resize
    window.addEventListener('resize', () => {
        const activeTab = document.querySelector('.vinegar-tab.active');
        updateIndicator(activeTab);
    });
}

function switchToTab(tabName) {
    const tabs = document.querySelectorAll('.vinegar-tab');
    const tabContents = document.querySelectorAll('.vinegar-tab-content');
    const indicator = document.querySelector('.vinegar-tab-indicator');
    const saveSection = document.getElementById('save-section');
    
    // Update active states
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    // Find and activate the target tab
    const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`${tabName}-tab`);
    
    if (targetTab && targetContent) {
        targetTab.classList.add('active');
        targetContent.classList.add('active');
        
        // Update indicator
        indicator.style.width = targetTab.offsetWidth + 'px';
        indicator.style.left = targetTab.offsetLeft + 'px';
        
        // Hide save button on dashboard tab
        if (tabName === 'dashboard') {
            saveSection.style.display = 'none';
            // Load dashboard data
            loadDashboardData();
        } else {
            saveSection.style.display = 'block';
        }
    }
}

async function loadDashboardData() {
    // Load saved data
    const data = await chrome.storage.local.get([
        'timeSaved',
        'interventionsHeeded',
        'lastVisit',
        'firstInstall'
    ]);
    
    // Calculate stats
    const hoursSaved = data.timeSaved || 0;
    const daysSaved = hoursSaved / 24;
    const interventionsHeeded = data.interventionsHeeded || 0;
    
    // Calculate streak (simplified for MVP)
    const lastVisit = data.lastVisit ? new Date(data.lastVisit) : new Date();
    const today = new Date();
    const daysSinceLastVisit = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
    const streak = daysSinceLastVisit <= 1 ? (data.streak || 0) + 1 : 1;
    
    // Update display
    updateDashboardStats(hoursSaved, daysSaved, interventionsHeeded, streak);
    updateDashboardAlternatives(hoursSaved);
    
    // Load random quote
    loadDashboardQuote();
    
    // Animate elements on load
    animateDashboardOnLoad();
}

function updateDashboardStats(hours, days, interventions, streak) {
    // Hero time
    const heroTime = document.getElementById('hero-time-saved');
    if (hours < 24) {
        heroTime.textContent = hours.toFixed(1);
        document.querySelector('.time-saved-unit').textContent = 'hours';
    } else {
        heroTime.textContent = days.toFixed(1);
        document.querySelector('.time-saved-unit').textContent = 'days';
    }
    
    // Stats cards
    document.getElementById('days-saved').textContent = days.toFixed(1);
    document.getElementById('interventions-heeded').textContent = interventions;
    document.getElementById('streak-days').textContent = streak;
    
    // Books calculation (average book = 10 hours reading)
    const booksRead = Math.floor(hours / 10);
    document.getElementById('books-read').textContent = booksRead;
}

function updateDashboardAlternatives(totalHours) {
    // Distribute time across activities (these are illustrative)
    const distributions = {
        family: 0.35,
        growth: 0.25,
        rest: 0.25,
        creation: 0.15
    };
    
    Object.entries(distributions).forEach(([activity, percentage]) => {
        const hours = totalHours * percentage;
        const bar = document.getElementById(`bar-${activity}`);
        const label = document.getElementById(`hours-${activity}`);
        
        // Update text
        label.textContent = `${hours.toFixed(1)} hours`;
        
        // Animate bar after a delay
        setTimeout(() => {
            bar.style.width = `${percentage * 100}%`;
        }, 1000);
    });
}

function loadDashboardQuote() {
    const quotes = [
        {
            text: "The secret of happiness, you see, is not found in seeking more, but in developing the capacity to enjoy less.",
            author: "Socrates"
        },
        {
            text: "He who is not contented with what he has, would not be contented with what he would like to have.",
            author: "Epicurus"
        },
        {
            text: "The things you own end up owning you.",
            author: "Chuck Palahniuk"
        },
        {
            text: "Simplicity is the ultimate sophistication.",
            author: "Leonardo da Vinci"
        },
        {
            text: "The best things in life aren't things.",
            author: "Art Buchwald"
        },
        {
            text: "Wealth consists not in having great possessions, but in having few wants.",
            author: "Epictetus"
        },
        {
            text: "Buy less, choose well.",
            author: "Vivienne Westwood"
        },
        {
            text: "The more you have, the more you are occupied. The less you have, the more free you are.",
            author: "Mother Teresa"
        }
    ];
    
    // Pick quote based on date (so it's consistent for the day)
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const quoteIndex = dayOfYear % quotes.length;
    const quote = quotes[quoteIndex];
    
    document.getElementById('daily-quote').textContent = `"${quote.text}"`;
    document.querySelector('.quote-author').textContent = `— ${quote.author}`;
}

function animateDashboardOnLoad() {
    // Trigger number animations
    const animateNumber = (element, start, end, duration) => {
        const startTime = performance.now();
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuad = progress * (2 - progress);
            
            const current = start + (end - start) * easeOutQuad;
            element.textContent = current.toFixed(1);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    };
    
    // Animate hero number
    const heroNumber = document.getElementById('hero-time-saved');
    const targetValue = parseFloat(heroNumber.textContent);
    if (targetValue > 0) {
        animateNumber(heroNumber, 0, targetValue, 2000);
    }
}

function setupInterventionHandlers() {
    const visitCheckbox = document.getElementById('intervention-visit');
    const checkoutCheckbox = document.getElementById('intervention-checkout');
    const warningMessage = document.getElementById('no-intervention-warning');
    
    // Handle checkbox changes
    const handleInterventionChange = () => {
        const visitChecked = visitCheckbox.checked;
        const checkoutChecked = checkoutCheckbox.checked;
        
        // Show/hide income section based on checkout checkbox
        updateIncomeVisibility();
        
        // Show warning if no intervention types selected
        if (!visitChecked && !checkoutChecked) {
            warningMessage.classList.add('show');
        } else {
            warningMessage.classList.remove('show');
        }
    };
    
    visitCheckbox.addEventListener('change', handleInterventionChange);
    checkoutCheckbox.addEventListener('change', handleInterventionChange);
}

function updateIncomeVisibility() {
    const incomeSection = document.getElementById('income-section');
    const checkoutChecked = document.getElementById('intervention-checkout').checked;
    
    if (checkoutChecked) {
        incomeSection.classList.add('active');
    } else {
        incomeSection.classList.remove('active');
    }
}

function setupIncomeHandlers() {
    const incomeType = document.getElementById('income-type');
    const incomeAmount = document.getElementById('income-amount');
    const cooldownRange = document.getElementById('cooldown-range');
    const cooldownInput = document.getElementById('cooldown-minutes');
    
    // Income type change
    incomeType.addEventListener('change', updateIncomeSuffix);
    
    // Sync cooldown slider and input
    cooldownRange.addEventListener('input', (e) => {
        cooldownInput.value = e.target.value;
    });
    
    cooldownInput.addEventListener('input', (e) => {
        cooldownRange.value = e.target.value;
    });
}

function updateIncomeSuffix() {
    const type = document.getElementById('income-type').value;
    const suffix = document.getElementById('income-suffix');
    
    const suffixes = {
        yearly: '/year',
        monthly: '/month',
        weekly: '/week',
        hourly: '/hour'
    };
    
    suffix.textContent = suffixes[type];
}

function renderSitesGrid() {
    const grid = document.getElementById('sites-grid');
    grid.innerHTML = '';
    
    // Combine default and custom sites
    const allSites = [...DEFAULT_SITES, ...customSites];
    
    allSites.forEach(site => {
        const isBlocked = blockedSites.includes(site);
        const isCustom = customSites.includes(site);
        const isChecked = temporarySelections.has(site); // Use temporary selections
        
        if (!isBlocked) {
            const item = document.createElement('div');
            item.className = 'site-item';
            
            item.innerHTML = `
                <input type="checkbox" 
                       id="site-${site}" 
                       value="${site}"
                       ${isChecked ? 'checked' : ''}
                       style="position: absolute; opacity: 0;">
                <label for="site-${site}" class="site-label">
                    <div class="site-checkbox"></div>
                    <span class="site-name">${formatSiteName(site)}${isCustom ? ' ✨' : ''}</span>
                </label>
                <button class="block-btn" data-site="${site}">Block</button>
            `;
            
            grid.appendChild(item);
            
            // Add change listener to track checkbox state
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    temporarySelections.add(site);
                } else {
                    temporarySelections.delete(site);
                }
            });
        }
    });
}

function formatSiteName(site) {
    const name = site.replace('.com', '').replace('.', ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function updateBlockedSitesList() {
    const container = document.getElementById('blocked-sites');
    
    if (blockedSites.length === 0) {
        container.innerHTML = '<p class="empty-state" id="blocked-empty">No sites blocked yet</p>';
    } else {
        container.innerHTML = blockedSites.map(site => {
            const isCustom = customSites.includes(site);
            return `
                <div class="blocked-site">
                    <span class="blocked-site-name">${formatSiteName(site)}${isCustom ? ' ✨' : ''}</span>
                    <button class="unblock-btn" data-site="${site}">Unblock</button>
                </div>
            `;
        }).join('');
    }
}

function setupEventListeners() {
    // Select all/none
    document.getElementById('select-all').addEventListener('click', () => {
        document.querySelectorAll('.sites-grid input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
            temporarySelections.add(cb.value);
        });
    });
    
    document.getElementById('select-none').addEventListener('click', () => {
        document.querySelectorAll('.sites-grid input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            temporarySelections.delete(cb.value);
        });
        temporarySelections.clear();
    });
    
    // Block/unblock buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('block-btn')) {
            const site = e.target.dataset.site;
            if (!blockedSites.includes(site)) {
                blockedSites.push(site);
                temporarySelections.delete(site); // Remove from selections if blocked
                renderSitesGrid();
                updateBlockedSitesList();
            }
        }
        
        if (e.target.classList.contains('unblock-btn')) {
            const site = e.target.dataset.site;
            blockedSites = blockedSites.filter(s => s !== site);
            renderSitesGrid();
            updateBlockedSitesList();
        }
    });
    
    // Save button
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Dashboard action buttons
    document.getElementById('close-tab').addEventListener('click', async () => {
        try {
            // Try to close the tab
            window.close();
            
            // If that doesn't work, go to new tab page
            setTimeout(() => {
                chrome.runtime.sendMessage({ action: 'goHome' });
            }, 100);
        } catch (error) {
            chrome.runtime.sendMessage({ action: 'goHome' });
        }
    });
    
    // Share progress (MVP: just copy stats to clipboard)
    document.getElementById('share-progress').addEventListener('click', async () => {
        const hours = parseFloat(document.getElementById('hero-time-saved').textContent);
        const unit = document.querySelector('.time-saved-unit').textContent;
        
        const shareText = `I've saved ${hours} ${unit} of my life by pausing before purchases with @usevinegar. Every moment of pause is a victory. 🌱`;
        
        try {
            await navigator.clipboard.writeText(shareText);
            
            // Visual feedback
            const btn = document.getElementById('share-progress');
            const originalText = btn.textContent;
            btn.textContent = 'Copied to clipboard!';
            btn.style.background = 'var(--viridian)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--viridian)';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    });
}

async function saveSettings() {
    // Get intervention types
    const visitChecked = document.getElementById('intervention-visit').checked;
    const checkoutChecked = document.getElementById('intervention-checkout').checked;
    
    // Validate at least one intervention type is selected
    if (!visitChecked && !checkoutChecked) {
        const warning = document.getElementById('no-intervention-warning');
        warning.classList.add('show');
        
        // Shake animation
        warning.style.animation = 'none';
        void warning.offsetHeight; // Trigger reflow
        warning.style.animation = 'shake 0.3s ease';
        
        return; // Don't save
    }
    
    // Build intervention types array
    const interventionTypes = [];
    if (visitChecked) interventionTypes.push('visit');
    if (checkoutChecked) interventionTypes.push('checkout');
    
    // Update monitoredSites from temporary selections
    monitoredSites = Array.from(temporarySelections);
    
    // Get income
    const incomeType = document.getElementById('income-type').value;
    const incomeAmount = parseInt(document.getElementById('income-amount').value) || 0;
    
    // Validate income if checkout is enabled
    if (checkoutChecked && incomeAmount === 0) {
        // Show error state
        const incomeGroup = document.querySelector('.income-input-group');
        const incomeInput = document.getElementById('income-amount');
        
        incomeGroup.classList.add('error');
        incomeInput.focus();
        
        // Remove error state after animation
        setTimeout(() => {
            incomeGroup.classList.remove('error');
        }, 500);
        
        // Scroll to income section if needed
        document.getElementById('income-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        return; // Don't save
    }
    
    // Reset all income values
    let yearlyIncome = 0;
    let monthlyIncome = 0;
    let weeklyIncome = 0;
    let hourlyIncome = 0;
    
    // Set the appropriate income value
    if (incomeType === 'yearly') yearlyIncome = incomeAmount;
    else if (incomeType === 'monthly') monthlyIncome = incomeAmount;
    else if (incomeType === 'weekly') weeklyIncome = incomeAmount;
    else if (incomeType === 'hourly') hourlyIncome = incomeAmount;
    
    // Get cooldown
    const cooldownMinutes = parseInt(document.getElementById('cooldown-minutes').value) || 5;
    
    // Save to storage
    await chrome.storage.local.set({
        monitoredSites,
        blockedSites,
        customSites,
        yearlyIncome,
        monthlyIncome,
        weeklyIncome,
        hourlyIncome,
        incomeType,
        interventionTypes,
        cooldownMinutes,
        onboardingComplete: true,
        isPremium
    });
    
    // Show success message with animation
    const message = document.getElementById('save-message');
    const button = document.getElementById('save-settings');
    
    button.style.background = 'var(--viridian)';
    message.classList.remove('hidden');
    
    setTimeout(() => {
        button.style.background = '';
        message.classList.add('hidden');
    }, 3000);
}