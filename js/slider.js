// ============================================
// CLIENTS & PARTNERS SLIDER - FIXED
// ============================================

class LogoSlider {
    constructor(wrapperSelector, options = {}) {
        this.wrapper = document.querySelector(wrapperSelector);
        if (!this.wrapper) {
            console.warn(`Slider wrapper not found: ${wrapperSelector}`);
            return;
        }

        this.track = this.wrapper.querySelector('.slider-track');
        if (!this.track) {
            console.warn(`Slider track not found in: ${wrapperSelector}`);
            return;
        }

        this.dotsContainer = this.wrapper.querySelector('.slider-dots');
        
        // Find arrows - more specific selectors
        const arrows = this.wrapper.querySelectorAll('.slider-arrow');
        this.prevBtn = arrows[0] || null;
        this.nextBtn = arrows[1] || null;

        // Get all logo items
        this.items = Array.from(this.track.querySelectorAll('.logo-item'));
        this.totalItems = this.items.length;

        // If no items, exit
        if (this.totalItems === 0) {
            console.warn(`No logo items found in: ${wrapperSelector}`);
            return;
        }

        // How many visible at once (responsive)
        this.itemsPerView = this.getItemsPerView();
        this.currentIndex = 0;
        this.autoplayInterval = null;
        this.autoplayDelay = options.autoplayDelay || 4000;
        this.isHovered = false;
        this.isTransitioning = false;

        // Only initialize if we have enough items to slide
        if (this.totalItems <= this.itemsPerView) {
            this.wrapper.style.overflow = 'visible';
            this.track.style.transform = 'none';
            // Hide arrows if not needed
            if (this.prevBtn) this.prevBtn.style.display = 'none';
            if (this.nextBtn) this.nextBtn.style.display = 'none';
            return;
        }

        // Clone items for infinite loop
        this.cloneItems();

        // Build dots
        this.buildDots();

        // Set initial position
        this.updateSlider();

        // Event listeners - with null checks
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.prev();
            });
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.next();
            });
        }

        // Touch support
        this.setupTouch();

        // Responsive - with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newItemsPerView = this.getItemsPerView();
                if (newItemsPerView !== this.itemsPerView) {
                    this.itemsPerView = newItemsPerView;
                    // Rebuild slider
                    this.rebuildSlider();
                }
            }, 250);
        });

        // Pause on hover
        this.wrapper.addEventListener('mouseenter', () => {
            this.isHovered = true;
            this.stopAutoplay();
        });

        this.wrapper.addEventListener('mouseleave', () => {
            this.isHovered = false;
            this.startAutoplay();
        });

        // Start autoplay
        if (options.autoplay !== false) {
            this.startAutoplay();
        }
    }

    getItemsPerView() {
        const width = window.innerWidth;
        if (width >= 1800) return 6;
        if (width >= 1200) return 5;
        if (width >= 992) return 4;
        if (width >= 768) return 3;
        if (width >= 480) return 2;
        return 2;
    }

    cloneItems() {
        // Remove existing clones
        this.track.querySelectorAll('.logo-item-clone').forEach(el => el.remove());

        const clonesNeeded = this.itemsPerView * 2;
        
        // Don't clone if not enough items
        if (this.totalItems <= clonesNeeded) {
            this.allItems = this.items;
            this.totalWithClones = this.totalItems;
            this.realStartIndex = 0;
            this.realEndIndex = this.totalItems - 1;
            return;
        }

        // Clone first few and last few for seamless loop
        const firstClones = this.items.slice(0, clonesNeeded).map(item => {
            const clone = item.cloneNode(true);
            clone.classList.add('logo-item-clone');
            return clone;
        });

        const lastClones = this.items.slice(-clonesNeeded).map(item => {
            const clone = item.cloneNode(true);
            clone.classList.add('logo-item-clone');
            return clone;
        });

        // Prepend last clones, append first clones
        lastClones.reverse().forEach(clone => {
            this.track.prepend(clone);
        });

        firstClones.forEach(clone => {
            this.track.appendChild(clone);
        });

        // Update total items with clones
        this.allItems = Array.from(this.track.querySelectorAll('.logo-item'));
        this.totalWithClones = this.allItems.length;

        // Calculate offset for real items
        this.realStartIndex = clonesNeeded;
        this.realEndIndex = this.realStartIndex + this.totalItems - 1;

        // Set initial position to first real item
        this.currentIndex = this.realStartIndex;
    }

    rebuildSlider() {
        // Save current state
        this.stopAutoplay();
        
        // Reset track position
        this.track.style.transition = 'none';
        this.track.style.transform = 'none';
        
        // Re-clone with new items per view
        this.cloneItems();
        
        // Rebuild dots
        this.buildDots();
        
        // Reset position
        this.currentIndex = this.realStartIndex || 0;
        this.updateSlider();
        
        // Restart autoplay
        if (this.autoplayDelay) {
            this.startAutoplay();
        }
    }

    buildDots() {
        if (!this.dotsContainer) return;
        
        const totalDots = Math.ceil(this.totalItems / this.itemsPerView);
        this.dotsContainer.innerHTML = '';
        
        for (let i = 0; i < totalDots; i++) {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            dot.setAttribute('data-index', i);
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => this.goTo(i));
            this.dotsContainer.appendChild(dot);
        }
        this.dots = Array.from(this.dotsContainer.querySelectorAll('.dot'));
    }

    updateSlider() {
        if (this.isTransitioning) return;
        
        const firstItem = this.allItems[0];
        if (!firstItem) return;
        
        const itemWidth = firstItem.offsetWidth + 24; // width + gap
        const offset = this.currentIndex * itemWidth;
        
        this.track.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        this.track.style.transform = `translateX(-${offset}px)`;

        // Update dots
        if (this.dots && this.dots.length > 0) {
            const totalSlides = Math.ceil(this.totalItems / this.itemsPerView);
            let activeDotIndex = Math.floor(
                (this.currentIndex - (this.realStartIndex || 0)) / this.itemsPerView
            );
            
            // Clamp the dot index
            activeDotIndex = Math.max(0, Math.min(activeDotIndex, totalSlides - 1));
            
            this.dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === activeDotIndex);
            });
        }

        // Handle infinite loop wrapping
        if (this.currentIndex > (this.realEndIndex || this.totalItems)) {
            this.isTransitioning = true;
            setTimeout(() => {
                this.track.style.transition = 'none';
                const jumpIndex = (this.realStartIndex || 0) + 
                    (this.currentIndex - (this.realEndIndex || this.totalItems) - 1) % this.totalItems;
                this.currentIndex = jumpIndex;
                const newOffset = this.currentIndex * itemWidth;
                this.track.style.transform = `translateX(-${newOffset}px)`;
                // Force reflow
                this.track.offsetHeight;
                this.isTransitioning = false;
            }, 500);
        } else if (this.currentIndex < (this.realStartIndex || 0)) {
            this.isTransitioning = true;
            setTimeout(() => {
                this.track.style.transition = 'none';
                const jumpIndex = (this.realEndIndex || this.totalItems - 1) - 
                    ((this.realStartIndex || 0) - this.currentIndex - 1) % this.totalItems;
                this.currentIndex = jumpIndex;
                const newOffset = this.currentIndex * itemWidth;
                this.track.style.transform = `translateX(-${newOffset}px)`;
                // Force reflow
                this.track.offsetHeight;
                this.isTransitioning = false;
            }, 500);
        }
    }

    goTo(dotIndex) {
        if (this.isTransitioning) return;
        
        const targetIndex = (this.realStartIndex || 0) + (dotIndex * this.itemsPerView);
        if (targetIndex > (this.realEndIndex || this.totalItems - 1)) {
            this.currentIndex = (this.realEndIndex || this.totalItems - 1) - 1;
        } else {
            this.currentIndex = targetIndex;
        }
        this.updateSlider();
        this.restartAutoplay();
    }

    next() {
        if (this.isTransitioning) return;
        this.currentIndex += this.itemsPerView;
        this.updateSlider();
        this.restartAutoplay();
    }

    prev() {
        if (this.isTransitioning) return;
        this.currentIndex -= this.itemsPerView;
        this.updateSlider();
        this.restartAutoplay();
    }

    setupTouch() {
        let startX = 0;
        let isDragging = false;

        this.track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.stopAutoplay();
        }, { passive: true });

        this.track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
            this.startAutoplay();
        }, { passive: true });
    }

    startAutoplay() {
        if (this.autoplayInterval) return;
        if (!this.autoplayDelay) return;
        
        this.autoplayInterval = setInterval(() => {
            if (!this.isHovered && !this.isTransitioning) {
                this.next();
            }
        }, this.autoplayDelay);
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }

    restartAutoplay() {
        this.stopAutoplay();
        this.startAutoplay();
    }
}

// Initialize sliders when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if sliders exist before initializing
    const clientsWrapper = document.querySelector('.clients-slider-wrapper');
    const partnersWrapper = document.querySelector('.partners-slider-wrapper');
    
    if (clientsWrapper) {
        try {
            window.clientsSlider = new LogoSlider('.clients-slider-wrapper', {
                autoplay: true,
                autoplayDelay: 4000
            });
        } catch (e) {
            console.warn('Failed to initialize clients slider:', e);
        }
    }
    
    if (partnersWrapper) {
        try {
            window.partnersSlider = new LogoSlider('.partners-slider-wrapper', {
                autoplay: true,
                autoplayDelay: 4500
            });
        } catch (e) {
            console.warn('Failed to initialize partners slider:', e);
        }
    }
});

// Also initialize if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // DOM already loaded, trigger manually
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
}