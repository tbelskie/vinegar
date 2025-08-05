// Vinegar Dashboard - Reflection and Progress

document.addEventListener('DOMContentLoaded', async () => {
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
    updateStats(hoursSaved, daysSaved, interventionsHeeded, streak);
    updateAlternatives(hoursSaved);
    
    // Save visit
    await chrome.storage.local.set({
      lastVisit: today.toISOString(),
      streak: streak,
      interventionsHeeded: interventionsHeeded + 1
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Load random quote
    loadDailyQuote();
    
    // Animate elements on load
    animateOnLoad();
  });
  
  function updateStats(hours, days, interventions, streak) {
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
  
  function updateAlternatives(totalHours) {
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
  
  function loadDailyQuote() {
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
  
  function setupEventListeners() {
    // Close tab / Return to life button
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
  
  function animateOnLoad() {
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