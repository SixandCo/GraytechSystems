// ============================================
// GRAYTECH SYSTEMS - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // ============================================
  // PAGE DETECTION
  // ============================================
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  console.log(`GrayTech Systems - ${currentPage} loaded successfully.`);
  
  // ============================================
  // ACTIVE NAV LINK
  // ============================================
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || 
        (currentPage === 'index.html' && (href === '#' || href === 'index.html'))) {
      link.classList.add('active');
    }
  });

  // ============================================
  // MOBILE NAVIGATION
  // ============================================
  createMobileMenu();

  function createMobileMenu() {
    const nav = document.querySelector('nav');
    const navLinks = document.querySelector('.nav-links');
    
    if (document.querySelector('.hamburger')) return;
    
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.innerHTML = `
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    `;
    
    nav.insertBefore(hamburger, navLinks);
    
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = navLinks.classList.toggle('mobile-open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        navLinks.classList.remove('mobile-open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
    
    document.addEventListener('click', function(e) {
      if (!nav.contains(e.target)) {
        navLinks.classList.remove('mobile-open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ============================================
  // SMOOTH SCROLL FOR INTERNAL LINKS
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const navHeight = document.querySelector('nav').offsetHeight;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ============================================
  // BUTTON INTERACTIONS
  // ============================================
  const quoteButtons = document.querySelectorAll('.btn-quote, .btn-outline');
  quoteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      showToast('Quote form coming soon!');
    });
  });
  
  const coverageButtons = document.querySelectorAll('.btn-primary, .btn-coverage');
  coverageButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      showToast('Coverage checker coming soon!');
    });
  });
  
  const learnButton = document.querySelector('.btn-learn');
  if (learnButton) {
    learnButton.addEventListener('click', function(e) {
      e.preventDefault();
      showToast('Referral program details coming soon!');
    });
  }

  // ============================================
  // WHATSAPP FAB
  // ============================================
  const whatsappFab = document.querySelector('.whatsapp-fab');
  if (whatsappFab) {
    whatsappFab.addEventListener('click', function() {
      const phoneNumber = '27712344476';
      const message = encodeURIComponent('Hi GrayTech Systems, I would like to get a quote.');
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    });
  }

  // ============================================
  // TOAST NOTIFICATION SYSTEM
  // ============================================
  function showToast(message, type = 'info', duration = 3000) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icon = type === 'success' ? '✓' : 
                 type === 'error' ? '✕' : 
                 type === 'warning' ? '⚠' : 'ℹ';
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast-notification {
          position: fixed;
          bottom: 100px;
          right: 28px;
          background: var(--card, #0f1a35);
          color: var(--white, #ffffff);
          padding: 16px 24px;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(59,130,246,0.25));
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 1000;
          max-width: 400px;
          animation: slideUp 0.3s ease-out;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
        }
        .toast-notification.toast-success { border-color: #22c55e; }
        .toast-notification.toast-error { border-color: #ef4444; }
        .toast-notification.toast-warning { border-color: #f59e0b; }
        .toast-icon { font-size: 20px; line-height: 1; }
        .toast-message { flex: 1; }
        .toast-close {
          background: none;
          border: none;
          color: var(--gray, #94a3b8);
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
          transition: color 0.2s;
        }
        .toast-close:hover { color: var(--white, #ffffff); }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(20px) scale(0.95); }
        }
        .toast-notification.hiding { animation: slideDown 0.3s ease-in forwards; }
        @media (max-width: 560px) {
          .toast-notification {
            bottom: 90px;
            right: 20px;
            left: 20px;
            max-width: none;
            padding: 14px 18px;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    const timeout = setTimeout(() => hideToast(toast), duration);
    
    toast.querySelector('.toast-close').addEventListener('click', function() {
      clearTimeout(timeout);
      hideToast(toast);
    });
    
    toast.addEventListener('click', function(e) {
      if (e.target === toast) {
        clearTimeout(timeout);
        hideToast(toast);
      }
    });
  }
  
  function hideToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }

  // ============================================
  // SCROLL-TO-TOP BUTTON
  // ============================================
  createScrollTopButton();

  function createScrollTopButton() {
    if (document.querySelector('.scroll-top')) return;
    
    const button = document.createElement('button');
    button.className = 'scroll-top';
    button.setAttribute('aria-label', 'Scroll to top');
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    `;
    
    document.body.appendChild(button);
    
    if (!document.querySelector('#scroll-top-styles')) {
      const style = document.createElement('style');
      style.id = 'scroll-top-styles';
      style.textContent = `
        .scroll-top {
          position: fixed;
          bottom: 90px;
          right: 28px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--blue-lt, #2563eb);
          color: white;
          border: none;
          cursor: pointer;
          z-index: 150;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.3s, transform 0.3s, background 0.2s;
          box-shadow: 0 4px 20px rgba(37,99,235,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scroll-top.visible { opacity: 1; transform: translateY(0); }
        .scroll-top:hover { background: #1d4ed8; transform: translateY(-2px); }
        @media (max-width: 560px) {
          .scroll-top { bottom: 80px; right: 20px; width: 40px; height: 40px; }
        }
      `;
      document.head.appendChild(style);
    }
    
    window.addEventListener('scroll', function() {
      if (window.scrollY > 300) {
        button.classList.add('visible');
      } else {
        button.classList.remove('visible');
      }
    });
    
    button.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  console.log('✅ GrayTech Systems - All systems ready!');
});