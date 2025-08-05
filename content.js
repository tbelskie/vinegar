// Vinegar Content Script - MVP 1.0
// Enhanced cart detection with smart monitoring

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.vinegarInjected) return;
  window.vinegarInjected = true;
  
  let currentIntervention = null;
  let breathingInterval = null;
  let timerInterval = null;
  let cartDetectionAttempts = 0;
  let lastKnownCartCount = 0;
  let cartPatterns = null;
  let isMonitoringCart = false;
  const MAX_DETECTION_ATTEMPTS = 15;
  const DETECTION_DELAY = 1000;
  
  // Check if current page is a cart page
  function isCartPage() {
    if (!cartPatterns || !cartPatterns.urls) return false;
    const currentUrl = window.location.pathname.toLowerCase();
    return cartPatterns.urls.some(cartUrl => currentUrl.includes(cartUrl));
  }
  
  // Get site-specific patterns from background
  async function loadCartPatterns() {
    const hostname = window.location.hostname.replace('www.', '');
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getCartPatterns',
        hostname: hostname
      }, (response) => {
        cartPatterns = response || {};
        resolve();
      });
    });
  }
  
  // Initialize cart monitoring
  async function initializeCartMonitoring() {
    // Only monitor if checkout interventions are enabled
    chrome.storage.local.get(['interventionTypes'], (data) => {
      if (data.interventionTypes && data.interventionTypes.includes('checkout')) {
        isMonitoringCart = true;
        setupCartMonitoring();
      }
    });
  }
  
  // Smart cart monitoring
  function setupCartMonitoring() {
    if (!isMonitoringCart || !cartPatterns) return;
    
    // Monitor cart count changes
    monitorCartCount();
    
    // Monitor add to cart button clicks
    monitorAddToCartButtons();
    
    // Monitor URL changes for cart navigation
    monitorCartNavigation();
    
    // Set up mutation observer for dynamic content
    setupCartMutationObserver();
  }
  
  // Monitor cart count in header
  function monitorCartCount() {
    let checkInterval = setInterval(() => {
      if (!cartPatterns || !cartPatterns.cartCountSelector) return;
      
      const countElement = document.querySelector(cartPatterns.cartCountSelector);
      if (countElement) {
        const countText = countElement.textContent.trim();
        const count = parseInt(countText) || 0;
        
        if (count > lastKnownCartCount) {
          // Cart count increased!
          lastKnownCartCount = count;
          clearInterval(checkInterval);
          triggerCartIntervention(false, count);
        }
      }
    }, 500);
    
    // Stop checking after 30 seconds
    setTimeout(() => clearInterval(checkInterval), 30000);
  }
  
  // Monitor add to cart button clicks
  function monitorAddToCartButtons() {
    if (!cartPatterns || !cartPatterns.addToCartButtons) return;
    
    // Use event delegation for dynamic buttons
    document.addEventListener('click', async (e) => {
      const target = e.target;
      
      // Check if clicked element matches any add to cart selector
      for (const selector of cartPatterns.addToCartButtons) {
        if (target.matches(selector) || target.closest(selector)) {
          console.log('Vinegar: Add to cart clicked');
          
          // Wait a moment for cart to update
          setTimeout(() => {
            triggerCartIntervention(false, null);
          }, 1500);
          
          break;
        }
      }
    }, true);
  }
  
  // Monitor navigation to cart pages
  function monitorCartNavigation() {
    // Monitor URL changes
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        if (isCartPage()) {
          triggerCartIntervention(true, null);
        }
      }
    });
    
    urlObserver.observe(document.body, { 
      childList: true, 
      subtree: true
    });
    
    // Also listen for popstate
    window.addEventListener('popstate', () => {
      if (isCartPage()) {
        triggerCartIntervention(true, null);
      }
    });
  }
  
  // Setup mutation observer for cart updates
  function setupCartMutationObserver() {
    if (!cartPatterns || !cartPatterns.selectors) return;
    
    const observer = new MutationObserver((mutations) => {
      // Look for cart-related changes
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's a cart modal or overlay
            for (const selector of cartPatterns.selectors) {
              if (node.matches && node.matches(selector)) {
                console.log('Vinegar: Cart element detected');
                triggerCartIntervention(false, null);
                return;
              }
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // NEW: Direct cart intervention trigger
  async function triggerCartIntervention(isCartPage, cartCount) {
    const hostname = window.location.hostname.replace('www.', '');
    
    chrome.runtime.sendMessage({
      action: 'cartUpdated',
      site: hostname,
      isCartPage: isCartPage,
      cartCount: cartCount
    }, (response) => {
      if (response && response.shouldIntervene && response.interventionType === 'checkout') {
        // Show time intervention for cart/checkout
        showTimeIntervention(response.hourlyRate);
      }
    });
  }
  
  // NEW: Check for initial page intervention
  async function checkInitialIntervention() {
    // First, check if we're on a cart page
    if (isCartPage()) {
      console.log('Vinegar: On cart page, triggering cart intervention');
      // We're on a cart page, trigger time intervention directly
      triggerCartIntervention(true, null);
    } else {
      console.log('Vinegar: Not on cart page, checking for visit intervention');
      // Not on cart page, check for visit intervention
      chrome.runtime.sendMessage({
        action: 'checkIntervention',
        url: window.location.href,
        isCartPage: false
      }, (response) => {
        if (response && response.shouldIntervene && response.interventionType === 'visit') {
          // Site visit = breathing intervention
          showBreathingIntervention();
        }
      });
    }
  }
  
  // Hide aggressive popups/overlays immediately
  function hideAggressiveElements() {
    // Create a style element to hide common popup selectors
    const style = document.createElement('style');
    style.id = 'vinegar-popup-blocker';
    style.textContent = `
      /* More specific popup/modal selectors to avoid breaking image galleries */
      .popup-wrapper:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .modal-wrapper:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .modal-backdrop:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .overlay-wrapper:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .promo-popup:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .discount-popup:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .newsletter-popup:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .newsletter-modal:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .subscribe-popup:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .subscribe-modal:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      
      /* More specific ID selectors */
      #popup-wrapper:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      #modal-wrapper:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      #promo-popup:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      #newsletter-popup:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      
      /* Specific vendor selectors */
      .ltkmodal-window,
      .ltkmodal-overlay,
      .ReactModal__Overlay:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .ReactModal__Content:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      .fancybox-overlay,
      .mfp-bg,
      .mfp-wrap,
      .pum-overlay,
      .popmake-overlay,
      
      /* Common third-party popup services */
      .privy-popup-container,
      .privy-modal,
      #attentive_overlay,
      .attentive-banner,
      .klaviyo-form,
      .klaviyo-modal,
      
      /* Only target z-index warriors with specific popup-like classes */
      [class*="popup"][style*="z-index: 9999"]:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      [class*="modal"][style*="z-index: 9999"]:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      [class*="promo"][style*="z-index: 9999"]:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay),
      [class*="newsletter"][style*="z-index: 9999"]:not(.vinegar-breathing-overlay):not(.vinegar-time-overlay) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      /* Ensure body is not locked */
      body.modal-open,
      body.popup-open,
      body.overlay-open,
      body.no-scroll,
      html.modal-open,
      html.popup-open,
      html.overlay-open,
      html.no-scroll {
        overflow: auto !important;
        position: static !important;
      }
    `;
    
    // Inject at the very beginning of head
    if (document.head) {
      document.head.insertBefore(style, document.head.firstChild);
    } else {
      // If head doesn't exist yet, wait for it
      const observer = new MutationObserver((mutations, obs) => {
        if (document.head) {
          document.head.insertBefore(style, document.head.firstChild);
          obs.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  
  // Call this immediately
  hideAggressiveElements();
  
  // Enhanced mutation observer to catch new popups
  function watchForPopups() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if it's a popup with more specific criteria
            const isPopup = (
              node.classList && (
                node.classList.contains('popup-wrapper') ||
                node.classList.contains('modal-wrapper') ||
                node.classList.contains('promo-popup') ||
                node.classList.contains('newsletter-popup') ||
                node.classList.contains('privy-popup-container') ||
                node.classList.contains('klaviyo-form')
              )
            );
            
            // If it's a popup and not ours, hide it
            if (isPopup && !node.classList.contains('vinegar-breathing-overlay') && 
                !node.classList.contains('vinegar-time-overlay')) {
              node.style.display = 'none';
              node.style.visibility = 'hidden';
              node.style.opacity = '0';
              node.style.pointerEvents = 'none';
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Start watching for popups as soon as body is available
  if (document.body) {
    watchForPopups();
  } else {
    const bodyObserver = new MutationObserver((mutations, obs) => {
      if (document.body) {
        watchForPopups();
        obs.disconnect();
      }
    });
    bodyObserver.observe(document.documentElement, { childList: true });
  }
  
  // Create breathing particles
  function createBreathingParticles(container, phase) {
    const particleCount = 12;
    const centerX = 150; // Center of 300px orb
    const centerY = 150;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = `vinegar-breath-particle ${phase}`;
      
      // Calculate position around the orb
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = phase === 'inhale' ? 180 : 120;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      
      // Set CSS variables for animation endpoints
      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      
      // Position at center
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      
      container.appendChild(particle);
      
      // Remove particle after animation
      setTimeout(() => particle.remove(), 4000);
    }
  }
  
  // Breathing intervention - Visual Only
  function showBreathingIntervention() {
    removeCurrentIntervention();
    injectCSS('breathing');
    
    const overlay = createOverlay('vinegar-breathing-overlay');
    
    // Mindfulness quotes for the primer
   // const quotes = [
     // {
       // text: "Between stimulus and response there is a space. In that space is our power to choose.",
       // author: "Viktor Frankl"
      // },
      // {
        // text: "The best time to plant a tree was 20 years ago. The second best time is now.",
        // author: "Chinese Proverb"
      // },
      // {
        // text: "He who knows he has enough is rich.",
       // author: "Lao Tzu"
      // },
      // {
        //  text: "The secret of happiness is not found in seeking more, but in developing the capacity to enjoy less.",
       // author: "Socrates"
      // },
     // {
     //   text: "Wealth consists not in having great possessions, but in having few wants.",
     //   author: "Epictetus"
    //  }
   // ];
    
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    overlay.innerHTML = `
      <div class="vinegar-breathing-container">
        <!-- Timer Ring - Hidden until exercise starts -->
        <div class="vinegar-timer-ring" id="timer-ring">
          <svg class="vinegar-timer-svg">
            <circle cx="30" cy="30" r="30" class="vinegar-timer-circle"></circle>
            <circle cx="30" cy="30" r="30" class="vinegar-timer-progress" id="timer-progress"></circle>
          </svg>
          <span class="vinegar-timer-text" id="timer-text">1:00</span>
        </div>
        
        <!-- Intro Screen with Quote -->
        <div class="vinegar-breathing-intro" id="breathing-intro">
          <div class="vinegar-quote">
            "${randomQuote.text}"
            <span class="vinegar-quote-author">— ${randomQuote.author}</span>
          </div>
          <h2>Take a moment to pause<br>before you purchase</h2>
          <button class="vinegar-start-button" id="start-breathing">Begin breathing exercise</button>
        </div>
        
        <!-- Countdown -->
        <div class="vinegar-countdown" id="countdown"></div>
        
        <!-- Breathing Exercise -->
        <div class="vinegar-breathing-wrapper" id="breathing-wrapper">
          <!-- Environmental elements -->
          <div class="vinegar-environment">
            <div class="vinegar-float vinegar-float-1"></div>
            <div class="vinegar-float vinegar-float-2"></div>
            <div class="vinegar-float vinegar-float-3"></div>
          </div>
          
          <!-- Central Orb - now static -->
          <div class="vinegar-breathing-orb" id="breathing-orb-container">
            <div class="vinegar-orb-outer-glow" id="outer-glow"></div>
            <div class="vinegar-orb-inner-glow" id="inner-glow"></div>
            <div class="vinegar-orb-core" id="breathing-orb">
              <div class="vinegar-breathing-guide">
                <span class="vinegar-breathing-text" id="breathing-text">BREATHE</span>
                <span class="vinegar-breathing-counter" id="breathing-counter">4</span>
              </div>
              <div class="vinegar-orb-pulse" id="orb-pulse"></div>
            </div>
          </div>
          
          <!-- Phase Progress Ring -->
          <div class="vinegar-phase-ring">
            <svg class="vinegar-phase-svg">
              <circle cx="60" cy="60" r="60" class="vinegar-phase-bg"></circle>
              <circle cx="60" cy="60" r="60" class="vinegar-phase-progress" id="phase-progress"></circle>
            </svg>
          </div>
        </div>
        
        <!-- Complete Screen -->
        <div class="vinegar-breathing-complete" id="breathing-complete">
          <h3>Well done. You paused.</h3>
          <p class="vinegar-complete-subtitle">Now, let's think clearly:</p>
          
          <div class="vinegar-reflection-list">
            <div class="vinegar-reflection-item">
              <div class="vinegar-reflection-dot"></div>
              <div>Do you need this, or do you want the feeling it promises?</div>
            </div>
            <div class="vinegar-reflection-item">
              <div class="vinegar-reflection-dot"></div>
              <div>Will this simplify your life or add complexity?</div>
            </div>
            <div class="vinegar-reflection-item">
              <div class="vinegar-reflection-dot"></div>
              <div>What could you create with the time this purchase costs?</div>
            </div>
            <div class="vinegar-reflection-item">
              <div class="vinegar-reflection-dot"></div>
              <div>Will you remember this purchase in a year?</div>
            </div>
          </div>
          
          <div class="vinegar-breathing-actions">
            <button class="vinegar-breathing-btn vinegar-breathing-btn-leave" id="leave-site-complete">
              I choose differently
            </button>
            <button class="vinegar-breathing-btn vinegar-breathing-btn-continue" id="continue-shopping-complete">
              Continue mindfully
            </button>
          </div>
        </div>
        
        <!-- Skip Screen -->
        <div class="vinegar-breathing-skip" id="breathing-skip">
          <h3>Rushing past the pause?</h3>
          <p class="vinegar-skip-subtitle">That urgency you feel? That's exactly why you need this.</p>
          
          <div class="vinegar-skip-reasons">
            <div class="vinegar-skip-reason">
              Impulse drives 40% of e-commerce. Don't be a statistic.
            </div>
            <div class="vinegar-skip-reason">
              One minute now saves hours of regret later.
            </div>
            <div class="vinegar-skip-reason">
              Your future self is asking for just 60 seconds.
            </div>
            <div class="vinegar-skip-reason">
              Every pause is a victory over consumer culture.
            </div>
          </div>
          
          <div class="vinegar-breathing-actions">
            <button class="vinegar-breathing-btn vinegar-breathing-btn-retry" id="retry-breathing">
              I'll try the exercise
            </button>
            <button class="vinegar-breathing-btn vinegar-breathing-btn-leave" id="leave-site-skip">
              Leave this site
            </button>
            <button class="vinegar-breathing-btn vinegar-breathing-btn-continue" id="continue-shopping-skip">
              Skip anyway
            </button>
          </div>
        </div>
        
        <!-- Skip button -->
        <button class="vinegar-skip-breathing" id="skip-breathing">
          Skip exercise
        </button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    currentIntervention = overlay;
    
    // Add event listeners
    document.getElementById('start-breathing').addEventListener('click', startCountdown);
    document.getElementById('leave-site-complete').addEventListener('click', () => handleDecision('left'));
    document.getElementById('continue-shopping-complete').addEventListener('click', () => handleDecision('continued'));
    document.getElementById('leave-site-skip').addEventListener('click', () => handleDecision('left'));
    document.getElementById('continue-shopping-skip').addEventListener('click', () => handleDecision('continued'));
    document.getElementById('retry-breathing').addEventListener('click', retryBreathing);
    document.getElementById('skip-breathing').addEventListener('click', skipBreathing);
    
    // Animate in
    requestAnimationFrame(() => overlay.classList.add('show'));
  }
  
  // Start countdown before breathing
  function startCountdown() {
    const intro = document.getElementById('breathing-intro');
    const countdownEl = document.getElementById('countdown');
    
    intro.style.display = 'none';
    countdownEl.style.display = 'block';
    
    let count = 5;
    countdownEl.textContent = count;
    
    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownEl.textContent = count;
        // Trigger animation
        countdownEl.style.animation = 'none';
        void countdownEl.offsetHeight; // Force reflow
        countdownEl.style.animation = 'countdownPulse 1s ease';
      } else {
        clearInterval(countInterval);
        countdownEl.style.display = 'none';
        startBreathingExercise();
      }
    }, 1000);
  }
  
  // Skip breathing exercise
  function skipBreathing() {
    // Clear any running intervals
    if (breathingInterval) {
      clearInterval(breathingInterval);
      breathingInterval = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    // Hide all screens except skip screen
    document.getElementById('breathing-wrapper').style.display = 'none';
    document.getElementById('timer-ring').style.display = 'none';
    document.getElementById('timer-ring').classList.remove('active');
    document.getElementById('skip-breathing').style.display = 'none';
    document.getElementById('breathing-complete').style.display = 'none';
    document.getElementById('breathing-intro').style.display = 'none';
    document.getElementById('countdown').style.display = 'none';
    document.getElementById('breathing-skip').style.display = 'block';
  }
  
  // Retry breathing from skip screen
  function retryBreathing() {
    document.getElementById('breathing-skip').style.display = 'none';
    document.getElementById('breathing-intro').style.display = 'block';
  }
  
  // Time intervention - REDESIGNED TO MATCH BREATHING AESTHETIC
  function showTimeIntervention(hourlyRate) {
    removeCurrentIntervention();
    injectCSS('time');
    
    const overlay = createOverlay('vinegar-time-overlay');
    
    // Create container
    overlay.innerHTML = `<div class="vinegar-time-container"></div>`;
    document.body.appendChild(overlay);
    currentIntervention = overlay;
    
    // Animate in
    requestAnimationFrame(() => overlay.classList.add('show'));
    
    // Show detecting state
    const container = document.querySelector('.vinegar-time-container');
    container.innerHTML = `
      <div class="vinegar-time-detecting">
        <div class="vinegar-time-orb">
          <div class="vinegar-orb-ring vinegar-orb-ring-1"></div>
          <div class="vinegar-orb-ring vinegar-orb-ring-2"></div>
          <div class="vinegar-orb-ring vinegar-orb-ring-3"></div>
          <div class="vinegar-orb-center">
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
        <p class="vinegar-detecting-text">Reading your cart...</p>
      </div>
    `;
    
    // Start detection after a brief pause to let page settle
    setTimeout(() => {
      detectCartWithRetries(hourlyRate);
    }, 500);
  }
  
  // Enhanced cart detection with more attempts and methods
  async function detectCartWithRetries(hourlyRate, retries = 0) {
    cartDetectionAttempts = retries;
    
    // Log for debugging
    console.log(`Vinegar: Detection attempt ${retries + 1}`);
    
    const cartAmount = await getEnhancedCartTotal();
    
    if (cartAmount > 0) {
      // Success! Show the result
      console.log('Vinegar: Cart detected with amount:', cartAmount);
      showTimeResult(cartAmount, hourlyRate);
    } else if (retries < MAX_DETECTION_ATTEMPTS) {
      // Update detecting text with progress
      const detectingText = document.querySelector('.vinegar-detecting-text');
      if (detectingText) {
        const messages = [
          'Reading your cart...',
          'Scanning the page...',
          'Looking for totals...',
          'Checking cart data...',
          'Almost there...',
          'Taking a closer look...',
          'Searching for amounts...',
          'One more moment...'
        ];
        detectingText.textContent = messages[Math.min(retries, messages.length - 1)];
      }
      
      // Wait and retry
      setTimeout(() => {
        detectCartWithRetries(hourlyRate, retries + 1);
      }, DETECTION_DELAY);
    } else {
      // All retries failed, show manual input with better design
      console.log('Vinegar: Auto-detection failed, showing manual input');
      showEnhancedManualInput(hourlyRate);
    }
  }
  
  // Enhanced manual cart input matching our aesthetic
  function showEnhancedManualInput(hourlyRate) {
    const container = document.querySelector('.vinegar-time-container');
    container.innerHTML = `
      <div class="vinegar-time-manual">
        <div class="vinegar-time-question">
          <h2>What's the damage?</h2>
          <p>Enter your cart total</p>
        </div>
        
        <div class="vinegar-time-input-group">
          <div class="vinegar-amount-field">
            <span class="vinegar-currency-symbol">$</span>
            <input type="number" 
                   class="vinegar-amount-input" 
                   id="manual-cart-amount"
                   placeholder="0"
                   step="0.01"
                   min="0"
                   autofocus>
          </div>
        </div>
        
        <div class="vinegar-quick-buttons">
          <button class="vinegar-quick-btn" data-amount="50">$50</button>
          <button class="vinegar-quick-btn" data-amount="100">$100</button>
          <button class="vinegar-quick-btn" data-amount="250">$250</button>
          <button class="vinegar-quick-btn" data-amount="500">$500</button>
        </div>
        
        <button class="vinegar-calculate-btn" id="calculate-time">
          Show me the time
        </button>
      </div>
    `;
    
    // Focus on input with slight delay for animation
    setTimeout(() => {
      const input = document.getElementById('manual-cart-amount');
      if (input) input.focus();
    }, 300);
    
    // Quick amount buttons
    document.querySelectorAll('.vinegar-quick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = e.target.dataset.amount;
        document.getElementById('manual-cart-amount').value = amount;
        // Auto-trigger calculation for smooth UX
        setTimeout(() => {
          document.getElementById('calculate-time').click();
        }, 200);
      });
    });
    
    // Calculate button
    document.getElementById('calculate-time').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('manual-cart-amount').value) || 0;
      if (amount > 0) {
        showTimeResult(amount, hourlyRate);
      } else {
        // Shake the input if empty
        const inputGroup = document.querySelector('.vinegar-amount-field');
        inputGroup.classList.add('shake');
        setTimeout(() => inputGroup.classList.remove('shake'), 500);
      }
    });
    
    // Enter key support
    document.getElementById('manual-cart-amount').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('calculate-time').click();
      }
    });
  }
  
  // Enhanced cart total detection with site-specific logic
  async function getEnhancedCartTotal() {
    const domain = window.location.hostname;
    const url = window.location.href;
    let total = 0;
    
    // Log current URL for debugging
    console.log('Vinegar: Detecting cart on URL:', url);
    console.log('Vinegar: Domain:', domain);
    
    // Wait a moment for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use site-specific patterns if available
    if (cartPatterns && cartPatterns.selectors) {
      // Try each selector
      for (const selector of cartPatterns.selectors) {
        const elements = document.querySelectorAll(selector);
        for (const elem of elements) {
          // Look for price in the element or its children
          const priceText = elem.textContent || '';
          const price = extractPrice(priceText);
          if (price > total) {
            total = price;
            console.log(`Vinegar: Found price ${price} with selector: ${selector}`);
          }
          
          // Also check child elements
          const priceChildren = elem.querySelectorAll('[class*="price"], [class*="total"], [class*="amount"]');
          for (const child of priceChildren) {
            const childPrice = extractPrice(child.textContent);
            if (childPrice > total) {
              total = childPrice;
              console.log(`Vinegar: Found price ${childPrice} in child element`);
            }
          }
        }
      }
    }
    
    // If no total found, try generic methods
    if (total === 0) {
      total = total || getCartBySelectors();
      total = total || getCartByTextPattern();
      total = total || getCartByDataAttributes();
      total = total || getCartByAriaLabels();
    }
    
    console.log('Vinegar: Cart total detected:', total);
    return total;
  }
  
  // Generic detection by selectors
  function getCartBySelectors() {
    let total = 0;
    
    // Generic selectors that work across many sites
    const selectors = [
      '[class*="total"][class*="price"]',
      '[class*="cart-total"]',
      '[class*="order-total"]',
      '[class*="subtotal"]',
      '[data-test*="total"]',
      '[data-testid*="total"]',
      '.total-price',
      '.cart-total',
      '.order-total',
      '.subtotal',
      // More specific patterns
      '[class*="summary"] [class*="total"]',
      '[class*="cart"] [class*="total"]',
      '[class*="checkout"] [class*="total"]'
    ];
    
    for (const selector of selectors) {
      const elems = document.querySelectorAll(selector);
      for (const elem of elems) {
        const price = extractPrice(elem.textContent);
        if (price > total) total = price;
      }
    }
    
    return total;
  }
  
  // Detection by text patterns
  function getCartByTextPattern() {
    let total = 0;
    
    // Look for price patterns near "total" text
    const allElements = document.querySelectorAll('*');
    for (const elem of allElements) {
      const text = elem.textContent || '';
      if (text.toLowerCase().includes('total') && text.includes('$')) {
        const price = extractPrice(text);
        if (price > total && price < 100000) {
          total = price;
        }
      }
    }
    
    return total;
  }
  
  // Detection by data attributes
  function getCartByDataAttributes() {
    let total = 0;
    
    const dataAttrs = [
      '[data-price]',
      '[data-total]',
      '[data-amount]',
      '[data-value]',
      '[data-cart-total]',
      '[data-order-total]',
      '[data-subtotal]'
    ];
    
    for (const attr of dataAttrs) {
      const elems = document.querySelectorAll(attr);
      for (const elem of elems) {
        const attrMatch = attr.match(/\[(data-[^\]]+)\]/);
        if (attrMatch) {
          const attrName = attrMatch[1];
          const value = elem.getAttribute(attrName);
          if (value) {
            const price = extractPrice(value);
            if (price > total) total = price;
          }
        }
        
        const textPrice = extractPrice(elem.textContent);
        if (textPrice > total) total = textPrice;
      }
    }
    
    return total;
  }
  
  // Detection by ARIA labels
  function getCartByAriaLabels() {
    let total = 0;
    
    const ariaSelectors = [
      '[aria-label*="total"]',
      '[aria-label*="Total"]',
      '[aria-label*="subtotal"]',
      '[aria-label*="Subtotal"]',
      '[aria-describedby*="total"]',
      '[aria-labelledby*="total"]'
    ];
    
    for (const selector of ariaSelectors) {
      const elems = document.querySelectorAll(selector);
      for (const elem of elems) {
        const ariaLabel = elem.getAttribute('aria-label') || '';
        const textContent = elem.textContent || '';
        
        const ariaPrice = extractPrice(ariaLabel);
        const textPrice = extractPrice(textContent);
        
        const price = Math.max(ariaPrice, textPrice);
        if (price > total) total = price;
      }
    }
    
    return total;
  }
  
  // Helper function to extract price from text
  function extractPrice(text) {
    if (!text) return 0;
    
    // Clean the text
    text = text.replace(/\s+/g, ' ').trim();
    
    // Try multiple price patterns
    const patterns = [
      /\$\s*([\d,]+\.?\d*)/,
      /USD\s*([\d,]+\.?\d*)/i,
      /([\d,]+\.?\d*)\s*(?:dollars?|USD)/i,
      /([\d,]+\.\d{2})/,
      /([\d,]+)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        // Sanity check - cart totals are typically between $1 and $100,000
        if (price >= 1 && price <= 100000) {
          return price;
        }
      }
    }
    
    return 0;
  }
  
  // Show time calculation result
  function showTimeResult(amount, hourlyRate) {
    const hours = amount / hourlyRate;
    const days = hours / 8; // 8-hour workday
    const weeks = days / 5; // 5-day workweek
    
    let timeDisplay;
    let timeUnit;
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      timeDisplay = minutes;
      timeUnit = minutes === 1 ? 'minute' : 'minutes';
    } else if (hours < 8) {
      timeDisplay = hours.toFixed(1);
      timeUnit = 'hours';
    } else if (days < 5) {
      timeDisplay = days.toFixed(1);
      timeUnit = 'days';
    } else {
      timeDisplay = weeks.toFixed(1);
      timeUnit = 'weeks';
    }
    
    const container = document.querySelector('.vinegar-time-container');
    container.innerHTML = `
      <div class="vinegar-time-reveal">
        <!-- Meditation orb similar to breathing -->
        <div class="vinegar-result-orb">
          <div class="vinegar-orb-ring vinegar-orb-ring-1"></div>
          <div class="vinegar-orb-ring vinegar-orb-ring-2"></div>
          <div class="vinegar-orb-ring vinegar-orb-ring-3"></div>
          <div class="vinegar-orb-center warning">
            <span class="vinegar-time-number">${timeDisplay}</span>
          </div>
        </div>
        
        <div class="vinegar-time-message">
          <h2>${timeUnit} of your life</h2>
          <p>for items in a digital cart</p>
        </div>
        
        <!-- Visual context -->
        <div class="vinegar-time-context-grid">
          <div class="vinegar-context-item">
            <div class="vinegar-context-value">${hours.toFixed(1)}</div>
            <div class="vinegar-context-label">hours of work</div>
          </div>
          ${days >= 0.5 ? `
            <div class="vinegar-context-item">
              <div class="vinegar-context-value">${days.toFixed(1)}</div>
              <div class="vinegar-context-label">days of freedom</div>
            </div>
          ` : ''}
          ${hours >= 10 ? `
            <div class="vinegar-context-item">
              <div class="vinegar-context-value">${Math.floor(hours / 10)}</div>
              <div class="vinegar-context-label">books you could read</div>
            </div>
          ` : ''}
        </div>
        
        <!-- Actions with clear hierarchy -->
        <div class="vinegar-time-actions">
          <button class="vinegar-action-primary" id="save-time">
            Keep my time
          </button>
          <button class="vinegar-action-secondary" id="spend-time">
            Trade it anyway
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('save-time').addEventListener('click', () => {
      // Send time saved to background
      chrome.runtime.sendMessage({
        action: 'timeSaved',
        hours: hours,
        amount: amount
      });
      handleDecision('left');
    });
    
    document.getElementById('spend-time').addEventListener('click', () => handleDecision('continued'));
  }
  
  // Enhanced breathing exercise - Fixed timing
  function startBreathingExercise() {
    document.getElementById('breathing-intro').style.display = 'none';
    document.getElementById('breathing-wrapper').style.display = 'flex';
    
    // Show timer
    const timerRing = document.getElementById('timer-ring');
    const timerProgress = document.getElementById('timer-progress');
    const timerText = document.getElementById('timer-text');
    timerRing.style.display = 'block';
    timerRing.classList.add('active');
    
    // Show skip button after delay
    const skipButton = document.getElementById('skip-breathing');
    skipButton.style.display = 'block';
    setTimeout(() => {
      skipButton.classList.add('show');
    }, 2000);
    
    const orb = document.getElementById('breathing-orb');
    const orbContainer = document.getElementById('breathing-orb-container');
    const text = document.getElementById('breathing-text');
    const counter = document.getElementById('breathing-counter');
    const phaseProgress = document.getElementById('phase-progress');
    const outerGlow = document.getElementById('outer-glow');
    const innerGlow = document.getElementById('inner-glow');
    const orbPulse = document.getElementById('orb-pulse');
    
    let totalTime = 60; // 1 minute
    let exerciseComplete = false;
    let currentPhaseTimeout = null;
    
    const phases = [
      { text: 'INHALE', class: 'inhale', duration: 4000 },
      { text: 'HOLD', class: 'hold', duration: 4000 },
      { text: 'EXHALE', class: 'exhale', duration: 4000 },
      { text: 'HOLD', class: 'hold', duration: 4000 }
    ];
    
    // Start timer animation
    timerProgress.style.transition = 'stroke-dashoffset 60s linear';
    timerProgress.style.strokeDashoffset = '0';
    
    // Update timer text
    timerInterval = setInterval(() => {
      totalTime--;
      const minutes = Math.floor(totalTime / 60);
      const seconds = totalTime % 60;
      timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (totalTime <= 0 && !exerciseComplete) {
        exerciseComplete = true;
        clearInterval(timerInterval);
        // Clear any pending phase timeout
        if (currentPhaseTimeout) {
          clearTimeout(currentPhaseTimeout);
        }
        breathingInterval = null;
        completeBreathingExercise();
      }
    }, 1000);
    
    // Store interval globally so we can clear it on skip
    breathingInterval = timerInterval;
    
    function runPhase(phaseIndex) {
      // Check if we should stop
      if (exerciseComplete || totalTime <= 0) {
        return;
      }
      
      const phase = phases[phaseIndex];
      
      // Update orb state (for text styling)
      text.textContent = phase.text;
      orb.className = 'vinegar-orb-core ' + phase.class;
      
      // Animate glows
      if (phase.class === 'inhale') {
        outerGlow.classList.add('bright');
        innerGlow.classList.add('bright');
        // Create expanding particles
        createBreathingParticles(orbContainer, 'inhale');
        // Pulse ring
        orbPulse.classList.remove('active');
        void orbPulse.offsetHeight;
        orbPulse.classList.add('active');
      } else if (phase.class === 'exhale') {
        outerGlow.classList.remove('bright');
        innerGlow.classList.remove('bright');
        // Create contracting particles
        createBreathingParticles(orbContainer, 'exhale');
      }
      
      // Reset and animate phase progress
      phaseProgress.classList.remove('active');
      phaseProgress.style.transition = 'none';
      phaseProgress.style.strokeDashoffset = '377';
      
      // Force reflow
      void phaseProgress.offsetHeight;
      
      // Set transition duration to match phase
      phaseProgress.style.transition = `stroke-dashoffset ${phase.duration}ms linear`;
      
      setTimeout(() => {
        phaseProgress.classList.add('active');
      }, 50);
      
      // Count down for each phase
      let phaseTime = 4;
      counter.textContent = phaseTime;
      
      const phaseCountdown = setInterval(() => {
        phaseTime--;
        if (phaseTime > 0 && !exerciseComplete) {
          counter.textContent = phaseTime;
        } else {
          clearInterval(phaseCountdown);
        }
      }, 1000);
      
      // Set timeout for next phase
      currentPhaseTimeout = setTimeout(() => {
        if (!exerciseComplete && totalTime > 0) {
          const nextPhase = (phaseIndex + 1) % phases.length;
          runPhase(nextPhase);
        }
      }, phase.duration);
    }
    
    // Start the exercise
    runPhase(0);
  }
  
  function completeBreathingExercise() {
    // Hide exercise elements
    document.getElementById('breathing-wrapper').style.display = 'none';
    document.getElementById('timer-ring').style.display = 'none';
    document.getElementById('timer-ring').classList.remove('active');
    document.getElementById('skip-breathing').style.display = 'none';
    
    // Show completion screen
    document.getElementById('breathing-complete').style.display = 'block';
  }
  
  // Handle user decision
  function handleDecision(decision) {
    if (decision === 'left') {
      showSuccessMessage();
      
      setTimeout(() => {
        // Option 1: Close the tab (most graceful)
        // Note: This only works if the tab was opened by script
        window.close();
        
        // Fallback: Navigate to a beautiful landing page
        // Could be chrome://newtab or a custom Vinegar success page
        setTimeout(() => {
          // If window.close() didn't work (it often doesn't)
          chrome.runtime.sendMessage({ action: 'closeOrRedirect' });
        }, 100);
      }, 3000);
    } else {
      removeCurrentIntervention();
    }
  }
  
  // Show success message
  function showSuccessMessage() {
    if (currentIntervention) {
      currentIntervention.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000;">
          <div style="text-align: center; padding: 60px;">
            <h2 style="font-size: 72px; margin-bottom: 24px; font-weight: 200; color: #FFF; letter-spacing: -2px;">Well done.</h2>
            <p style="font-size: 24px; color: rgba(255,255,255,0.6); font-weight: 300;">Your future self thanks you.</p>
          </div>
        </div>
      `;
    }
  }
  
  // Helper functions
  function createOverlay(className) {
    const overlay = document.createElement('div');
    overlay.className = className;
    // CRITICAL: Don't set these inline styles that block pointer events
    return overlay;
  }
  
  function removeCurrentIntervention() {
    if (currentIntervention) {
      currentIntervention.remove();
      currentIntervention = null;
    }
  }
  
  function injectCSS(type) {
    const cssId = `vinegar-${type}-styles`;
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL(`${type}.css`);
      document.head.appendChild(link);
    }
  }
  
  // Initialize cart monitoring and check for interventions
  async function initialize() {
    // Load cart patterns first
    await loadCartPatterns();
    
    // Start cart monitoring
    await initializeCartMonitoring();
    
    // Check for initial intervention
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkInitialIntervention, 3000); // Wait 3 seconds after DOM ready
      });
    } else {
      // DOM already loaded, wait a bit for dynamic content
      setTimeout(checkInitialIntervention, 3000);
    }
  }
  
  // Start initialization
  initialize();
  
  // Listen for navigation changes (SPAs)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('Vinegar: URL changed to:', lastUrl);
      
      // Reload cart patterns for new page
      loadCartPatterns().then(() => {
        // Check if this is a cart/checkout URL
        if (isCartPage()) {
          // Trigger cart intervention directly
          triggerCartIntervention(true, null);
        } else {
          // Check for visit intervention
          setTimeout(checkInitialIntervention, 3000);
        }
      });
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['href']
  });
  
  // Also listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      loadCartPatterns().then(() => {
        checkInitialIntervention();
      });
    }, 2000);
  });
})();