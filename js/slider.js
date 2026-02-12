/**
 * ===================================================================
 * MARTOO TECH WORKS - SLIDER MODULE
 * Version: 2.0.0
 * Features: Testimonials slider, auto-play, touch support, keyboard nav
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 IMMEDIATE SELF-EXECUTING FUNCTION - NO EXPORTS!
// ===================================================================

(function() {
    
    // ===================================================================
    // 🔧 CONFIGURATION
    // ===================================================================
    
    const CONFIG = {
        // Selectors
        selectors: {
            slider: '.testimonial-slider',
            slide: '.testimonial-card',
            prevArrow: '.slider-arrow.prev',
            nextArrow: '.slider-arrow.next',
            dots: '.slider-dots',
            dot: '.slider-dots .dot'
        },
        
        // Default options
        defaults: {
            autoplay: true,
            autoplaySpeed: 5000,
            speed: 500,
            pauseOnHover: true,
            dots: true,
            arrows: true,
            infinite: true,
            touch: true,
            touchThreshold: 50
        },
        
        // CSS classes
        classes: {
            active: 'active',
            disabled: 'disabled',
            paused: 'paused'
        }
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    /**
     * Safe query selector
     */
    const $ = (selector, context = document) => {
        try {
            return context.querySelector(selector);
        } catch {
            return null;
        }
    };

    /**
     * Safe query selector all
     */
    const $$ = (selector, context = document) => {
        try {
            return Array.from(context.querySelectorAll(selector));
        } catch {
            return [];
        }
    };

    /**
     * Debounce function
     */
    const debounce = (func, wait = 100) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    /**
     * Throttle function
     */
    const throttle = (func, limit = 50) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    /**
     * Get element index
     */
    const getIndex = (el) => {
        if (!el) return -1;
        const parent = el.parentNode;
        if (!parent) return -1;
        return Array.from(parent.children).indexOf(el);
    };

    // ===================================================================
    // 🎠 TESTIMONIAL SLIDER
    // ===================================================================
    
    const TestimonialSlider = {
        // Properties
        slider: null,
        slides: [],
        prevBtn: null,
        nextBtn: null,
        dots: [],
        currentIndex: 0,
        slideCount: 0,
        autoplayTimer: null,
        isPaused: false,
        isAnimating: false,
        touchStartX: 0,
        touchEndX: 0,
        touchMoved: false,
        
        /**
         * Initialize slider
         */
        init(sliderElement) {
            this.slider = sliderElement || $(CONFIG.selectors.slider);
            
            if (!this.slider) return false;
            
            // Get elements
            this.slides = $$(CONFIG.selectors.slide, this.slider);
            this.prevBtn = $(CONFIG.selectors.prevArrow);
            this.nextBtn = $(CONFIG.selectors.nextArrow);
            this.dots = $$(CONFIG.selectors.dot);
            
            this.slideCount = this.slides.length;
            
            if (this.slideCount === 0) return false;
            
            // Set ARIA attributes
            this.slider.setAttribute('role', 'region');
            this.slider.setAttribute('aria-label', 'Testimonials');
            this.slider.setAttribute('aria-roledescription', 'carousel');
            
            // Set slide attributes
            this.slides.forEach((slide, index) => {
                slide.setAttribute('role', 'group');
                slide.setAttribute('aria-roledescription', 'slide');
                slide.setAttribute('aria-label', `${index + 1} of ${this.slideCount}`);
            });
            
            // Bind events
            this.bindEvents();
            
            // Initialize first slide
            this.goToSlide(0, false);
            
            // Start autoplay
            if (CONFIG.defaults.autoplay) {
                this.play();
            }
            
            return true;
        },
        
        /**
         * Bind event listeners
         */
        bindEvents() {
            // Arrow buttons
            if (this.prevBtn) {
                this.prevBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.prevSlide();
                });
            }
            
            if (this.nextBtn) {
                this.nextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.nextSlide();
                });
            }
            
            // Dots navigation
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    this.goToSlide(index);
                });
            });
            
            // Touch events
            if (CONFIG.defaults.touch) {
                this.slider.addEventListener('touchstart', (e) => {
                    this.handleTouchStart(e);
                }, { passive: true });
                
                this.slider.addEventListener('touchmove', (e) => {
                    this.handleTouchMove(e);
                }, { passive: false });
                
                this.slider.addEventListener('touchend', (e) => {
                    this.handleTouchEnd(e);
                });
            }
            
            // Pause on hover
            if (CONFIG.defaults.pauseOnHover && CONFIG.defaults.autoplay) {
                this.slider.addEventListener('mouseenter', () => {
                    this.pause();
                });
                
                this.slider.addEventListener('mouseleave', () => {
                    if (!this.isPaused) {
                        this.play();
                    }
                });
            }
            
            // Keyboard navigation
            this.slider.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.prevSlide();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextSlide();
                        break;
                    case 'Home':
                        e.preventDefault();
                        this.goToSlide(0);
                        break;
                    case 'End':
                        e.preventDefault();
                        this.goToSlide(this.slideCount - 1);
                        break;
                    case ' ':
                    case 'Space':
                        e.preventDefault();
                        if (this.autoplayTimer) {
                            this.pause();
                        } else {
                            this.play();
                        }
                        break;
                }
            });
            
            // Window resize
            window.addEventListener('resize', debounce(() => {
                // Recalculate if needed
            }, 250));
        },
        
        /**
         * Go to specific slide
         */
        goToSlide(index, animate = true) {
            if (this.isAnimating) return;
            if (index < 0) index = 0;
            if (index >= this.slideCount) index = this.slideCount - 1;
            if (index === this.currentIndex) return;
            
            this.isAnimating = animate;
            
            // Hide all slides
            this.slides.forEach(slide => {
                slide.style.display = 'none';
                slide.setAttribute('aria-hidden', 'true');
            });
            
            // Show current slide
            this.slides[index].style.display = 'block';
            this.slides[index].setAttribute('aria-hidden', 'false');
            
            // Update dots
            this.dots.forEach((dot, i) => {
                dot.classList.toggle(CONFIG.classes.active, i === index);
                dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
            });
            
            // Update arrows
            if (!CONFIG.defaults.infinite) {
                if (this.prevBtn) {
                    if (index === 0) {
                        this.prevBtn.classList.add(CONFIG.classes.disabled);
                        this.prevBtn.disabled = true;
                    } else {
                        this.prevBtn.classList.remove(CONFIG.classes.disabled);
                        this.prevBtn.disabled = false;
                    }
                }
                
                if (this.nextBtn) {
                    if (index === this.slideCount - 1) {
                        this.nextBtn.classList.add(CONFIG.classes.disabled);
                        this.nextBtn.disabled = true;
                    } else {
                        this.nextBtn.classList.remove(CONFIG.classes.disabled);
                        this.nextBtn.disabled = false;
                    }
                }
            }
            
            this.currentIndex = index;
            this.isAnimating = false;
        },
        
        /**
         * Go to next slide
         */
        nextSlide() {
            if (CONFIG.defaults.infinite) {
                const nextIndex = (this.currentIndex + 1) % this.slideCount;
                this.goToSlide(nextIndex);
            } else {
                const nextIndex = Math.min(this.currentIndex + 1, this.slideCount - 1);
                this.goToSlide(nextIndex);
            }
        },
        
        /**
         * Go to previous slide
         */
        prevSlide() {
            if (CONFIG.defaults.infinite) {
                const prevIndex = (this.currentIndex - 1 + this.slideCount) % this.slideCount;
                this.goToSlide(prevIndex);
            } else {
                const prevIndex = Math.max(this.currentIndex - 1, 0);
                this.goToSlide(prevIndex);
            }
        },
        
        /**
         * Handle touch start
         */
        handleTouchStart(e) {
            if (!CONFIG.defaults.touch) return;
            if (this.isAnimating) return;
            
            this.touchStartX = e.touches[0].clientX;
            this.touchEndX = this.touchStartX;
            this.touchMoved = false;
            
            // Pause autoplay during touch
            this.pause();
        },
        
        /**
         * Handle touch move
         */
        handleTouchMove(e) {
            if (!CONFIG.defaults.touch) return;
            if (this.touchStartX === 0) return;
            
            this.touchEndX = e.touches[0].clientX;
            const diff = this.touchStartX - this.touchEndX;
            
            if (Math.abs(diff) > 10) {
                this.touchMoved = true;
                e.preventDefault();
            }
        },
        
        /**
         * Handle touch end
         */
        handleTouchEnd() {
            if (!CONFIG.defaults.touch) return;
            if (!this.touchMoved) return;
            
            const diff = this.touchStartX - this.touchEndX;
            
            if (Math.abs(diff) > CONFIG.defaults.touchThreshold) {
                if (diff > 0) {
                    this.nextSlide();
                } else {
                    this.prevSlide();
                }
            }
            
            // Reset touch state
            this.touchStartX = 0;
            this.touchEndX = 0;
            this.touchMoved = false;
            
            // Resume autoplay
            if (CONFIG.defaults.autoplay && !this.isPaused) {
                this.play();
            }
        },
        
        /**
         * Start autoplay
         */
        play() {
            if (!CONFIG.defaults.autoplay) return;
            if (this.autoplayTimer) clearInterval(this.autoplayTimer);
            
            this.autoplayTimer = setInterval(() => {
                if (!this.isPaused && !this.isAnimating) {
                    this.nextSlide();
                }
            }, CONFIG.defaults.autoplaySpeed);
            
            this.isPaused = false;
            this.slider.classList.remove(CONFIG.classes.paused);
        },
        
        /**
         * Pause autoplay
         */
        pause() {
            if (this.autoplayTimer) {
                clearInterval(this.autoplayTimer);
                this.autoplayTimer = null;
            }
            
            this.isPaused = true;
            this.slider.classList.add(CONFIG.classes.paused);
        },
        
        /**
         * Destroy slider
         */
        destroy() {
            if (this.autoplayTimer) {
                clearInterval(this.autoplayTimer);
                this.autoplayTimer = null;
            }
            
            // Remove event listeners (handled by browser)
            
            // Reset slides
            this.slides.forEach(slide => {
                slide.style.display = 'block';
                slide.removeAttribute('role');
                slide.removeAttribute('aria-roledescription');
                slide.removeAttribute('aria-label');
                slide.removeAttribute('aria-hidden');
            });
            
            // Reset dots
            this.dots.forEach(dot => {
                dot.classList.remove(CONFIG.classes.active);
                dot.removeAttribute('aria-selected');
            });
            
            // Reset arrows
            if (this.prevBtn) {
                this.prevBtn.classList.remove(CONFIG.classes.disabled);
                this.prevBtn.disabled = false;
            }
            
            if (this.nextBtn) {
                this.nextBtn.classList.remove(CONFIG.classes.disabled);
                this.nextBtn.disabled = false;
            }
            
            console.log('✅ Slider destroyed');
        }
    };

    // ===================================================================
    // 🚀 INITIALIZE ALL SLIDERS
    // ===================================================================
    
    function init() {
        // Find all testimonial sliders on the page
        const sliders = $$(CONFIG.selectors.slider);
        
        if (sliders.length === 0) {
            console.log('ℹ️ No sliders found on this page');
            return;
        }
        
        // Initialize each slider
        sliders.forEach((slider, index) => {
            // Create a new instance for each slider
            const sliderInstance = Object.create(TestimonialSlider);
            
            if (sliderInstance.init(slider)) {
                // Store instance on the element for later access
                slider._slider = sliderInstance;
                console.log(`✅ Slider ${index + 1} initialized`);
            }
        });
    }

    // ===================================================================
    // 🌐 EXPOSE GLOBALLY (FOR DEBUGGING)
    // ===================================================================
    
    // Make TestimonialSlider available globally if needed
    window.TestimonialSlider = TestimonialSlider;
    
    // Start everything when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Slider module loaded');

})();

// ===================================================================
// ❌ NO EXPORT STATEMENT HERE - THIS FILE IS PURE BROWSER JS
// ===================================================================
