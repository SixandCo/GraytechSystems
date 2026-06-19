// ============================================
// CONTACT FORM - PRODUCTION GRADE WITH CSRF
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');

    if (!form) return;

    // ============================================
    // CSRF TOKEN HANDLING
    // ============================================
    let csrfToken = null;

    // Get CSRF token from meta tag or hidden input
    function getCsrfToken() {
        // Try to get from meta tag first
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }
        
        // Try to get from hidden input
        const inputToken = document.querySelector('input[name="csrf_token"]');
        if (inputToken) {
            return inputToken.value;
        }
        
        return null;
    }

    // Refresh CSRF token after submission
    function refreshCsrfToken() {
        // If using meta tag, fetch new token from server
        fetch('get-csrf-token.php')
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    const metaToken = document.querySelector('meta[name="csrf-token"]');
                    if (metaToken) {
                        metaToken.setAttribute('content', data.token);
                    }
                    const inputToken = document.querySelector('input[name="csrf_token"]');
                    if (inputToken) {
                        inputToken.value = data.token;
                    }
                    csrfToken = data.token;
                }
            })
            .catch(error => console.error('Failed to refresh CSRF token:', error));
    }

    // Get initial CSRF token
    csrfToken = getCsrfToken();

    // ============================================
    // REAL-TIME VALIDATION
    // ============================================
    const fields = {
        name: {
            validate: (val) => val.length >= 2,
            error: 'Please enter your full name (minimum 2 characters)'
        },
        email: {
            validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
            error: 'Please enter a valid email address'
        },
        phone: {
            validate: (val) => /^[0-9+]{10,15}$/.test(val.replace(/[^0-9+]/g, '')),
            error: 'Please enter a valid phone number (10-15 digits)'
        },
        subject: {
            validate: (val) => val !== '' && val !== 'Select a subject...',
            error: 'Please select a subject'
        },
        message: {
            validate: (val) => val.length >= 10,
            error: 'Please enter a message (minimum 10 characters)'
        }
    };

    // Validate individual field on blur
    Object.keys(fields).forEach(fieldName => {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (!input) return;

        input.addEventListener('blur', function() {
            validateField(fieldName, this);
        });

        input.addEventListener('input', function() {
            // Clear error on typing
            const errorEl = document.getElementById(`${fieldName}-error`);
            if (errorEl) {
                errorEl.classList.remove('visible');
                this.classList.remove('error');
                this.classList.remove('success');
            }
        });
    });

    function validateField(fieldName, input) {
        const field = fields[fieldName];
        const errorEl = document.getElementById(`${fieldName}-error`);
        
        if (!field || !errorEl) return;

        const isValid = field.validate(input.value);
        
        if (!isValid && input.value.length > 0) {
            errorEl.textContent = field.error;
            errorEl.classList.add('visible');
            input.classList.add('error');
            input.classList.remove('success');
        } else if (isValid && input.value.length > 0) {
            errorEl.classList.remove('visible');
            input.classList.remove('error');
            input.classList.add('success');
        } else {
            errorEl.classList.remove('visible');
            input.classList.remove('error');
            input.classList.remove('success');
        }

        return isValid;
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate all fields
        let isValid = true;
        Object.keys(fields).forEach(fieldName => {
            const input = form.querySelector(`[name="${fieldName}"]`);
            if (input) {
                const fieldValid = validateField(fieldName, input);
                if (!fieldValid) isValid = false;
            }
        });

        // Check consent
        const consent = document.getElementById('consent');
        if (consent && !consent.checked) {
            isValid = false;
            const consentError = document.getElementById('consent-error');
            if (consentError) {
                consentError.classList.add('visible');
            }
        }

        if (!isValid) {
            formStatus.className = 'form-status error';
            formStatus.textContent = 'Please fix the errors above before submitting.';
            // Scroll to first error
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        formStatus.className = '';
        formStatus.textContent = '';

        // Prepare form data with CSRF token
        const formData = new FormData(form);
        
        // Add CSRF token if available
        if (csrfToken) {
            formData.append('csrf_token', csrfToken);
        }

        // Add consent explicitly
        if (consent) {
            formData.append('consent', consent.checked ? '1' : '0');
        }

        try {
            const response = await fetch('send-contact.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned invalid response');
            }

            const result = await response.json();

            if (result.success) {
                formStatus.className = 'form-status success';
                formStatus.textContent = result.message || 'Thank you! Your message has been sent successfully.';
                form.reset();
                
                // Remove success classes
                document.querySelectorAll('.success').forEach(el => {
                    el.classList.remove('success');
                });
                
                // Clear error states
                document.querySelectorAll('.error').forEach(el => {
                    el.classList.remove('error');
                });
                document.querySelectorAll('.error-message.visible').forEach(el => {
                    el.classList.remove('visible');
                });

                // Show success animation or redirect
                if (result.reference) {
                    // Store reference for thank you page
                    sessionStorage.setItem('contact_reference', result.reference);
                }

                // Refresh CSRF token for next submission
                refreshCsrfToken();

                // Auto-hide success message after 10 seconds
                setTimeout(() => {
                    formStatus.className = '';
                    formStatus.textContent = '';
                }, 10000);

            } else {
                formStatus.className = 'form-status error';
                formStatus.textContent = result.message || 'There was an error. Please try again.';
                
                // Show field errors
                if (result.errors) {
                    Object.keys(result.errors).forEach(fieldName => {
                        const input = form.querySelector(`[name="${fieldName}"]`);
                        const errorEl = document.getElementById(`${fieldName}-error`);
                        if (input && errorEl) {
                            errorEl.textContent = result.errors[fieldName];
                            errorEl.classList.add('visible');
                            input.classList.add('error');
                        }
                    });
                    
                    // Focus on first error field
                    const firstErrorField = form.querySelector('.error');
                    if (firstErrorField) {
                        firstErrorField.focus();
                        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        } catch (error) {
            console.error('Form submission error:', error);
            formStatus.className = 'form-status error';
            
            if (error.message === 'Server returned invalid response') {
                formStatus.textContent = 'Server error. Please try again later.';
            } else {
                formStatus.textContent = 'Network error. Please check your connection and try again.';
            }
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // ============================================
    // CONSENT CHECKBOX VALIDATION
    // ============================================
    const consentCheckbox = document.getElementById('consent');
    const consentError = document.getElementById('consent-error');
    
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', function() {
            if (consentError) {
                if (this.checked) {
                    consentError.classList.remove('visible');
                    this.classList.remove('error');
                    this.classList.add('success');
                } else {
                    this.classList.remove('success');
                }
            }
        });
    }

    // ============================================
    // AUTO-REFRESH CSRF TOKEN (every 30 minutes)
    // ============================================
    setInterval(() => {
        refreshCsrfToken();
    }, 30 * 60 * 1000); // 30 minutes

    console.log('✅ Contact form initialized with CSRF protection');
});