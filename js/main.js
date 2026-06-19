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
  const navLinks = document.querySelectorAll('.nav-links a:not(.btn-whatsapp-nav)');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || 
        (currentPage === 'index.html' && (href === '#' || href === 'index.html'))) {
      link.classList.add('active');
    }
  });

  // ============================================
  // MOBILE NAVIGATION - FIXED
  // ============================================
  const hamburger = document.querySelector('.hamburger');
  const navLinksContainer = document.querySelector('.nav-links');

  if (hamburger && navLinksContainer) {
    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = navLinksContainer.classList.toggle('mobile-open');
      this.classList.toggle('active');
      this.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when clicking a link
    navLinksContainer.querySelectorAll('a, .mobile-logo').forEach(el => {
      el.addEventListener('click', function() {
        navLinksContainer.classList.remove('mobile-open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      const nav = document.querySelector('nav');
      if (nav && !nav.contains(e.target)) {
        navLinksContainer.classList.remove('mobile-open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ============================================
  // SMOOTH SCROLL FOR INTERNAL LINKS
  // ============================================
  document.querySelectorAll('a[href^="#"]:not(.modal-trigger)').forEach(anchor => {
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

  // ============================================
  // QUOTE MODAL FUNCTIONALITY
  // ============================================

  // Modal triggers
  document.querySelectorAll('.modal-trigger').forEach(trigger => {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      const modal = document.getElementById('quote-modal');
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Focus first input
        setTimeout(() => {
          const firstInput = modal.querySelector('input:not([type="hidden"])');
          if (firstInput) firstInput.focus();
        }, 300);
      }
    });
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close, .modal-close-success').forEach(btn => {
    btn.addEventListener('click', function() {
      closeModal();
    });
  });

  // Close modal on overlay click
  const modal = document.getElementById('quote-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  function closeModal() {
    const modal = document.getElementById('quote-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      // Reset form if success was shown
      const form = document.getElementById('quoteForm');
      const success = document.getElementById('quoteSuccess');
      if (form) form.style.display = 'block';
      if (success) success.style.display = 'none';
      // Reset form errors
      document.querySelectorAll('#quoteForm .error').forEach(el => el.classList.remove('error'));
      document.querySelectorAll('#quoteForm .success').forEach(el => el.classList.remove('success'));
      document.querySelectorAll('#quoteForm .error-message.visible').forEach(el => el.classList.remove('visible'));
      // Reset status
      const status = document.getElementById('quoteFormStatus');
      if (status) {
        status.className = 'form-status';
        status.textContent = '';
      }
    }
  }

  // ============================================
  // QUOTE FORM HANDLING - Production Ready
  // ============================================

  const quoteForm = document.getElementById('quoteForm');
  if (quoteForm) {
    // Real-time validation on blur
    const validateField = {
      name: function(value) {
        return value.trim().length >= 2;
      },
      email: function(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
      },
      phone: function(value) {
        return /^[0-9+\s\-()]{10,15}$/.test(value.trim());
      },
      message: function(value) {
        return value.trim().length >= 10;
      }
    };

    document.querySelectorAll('#quoteForm input, #quoteForm textarea').forEach(input => {
      input.addEventListener('blur', function() {
        const fieldName = this.id.replace('quote', '').toLowerCase();
        const validator = validateField[fieldName];
        const errorEl = document.getElementById(this.id + 'Error');
        
        if (validator && errorEl) {
          const isValid = validator(this.value);
          if (this.value.trim() && !isValid) {
            this.classList.add('error');
            this.classList.remove('success');
            errorEl.classList.add('visible');
          } else if (this.value.trim() && isValid) {
            this.classList.remove('error');
            this.classList.add('success');
            errorEl.classList.remove('visible');
          } else {
            this.classList.remove('error');
            this.classList.remove('success');
            errorEl.classList.remove('visible');
          }
        }
      });

      input.addEventListener('input', function() {
        // Clear error on typing
        const errorEl = document.getElementById(this.id + 'Error');
        if (errorEl) {
          errorEl.classList.remove('visible');
          this.classList.remove('error');
        }
      });
    });

    // Form submission
    quoteForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const form = this;
      const submitBtn = document.getElementById('quoteSubmit');
      const status = document.getElementById('quoteFormStatus');
      const successDiv = document.getElementById('quoteSuccess');
      
      let isValid = true;
      
      // Name validation
      const name = document.getElementById('quoteName');
      const nameError = document.getElementById('quoteNameError');
      if (name.value.trim().length < 2) {
        name.classList.add('error');
        nameError.classList.add('visible');
        isValid = false;
      } else {
        name.classList.remove('error');
        name.classList.add('success');
        nameError.classList.remove('visible');
      }
      
      // Email validation
      const email = document.getElementById('quoteEmail');
      const emailError = document.getElementById('quoteEmailError');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value.trim())) {
        email.classList.add('error');
        emailError.classList.add('visible');
        isValid = false;
      } else {
        email.classList.remove('error');
        email.classList.add('success');
        emailError.classList.remove('visible');
      }
      
      // Phone validation
      const phone = document.getElementById('quotePhone');
      const phoneError = document.getElementById('quotePhoneError');
      const phoneRegex = /^[0-9+\s\-()]{10,15}$/;
      if (!phoneRegex.test(phone.value.trim())) {
        phone.classList.add('error');
        phoneError.classList.add('visible');
        isValid = false;
      } else {
        phone.classList.remove('error');
        phone.classList.add('success');
        phoneError.classList.remove('visible');
      }
      
      // Message validation
      const message = document.getElementById('quoteMessage');
      const messageError = document.getElementById('quoteMessageError');
      if (message.value.trim().length < 10) {
        message.classList.add('error');
        messageError.classList.add('visible');
        isValid = false;
      } else {
        message.classList.remove('error');
        message.classList.add('success');
        messageError.classList.remove('visible');
      }
      
      // Consent validation
      const consent = document.getElementById('quoteConsent');
      const consentError = document.getElementById('quoteConsentError');
      if (!consent.checked) {
        consentError.classList.add('visible');
        isValid = false;
      } else {
        consentError.classList.remove('visible');
      }
      
      if (!isValid) {
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        // Show error toast
        showToast('Please fix the errors above before submitting.', 'error');
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitBtn.querySelector('span').textContent = 'Submitting...';
      status.className = 'form-status';
      status.textContent = '';
      
      // Collect data
      const formData = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        service: document.getElementById('quoteService').value,
        message: message.value.trim(),
        consent: consent.checked,
        timestamp: new Date().toISOString(),
        source: window.location.href
      };
      
      // Send to backend
      fetch('api/quote.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Show success
          form.style.display = 'none';
          successDiv.style.display = 'block';
          document.getElementById('quoteConfirmEmail').textContent = formData.email;
          document.getElementById('quoteConfirmReference').textContent = 'QTS-' + Date.now().toString().slice(-6);
          
          // Track conversion
          if (window.gtag) {
            gtag('event', 'quote_submission', {
              'service': formData.service,
              'email': formData.email
            });
          }
          
          // Show success toast
          showToast('Quote request submitted successfully!', 'success');
        } else {
          status.className = 'form-status error';
          status.textContent = data.message || 'There was an error. Please try again.';
          showToast(data.message || 'There was an error. Please try again.', 'error');
        }
      })
      .catch(error => {
        console.error('Quote submission error:', error);
        status.className = 'form-status error';
        status.textContent = 'Network error. Please check your connection and try again.';
        showToast('Network error. Please check your connection and try again.', 'error');
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.querySelector('span').textContent = 'Submit Quote Request';
      });
    });
  }

  console.log('✅ GrayTech Systems - All systems ready!');
});