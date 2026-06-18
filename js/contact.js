// ============================================
// CONTACT FORM - PRODUCTION GRADE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');

    if (!form) return;

    // Real-time validation
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

    // Form submission
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

        if (!isValid) {
            formStatus.className = 'form-status error';
            formStatus.textContent = 'Please fix the errors above before submitting.';
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        formStatus.className = '';

        const formData = new FormData(form);

        try {
            const response = await fetch('send-contact.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                formStatus.className = 'form-status success';
                formStatus.textContent = result.message;
                form.reset();
                
                // Remove success classes
                document.querySelectorAll('.success').forEach(el => {
                    el.classList.remove('success');
                });
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
                }
            }
        } catch (error) {
            formStatus.className = 'form-status error';
            formStatus.textContent = 'Network error. Please check your connection and try again.';
            console.error('Form submission error:', error);
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
});