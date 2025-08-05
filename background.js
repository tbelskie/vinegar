// Vinegar Background Service Worker - MVP 1.0
// Enhanced cart detection and intervention timing

// Default shopping sites
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

// Cart detection patterns by site
const CART_PATTERNS = {
  'amazon.com': {
    urls: ['/gp/cart', '/cart/smart-wagon', '/cart/view.html', '/gp/aw/c'],
    selectors: ['#nav-cart-count', '.nav-cart-count', '#nav-cart'],
    cartCountSelector: '#nav-cart-count',
    addToCartButtons: ['#add-to-cart-button', '[aria-labelledby*="submit.add-to-cart"]', '#buy-now-button']
  },
  'target.com': {
    urls: ['/cart', '/co-cart'],
    selectors: ['[data-test="cart-icon"]', '[data-test="cart-summary"]'],
    cartCountSelector: '[data-test="badge-count"]',
    addToCartButtons: ['[data-test="chooseOptionsButton"]', '[data-test="shipItButton"]', '[data-test="orderPickupButton"]']
  },
  'walmart.com': {
    urls: ['/cart', '/checkout'],
    selectors: ['.cart-icon', '.cart-count'],
    cartCountSelector: '.cart-item-count-badge',
    addToCartButtons: ['button[data-automation="cta-button"]', '.prod-ProductCTA-button']
  },
  'bestbuy.com': {
    urls: ['/cart', '/checkout'],
    selectors: ['.cart-icon', '.cart-link'],
    cartCountSelector: '.cart-count',
    addToCartButtons: ['.add-to-cart-button', '[data-button-state="ADD_TO_CART"]']
  },
  'ebay.com': {
    urls: ['/cart', '/sc/all'],
    selectors: ['#gh-cart-icon', '.gh-cart-icon'],
    cartCountSelector: '#gh-cart-n',
    addToCartButtons: ['.ux-call-to-action__text', '#binBtn_btn', '[data-testid="x-bin-action"]']
  },
  'etsy.com': {
    urls: ['/cart'],
    selectors: ['.cart-icon', '[data-selector="cart-icon"]'],
    cartCountSelector: '[data-selector="cart-count"]',
    addToCartButtons: ['[data-selector="add-to-cart-button"]', '.add-to-cart-button']
  },
  'nike.com': {
    urls: ['/cart'],
    selectors: ['.pre-cart-btn', '.nav-cart'],
    cartCountSelector: '.cart-count',
    addToCartButtons: ['.ncss-btn-primary-dark', '[data-test="add-to-cart"]']
  },
  'adidas.com': {
    urls: ['/cart', '/bag'],
    selectors: ['[data-auto-id="header-cart-icon"]', '.cart-icon'],
    cartCountSelector: '[data-auto-id="cart-count"]',
    addToCartButtons: ['[data-auto-id="add-to-bag"]', '.add-to-bag___3wgQk']
  },
  'nordstrom.com': {
    urls: ['/shopping-bag'],
    selectors: ['[aria-label*="Shopping bag"]', '.shopping-bag-icon'],
    cartCountSelector: '.shopping-bag-count',
    addToCartButtons: ['[aria-label="Add to Bag"]', '.add-to-bag-button']
  },
  'zara.com': {
    urls: ['/basket'],
    selectors: ['.layout-header-cart-link', '.cart-icon'],
    cartCountSelector: '.layout-header-cart-count',
    addToCartButtons: ['.product-detail-add-to-cart-button', '[data-qa-action="add-to-basket"]']
  },
  'hm.com': {
    urls: ['/bag', '/cart'],
    selectors: ['.CartIcon', '[data-testid="cart-icon"]'],
    cartCountSelector: '.CartIcon__quantity',
    addToCartButtons: ['[data-testid="add-to-bag"]', '.item__add-to-bag']
  },
  'asos.com': {
    urls: ['/bag'],
    selectors: ['[data-testid="bagIcon"]', '.bag-icon'],
    cartCountSelector: '[data-testid="bagItemCount"]',
    addToCartButtons: ['[data-test-id="add-button"]', '[aria-label*="Add to bag"]']
  },
  'sephora.com': {
    urls: ['/basket'],
    selectors: ['.css-1ov04zs', '[data-at="basket_icon"]'],
    cartCountSelector: '[data-at="basket_count"]',
    addToCartButtons: ['[data-at="add_to_basket"]', '.css-12o4w9b']
  },
  'ulta.com': {
    urls: ['/bag'],
    selectors: ['.MiniCart', '[aria-label*="Cart"]'],
    cartCountSelector: '.MiniCart__quantity',
    addToCartButtons: ['.ProductMainSection__addToBag', '[data-testid="add-to-bag"]']
  },
  'macys.com': {
    urls: ['/bag'],
    selectors: ['#bagIcon', '.icon-bag'],
    cartCountSelector: '#bagItemCount',
    addToCartButtons: ['[data-auto="add-to-bag"]', '.add-to-bag']
  },
  'wayfair.com': {
    urls: ['/cart'],
    selectors: ['.CartButton', '[data-testid="cart-button"]'],
    cartCountSelector: '.CartButton-count',
    addToCartButtons: ['[data-enzyme-id="AddToCart"]', '.pl-Button--primary']
  },
  'costco.com': {
    urls: ['/CheckoutCartView'],
    selectors: ['#cart-d', '.cart-icon'],
    cartCountSelector: '.cart-number',
    addToCartButtons: ['#add-to-cart-btn', '.add-to-cart']
  },
  'aliexpress.com': {
    urls: ['/cart'],
    selectors: ['.cart-icon', '.shop-cart'],
    cartCountSelector: '.shop-cart--number',
    addToCartButtons: ['.add-to-cart-button', '[ae_button_type="add_to_cart"]']
  },
  'shein.com': {
    urls: ['/cart'],
    selectors: ['.header-cart', '[aria-label="Shopping Bag"]'],
    cartCountSelector: '.cart-count',
    addToCartButtons: ['.she-btn-black', '[aria-label="Add to Bag"]']
  }
};

// Generic patterns for custom sites
const GENERIC_PATTERNS = {
  urls: ['/cart', '/bag', '/basket', '/shopping-cart', '/shopping-bag'],
  selectors: ['.cart', '.bag', '.basket', '[class*="cart"]', '[class*="bag"]', '[aria-label*="cart"]', '[aria-label*="bag"]'],
  cartCountSelector: '[class*="count"], [class*="quantity"], [class*="badge"]',
  addToCartButtons: ['[class*="add-to-cart"]', '[class*="add-to-bag"]', '[id*="add-to-cart"]', 'button[type="submit"]']
};

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default data
    await chrome.storage.local.set({
      onboardingComplete: false,
      monitoredSites: [],
      blockedSites: [],
      customSites: [], // NEW: Added for custom sites feature
      interventionTypes: ['visit'], // Default to visit only
      yearlyIncome: 0,
      monthlyIncome: 0,
      weeklyIncome: 0,
      hourlyIncome: 0,
      lastVisitInterventionBySite: {}, // Separate cooldown for visit interventions
      lastCartInterventionBySite: {}, // Separate cooldown for cart interventions
      cooldownMinutes: 5, // User-configurable cooldown
      timeSaved: 0, // in hours
      interventionsHeeded: 0, // number of times user chose to leave
      firstInstall: new Date().toISOString(),
      cartDetectionMethod: 'smart', // New: smart detection
      isPremium: false // NEW: Added for premium status
    });
  }
});

// Listen for tab updates to check for blocked sites
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const hostname = new URL(tab.url).hostname.replace('www.', '');
      const data = await chrome.storage.local.get(['blockedSites', 'onboardingComplete']);
      
      if (data.onboardingComplete && data.blockedSites && data.blockedSites.length > 0) {
        const isBlocked = data.blockedSites.some(site => hostname.includes(site));
        
        if (isBlocked) {
          // Inject the blocker page
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: injectBlockerPage,
            args: [hostname]
          });
        }
      }
    } catch (error) {
      console.error('Error checking blocked sites:', error);
    }
  }
});

// Enhanced message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'checkIntervention':
      handleInterventionCheck(request.url, request.isCartPage, sender.tab.id, sendResponse);
      return true; // Keep channel open
      
    case 'cartUpdated':
      handleCartUpdate(request, sender.tab.id, sendResponse);
      return true;
      
    case 'timeSaved':
      updateTimeSaved(request.hours);
      break;
      
    case 'openOptions':
      chrome.runtime.openOptionsPage();
      break;
      
    case 'goHome':
      chrome.tabs.update(sender.tab.id, { url: 'chrome://newtab' });
      break;
      
    case 'closeOrRedirect':
      handleCloseOrRedirect(sender.tab.id);
      break;
      
    case 'getCartPatterns':
      sendResponse(getCartPatterns(request.hostname));
      break;
  }
});

// Handle cart updates from content script - NO VISIT INTERVENTION CHECK
async function handleCartUpdate(request, tabId, sendResponse) {
  const { site, isCartPage, cartCount } = request;
  
  const data = await chrome.storage.local.get([
    'onboardingComplete',
    'monitoredSites',
    'interventionTypes',
    'lastCartInterventionBySite',
    'cooldownMinutes',
    'yearlyIncome',
    'monthlyIncome',
    'weeklyIncome',
    'hourlyIncome'
  ]);
  
  if (!data.onboardingComplete || !data.interventionTypes.includes('checkout')) {
    sendResponse({ shouldIntervene: false });
    return;
  }
  
  // Check if site should be monitored
  const shouldMonitor = data.monitoredSites.some(monitoredSite => 
    site.includes(monitoredSite)
  );
  
  if (!shouldMonitor) {
    sendResponse({ shouldIntervene: false });
    return;
  }
  
  // Check cooldown for cart interventions ONLY
  const now = Date.now();
  const lastCartInterventionBySite = data.lastCartInterventionBySite || {};
  const lastCartInterventionForSite = lastCartInterventionBySite[site] || 0;
  const cooldownMs = (data.cooldownMinutes || 5) * 60 * 1000;
  
  if (data.cooldownMinutes > 0 && (now - lastCartInterventionForSite < cooldownMs)) {
    sendResponse({ shouldIntervene: false });
    return;
  }
  
  // If cart count increased or navigated to cart, trigger intervention
  if (isCartPage || cartCount > 0) {
    // Update last cart intervention time
    lastCartInterventionBySite[site] = now;
    await chrome.storage.local.set({ lastCartInterventionBySite });
    
    // Calculate hourly rate based on ALL income types
    let hourlyRate = 0;
    if (data.hourlyIncome > 0) {
      hourlyRate = data.hourlyIncome;
    } else if (data.weeklyIncome > 0) {
      hourlyRate = data.weeklyIncome / 40;
    } else if (data.monthlyIncome > 0) {
      hourlyRate = (data.monthlyIncome * 12) / 2080;
    } else if (data.yearlyIncome > 0) {
      hourlyRate = data.yearlyIncome / 2080;
    }
    
    sendResponse({ 
      shouldIntervene: true,
      siteName: site,
      hourlyRate: hourlyRate,
      interventionType: 'checkout'
    });
  } else {
    sendResponse({ shouldIntervene: false });
  }
}

// Check if we should show VISIT intervention only
async function handleInterventionCheck(url, isCartPage, tabId, sendResponse) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const data = await chrome.storage.local.get([
      'onboardingComplete',
      'monitoredSites',
      'blockedSites',
      'interventionTypes',
      'lastVisitInterventionBySite',
      'cooldownMinutes'
    ]);
    
    // Check if onboarding is complete
    if (!data.onboardingComplete) {
      sendResponse({ shouldIntervene: false });
      return;
    }
    
    // Check if site is blocked
    if (data.blockedSites && data.blockedSites.includes(hostname)) {
      sendResponse({ shouldIntervene: false, blocked: true });
      return;
    }
    
    // Check if site should be monitored
    const shouldMonitor = data.monitoredSites.some(site => 
      hostname.includes(site)
    );
    
    if (!shouldMonitor) {
      sendResponse({ shouldIntervene: false });
      return;
    }
    
    // Get intervention types
    let interventionTypes = data.interventionTypes || [];
    
    // ONLY check for visit interventions here, never cart
    if (interventionTypes.includes('visit') && !isCartPage) {
      // Check visit-specific cooldown
      const now = Date.now();
      const lastVisitInterventionBySite = data.lastVisitInterventionBySite || {};
      const lastVisitInterventionForSite = lastVisitInterventionBySite[hostname] || 0;
      const cooldownMs = (data.cooldownMinutes || 5) * 60 * 1000;
      
      if (data.cooldownMinutes > 0 && (now - lastVisitInterventionForSite < cooldownMs)) {
        sendResponse({ shouldIntervene: false });
        return;
      }
      
      // Update last visit intervention time
      lastVisitInterventionBySite[hostname] = now;
      await chrome.storage.local.set({ lastVisitInterventionBySite });
      
      sendResponse({ 
        shouldIntervene: true,
        siteName: hostname,
        interventionType: 'visit'
      });
    } else {
      sendResponse({ shouldIntervene: false });
    }
  } catch (error) {
    console.error('Error checking intervention:', error);
    sendResponse({ shouldIntervene: false });
  }
}

// Get cart patterns for a site
function getCartPatterns(hostname) {
  // Check if we have specific patterns for this site
  for (const [site, patterns] of Object.entries(CART_PATTERNS)) {
    if (hostname.includes(site)) {
      return patterns;
    }
  }
  
  // Return generic patterns for custom sites
  return GENERIC_PATTERNS;
}

// Beautiful zen blocker page
function injectBlockerPage(siteName) {
  // Pick a random zen quote
  const quotes = [
    "In the space between stimulus and response lies your freedom",
    "The pine teaches silence",
    "When you walk, just walk. When you sit, just sit",
    "The obstacle is the path",
    "Let go or be dragged",
    "Sitting quietly, doing nothing, spring comes",
    "Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water",
    "In thinking, keep to the simple"
  ];
  
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  
  // Create blocker CSS link
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = chrome.runtime.getURL('blocker.css');
  
  // Create the blocker HTML
  const blockerHTML = `
    <div class="vinegar-blocked-overlay">
      <!-- Ambient light background -->
      <div class="vinegar-ambient-container">
        <div class="vinegar-ambient-light vinegar-ambient-1"></div>
        <div class="vinegar-ambient-light vinegar-ambient-2"></div>
        <div class="vinegar-ambient-light vinegar-ambient-3"></div>
      </div>
      
      <div class="vinegar-blocked-container">
        <!-- Central meditation circle -->
        <div class="vinegar-meditation-circle">
          <div class="vinegar-ring vinegar-ring-1"></div>
          <div class="vinegar-ring vinegar-ring-2"></div>
          <div class="vinegar-ring vinegar-ring-3"></div>
          
          <!-- Logo orb -->
          <div class="vinegar-logo-orb">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path d="M 25 45 L 100 155 L 175 45" 
                    stroke="currentColor" 
                    stroke-width="7" 
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>
              <circle cx="100" cy="170" r="8" fill="currentColor"/>
            </svg>
          </div>
        </div>
        
        <!-- Message section -->
        <div class="vinegar-message-section">
          <div class="vinegar-blocked-title">BLOCKED</div>
          <div class="vinegar-site-name">${siteName}</div>
          
          <div class="vinegar-separator"></div>
          
          <div class="vinegar-wisdom">"${quote}"</div>
          
          <div class="vinegar-action-container">
            <button class="vinegar-sanctuary-btn" id="vinegar-go-home">
              Return to sanctuary
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Clear the page and inject our blocker
  document.documentElement.innerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blocked - ${siteName}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      ${blockerHTML}
    </body>
    </html>
  `;
  
  // Inject the CSS
  document.head.appendChild(cssLink);
  
  // Add event listener for the button
  document.getElementById('vinegar-go-home').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'goHome' });
  });
  
  // Add show class after a brief delay for animation
  setTimeout(() => {
    document.querySelector('.vinegar-blocked-overlay').classList.add('show');
  }, 100);
}

// Update time saved
async function updateTimeSaved(hours) {
  const data = await chrome.storage.local.get(['timeSaved', 'interventionsHeeded']);
  const newTotal = (data.timeSaved || 0) + hours;
  const newInterventions = (data.interventionsHeeded || 0) + 1;
  
  await chrome.storage.local.set({ 
    timeSaved: newTotal,
    interventionsHeeded: newInterventions
  });
  
  // Update badge
  if (newTotal >= 1) {
    chrome.action.setBadgeText({ text: Math.floor(newTotal).toString() + 'h' });
    chrome.action.setBadgeBackgroundColor({ color: '#4ECDC4' });
  }
}

// Handle close or redirect after success
async function handleCloseOrRedirect(tabId) {
  try {
    // Navigate to dashboard
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    await chrome.tabs.update(tabId, { url: dashboardUrl });
  } catch (error) {
    // Fallback to new tab if something goes wrong
    chrome.tabs.update(tabId, { url: 'chrome://newtab' });
  }
}