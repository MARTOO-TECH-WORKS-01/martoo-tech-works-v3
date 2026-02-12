/**
 * ===================================================================
 * MARTOO TECH WORKS - PRODUCTION READY SLIDER MODULE
 * Version: 2.0.0
 * Features: Testimonials, auto-play, touch support, keyboard nav,
 *           lazy loading, responsive breakpoints, accessibility
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 SLIDER CONFIGURATION
// ===================================================================

const SLIDER_CONFIG = {
    // Default options
    defaults: {
        // Auto-play
        autoplay: true,
        autoplaySpeed: 5000, // 5 seconds
        pauseOnHover: true,
        pauseOnFocus: true,
        
        // Navigation
        dots: true,
        arrows: true,
        infinite: true,
        speed: 500, // Transition speed in ms
        fade: false,
        
        // Touch
        touch: true,
        touchThreshold: 50, // px
        swipeToSlide: true,
        
        // Accessibility
        accessibility: true,
        announceSlide: true,
        
        // Responsive
        slidesToShow: 1,
        slidesToScroll: 1,
        
        // Lazy loading
        lazyLoad: true,
        
        // Callbacks
        onInit: null,
        onDestroy: null,
        onSlideChange: null,
        onBeforeChange: null,
        onAfterChange: null,
        onSwipe: null
    },
    
    // Breakpoints for responsive
    breakpoints: {
        mobile: 576,
        tablet: 768,
        desktop: 992
    },
    
    // CSS classes
    classes: {
        slider: 'testimonial-slider',
        track: 'slider-track',
        slide: 'slider-slide',
        slideActive: 'active',
        slideVisible: 'visible',
        dots: 'slider-dots',
        dot: 'slider-dot',
        dotActive: 'active',
        arrow: 'slider-arrow',
        arrowPrev: 'prev',
        arrowNext: 'next',
        arrowDisabled: 'disabled',
        paused: 'paused',
        loading: 'loading',
        loaded: 'loaded'
    },
    
    // Debug mode
    debug: false
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
    } catch (error) {
        if (SLIDER_CONFIG.debug) console.error(`Selector error [${selector}]:`, error);
        return null;
    }
};

/**
 * Safe query selector all
 */
const $$ = (selector, context = document) => {
    try {
        return Array.from(context.querySelectorAll(selector));
    } catch (error) {
        if (SLIDER_CONFIG.debug) console.error(`Selector all error [${selector}]:`, error);
        return [];
    }
};

/**
 * Debounce function for resize events
 */
const debounce = (func, wait = 100) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function for touch events
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
 * Add event listener with options
 */
const addEvent = (el, event, handler, options = {}) => {
    if (!el) return;
    el.addEventListener(event, handler, options);
    return () => el.removeEventListener(event, handler, options);
};

/**
 * Remove event listener
 */
const removeEvent = (el, event, handler) => {
    if (!el) return;
    el.removeEventListener(event, handler);
};

/**
 * Create element with attributes
 */
const createElement = (tag, attributes = {}, children = []) => {
    const el = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else {
            el.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            el.appendChild(child);
        }
    });
    
    return el;
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

/**
 * Dispatch custom event
 */
const dispatchEvent = (el, eventName, detail = {}) => {
    try {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
        el.dispatchEvent(event);
    } catch (error) {
        console.error('Event dispatch error:', error);
    }
};

// ===================================================================
// 🎠 CORE SLIDER CLASS
// ===================================================================

class MartooSlider {
    constructor(element, options = {}) {
        // Element validation
        this.element = typeof element === 'string' ? $(element) : element;
        
        if (!this.element) {
            console.error('Slider element not found');
            return;
        }
        
        // Merge options
        this.options = {
            ...SLIDER_CONFIG.defaults,
            ...options
        };
        
        // State
        this.initialized = false;
        this.destroyed = false;
        this.currentSlide = 0;
        this.slideCount = 0;
        this.slides = [];
        this.track = null;
        this.dotsContainer = null;
        this.prevArrow = null;
        this.nextArrow = null;
        this.autoplayTimer = null;
        this.isPaused = false;
        this.isAnimating = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchMoved = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.goToSlide = this.goToSlide.bind(this);
        this.nextSlide = this.nextSlide.bind(this);
        this.prevSlide = this.prevSlide.bind(this);
        this.play = this.play.bind(this);
        this.pause = this.pause.bind(this);
        this.handleResize = debounce(this.handleResize.bind(this), 150);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = throttle(this.handleTouchMove.bind(this), 20);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleDotClick = this.handleDotClick.bind(this);
        this.handleArrowClick = this.handleArrowClick.bind(this);
        this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize slider
     */
    init() {
        if (this.initialized || this.destroyed) return;
        
        try {
            // Get slides
            this.slides = $$('.testimonial-card', this.element);
            this.slideCount = this.slides.length;
            
            if (this.slideCount === 0) {
                console.warn('No slides found in slider');
                return;
            }
            
            // Create slider structure
            this.buildSlider();
            
            // Set initial state
            this.currentSlide = 0;
            this.updateActiveStates();
            this.updateArrows();
            
            // Lazy load images
            if (this.options.lazyLoad) {
                this.lazyLoadImages();
            }
            
            // Bind events
            this.bindEvents();
            
            // Start autoplay
            if (this.options.autoplay) {
                this.play();
            }
            
            // Mark as initialized
            this.initialized = true;
            
            // Add initialized class
            this.element.classList.add('slider-initialized');
            
            // Dispatch init event
            dispatchEvent(this.element, 'slider:init', {
                slider: this,
                slides: this.slides,
                count: this.slideCount
            });
            
            // Callback
            if (typeof this.options.onInit === 'function') {
                this.options.onInit(this);
            }
            
            if (SLIDER_CONFIG.debug) {
                console.log(`🎠 Slider initialized: ${this.slideCount} slides`);
            }
            
        } catch (error) {
            console.error('Slider initialization error:', error);
        }
    }
    
    /**
     * Build slider DOM structure
     */
    buildSlider() {
        // Create track
        this.track = createElement('div', {
            className: SLIDER_CONFIG.classes.track,
            style: {
                display: 'flex',
                transition: `transform ${this.options.speed}ms ease`,
                transform: 'translateX(0px)'
            }
        });
        
        // Move slides to track
        this.slides.forEach(slide => {
            slide.classList.add(SLIDER_CONFIG.classes.slide);
            this.track.appendChild(slide);
        });
        
        // Clear element and add track
        this.element.innerHTML = '';
        this.element.appendChild(this.track);
        
        // Add ARIA attributes
        this.element.setAttribute('role', 'region');
        this.element.setAttribute('aria-label', 'Testimonials');
        this.element.setAttribute('aria-roledescription', 'carousel');
        
        this.track.setAttribute('aria-live', this.options.autoplay ? 'off' : 'polite');
        
        // Set slide attributes
        this.slides.forEach((slide, index) => {
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `${index + 1} of ${this.slideCount}`);
        });
        
        // Create dots
        if (this.options.dots && this.slideCount > 1) {
            this.buildDots();
        }
        
        // Create arrows
        if (this.options.arrows && this.slideCount > 1) {
            this.buildArrows();
        }
    }
    
    /**
     * Build navigation dots
     */
    buildDots() {
        this.dotsContainer = createElement('div', {
            className: SLIDER_CONFIG.classes.dots,
            role: 'tablist',
            'aria-label': 'Slide navigation'
        });
        
        for (let i = 0; i < this.slideCount; i++) {
            const dot = createElement('button', {
                className: SLIDER_CONFIG.classes.dot,
                role: 'tab',
                'aria-label': `Go to slide ${i + 1}`,
                'aria-selected': i === 0 ? 'true' : 'false'
            });
            
            dot.addEventListener('click', () => this.handleDotClick(i));
            this.dotsContainer.appendChild(dot);
        }
        
        this.element.appendChild(this.dotsContainer);
        this.dots = $$(`.${SLIDER_CONFIG.classes.dot}`, this.element);
    }
    
    /**
     * Build navigation arrows
     */
    buildArrows() {
        const prevArrow = createElement('button', {
            className: `${SLIDER_CONFIG.classes.arrow} ${SLIDER_CONFIG.classes.arrowPrev}`,
            'aria-label': 'Previous slide'
        });
        prevArrow.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevArrow.addEventListener('click', this.handleArrowClick);
        this.element.appendChild(prevArrow);
        this.prevArrow = prevArrow;
        
        const nextArrow = createElement('button', {
            className: `${SLIDER_CONFIG.classes.arrow} ${SLIDER_CONFIG.classes.arrowNext}`,
            'aria-label': 'Next slide'
        });
        nextArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextArrow.addEventListener('click', this.handleArrowClick);
        this.element.appendChild(nextArrow);
        this.nextArrow = nextArrow;
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Resize
        window.addEventListener('resize', this.handleResize);
        
        // Touch events
        if (this.options.touch) {
            this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
            this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
            this.element.addEventListener('touchend', this.handleTouchEnd);
        }
        
        // Keyboard navigation
        if (this.options.accessibility) {
            this.element.addEventListener('keydown', this.handleKeydown);
        }
        
        // Pause on hover
        if (this.options.autoplay && this.options.pauseOnHover) {
            this.element.addEventListener('mouseenter', this.handleMouseEnter);
            this.element.addEventListener('mouseleave', this.handleMouseLeave);
        }
        
        // Focus management
        if (this.options.autoplay && this.options.pauseOnFocus) {
            this.element.addEventListener('focusin', this.handleMouseEnter);
            this.element.addEventListener('focusout', this.handleMouseLeave);
        }
        
        // Transition end
        this.track.addEventListener('transitionend', this.handleTransitionEnd);
    }
    
    /**
     * Remove event listeners
     */
    unbindEvents() {
        window.removeEventListener('resize', this.handleResize);
        
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        
        this.element.removeEventListener('keydown', this.handleKeydown);
        
        this.element.removeEventListener('mouseenter', this.handleMouseEnter);
        this.element.removeEventListener('mouseleave', this.handleMouseLeave);
        this.element.removeEventListener('focusin', this.handleMouseEnter);
        this.element.removeEventListener('focusout', this.handleMouseLeave);
        
        this.track.removeEventListener('transitionend', this.handleTransitionEnd);
    }
    
    /**
     * Go to specific slide
     */
    goToSlide(index, animate = true) {
        if (this.isAnimating) return;
        if (index < 0) index = 0;
        if (index >= this.slideCount) index = this.slideCount - 1;
        if (index === this.currentSlide) return;
        
        // Before change callback
        if (typeof this.options.onBeforeChange === 'function') {
            this.options.onBeforeChange(this.currentSlide, index);
        }
        
        // Dispatch before change event
        dispatchEvent(this.element, 'slider:beforeChange', {
            from: this.currentSlide,
            to: index
        });
        
        this.isAnimating = animate;
        
        // Calculate transform
        const slideWidth = this.slides[0].offsetWidth;
        const gap = parseInt(getComputedStyle(this.track).gap) || 0;
        const translateX = -(index * (slideWidth + gap));
        
        // Apply transform
        if (animate) {
            this.track.style.transition = `transform ${this.options.speed}ms ease`;
        } else {
            this.track.style.transition = 'none';
        }
        
        this.track.style.transform = `translateX(${translateX}px)`;
        
        // Update state
        this.currentSlide = index;
        
        // Update active states
        this.updateActiveStates();
        this.updateArrows();
        
        // Dispatch change event
        dispatchEvent(this.element, 'slider:change', {
            current: this.currentSlide,
            count: this.slideCount
        });
        
        if (SLIDER_CONFIG.debug) {
            console.log(`🎠 Slide changed to: ${index + 1}/${this.slideCount}`);
        }
    }
    
    /**
     * Go to next slide
     */
    nextSlide() {
        if (this.options.infinite) {
            const nextIndex = (this.currentSlide + 1) % this.slideCount;
            this.goToSlide(nextIndex);
        } else {
            const nextIndex = Math.min(this.currentSlide + 1, this.slideCount - 1);
            this.goToSlide(nextIndex);
        }
    }
    
    /**
     * Go to previous slide
     */
    prevSlide() {
        if (this.options.infinite) {
            const prevIndex = (this.currentSlide - 1 + this.slideCount) % this.slideCount;
            this.goToSlide(prevIndex);
        } else {
            const prevIndex = Math.max(this.currentSlide - 1, 0);
            this.goToSlide(prevIndex);
        }
    }
    
    /**
     * Update active slide and dot states
     */
    updateActiveStates() {
        // Update slides
        this.slides.forEach((slide, index) => {
            if (index === this.currentSlide) {
                slide.classList.add(SLIDER_CONFIG.classes.slideActive);
                slide.setAttribute('aria-hidden', 'false');
            } else {
                slide.classList.remove(SLIDER_CONFIG.classes.slideActive);
                slide.setAttribute('aria-hidden', 'true');
            }
        });
        
        // Update dots
        if (this.dots) {
            this.dots.forEach((dot, index) => {
                if (index === this.currentSlide) {
                    dot.classList.add(SLIDER_CONFIG.classes.dotActive);
                    dot.setAttribute('aria-selected', 'true');
                } else {
                    dot.classList.remove(SLIDER_CONFIG.classes.dotActive);
                    dot.setAttribute('aria-selected', 'false');
                }
            });
        }
    }
    
    /**
     * Update arrow states
     */
    updateArrows() {
        if (!this.options.infinite && this.prevArrow && this.nextArrow) {
            // Previous arrow
            if (this.currentSlide === 0) {
                this.prevArrow.classList.add(SLIDER_CONFIG.classes.arrowDisabled);
                this.prevArrow.disabled = true;
            } else {
                this.prevArrow.classList.remove(SLIDER_CONFIG.classes.arrowDisabled);
                this.prevArrow.disabled = false;
            }
            
            // Next arrow
            if (this.currentSlide === this.slideCount - 1) {
                this.nextArrow.classList.add(SLIDER_CONFIG.classes.arrowDisabled);
                this.nextArrow.disabled = true;
            } else {
                this.nextArrow.classList.remove(SLIDER_CONFIG.classes.arrowDisabled);
                this.nextArrow.disabled = false;
            }
        }
    }
    
    /**
     * Handle dot click
     */
    handleDotClick(index) {
        if (this.isAnimating) return;
        this.goToSlide(index);
    }
    
    /**
     * Handle arrow click
     */
    handleArrowClick(e) {
        e.preventDefault();
        
        if (this.isAnimating) return;
        
        if (e.currentTarget.classList.contains(SLIDER_CONFIG.classes.arrowPrev)) {
            this.prevSlide();
        } else {
            this.nextSlide();
        }
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (!this.options.touch) return;
        if (this.isAnimating) return;
        
        this.touchStartX = e.touches[0].clientX;
        this.touchEndX = this.touchStartX;
        this.touchMoved = false;
        
        // Pause autoplay during touch
        this.pause();
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!this.options.touch) return;
        if (this.touchStartX === 0) return;
        
        this.touchEndX = e.touches[0].clientX;
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > 10) {
            this.touchMoved = true;
            e.preventDefault();
        }
        
        // Optional: add drag effect
        if (this.options.swipeToSlide) {
            const slideWidth = this.slides[0].offsetWidth;
            const gap = parseInt(getComputedStyle(this.track).gap) || 0;
            const currentTransform = -(this.currentSlide * (slideWidth + gap));
            const dragTransform = currentTransform - diff;
            
            this.track.style.transition = 'none';
            this.track.style.transform = `translateX(${dragTransform}px)`;
        }
    }
    
    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        if (!this.options.touch) return;
        if (!this.touchMoved) return;
        
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > this.options.touchThreshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        } else {
            // Snap back to current slide
            this.goToSlide(this.currentSlide, true);
        }
        
        // Reset touch state
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchMoved = false;
        
        // Resume autoplay
        if (this.options.autoplay && !this.isPaused) {
            this.play();
        }
        
        // Swipe callback
        if (typeof this.options.onSwipe === 'function') {
            this.options.onSwipe(diff);
        }
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeydown(e) {
        if (!this.options.accessibility) return;
        
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
            case 'Spacebar':
            case 'Space':
                e.preventDefault();
                if (this.autoplayTimer) {
                    this.pause();
                } else {
                    this.play();
                }
                break;
        }
    }
    
    /**
     * Handle resize
     */
    handleResize() {
        if (this.destroyed) return;
        
        // Recalculate position
        this.goToSlide(this.currentSlide, false);
    }
    
    /**
     * Handle transition end
     */
    handleTransitionEnd(e) {
        if (e.target !== this.track) return;
        
        this.isAnimating = false;
        
        // After change callback
        if (typeof this.options.onAfterChange === 'function') {
            this.options.onAfterChange(this.currentSlide);
        }
        
        // Dispatch after change event
        dispatchEvent(this.element, 'slider:afterChange', {
            current: this.currentSlide
        });
    }
    
    /**
     * Handle mouse enter
     */
    handleMouseEnter() {
        if (this.options.pauseOnHover) {
            this.pause();
        }
    }
    
    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        if (this.options.pauseOnHover && !this.isPaused) {
            this.play();
        }
    }
    
    /**
     * Start autoplay
     */
    play() {
        if (!this.options.autoplay) return;
        if (this.autoplayTimer) clearInterval(this.autoplayTimer);
        
        this.autoplayTimer = setInterval(() => {
            if (!this.isPaused && !this.isAnimating) {
                this.nextSlide();
            }
        }, this.options.autoplaySpeed);
        
        this.isPaused = false;
        this.element.classList.remove(SLIDER_CONFIG.classes.paused);
        this.track.setAttribute('aria-live', 'off');
    }
    
    /**
     * Pause autoplay
     */
    pause() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
        
        this.isPaused = true;
        this.element.classList.add(SLIDER_CONFIG.classes.paused);
        this.track.setAttribute('aria-live', 'polite');
    }
    
    /**
     * Lazy load images
     */
    lazyLoadImages() {
        this.slides.forEach(slide => {
            const images = $$('img[data-src]', slide);
            images.forEach(img => {
                img.classList.add(SLIDER_CONFIG.classes.loading);
                
                const loadImage = () => {
                    img.src = img.dataset.src;
                    if (img.dataset.srcset) {
                        img.srcset = img.dataset.srcset;
                    }
                    img.classList.remove(SLIDER_CONFIG.classes.loading);
                    img.classList.add(SLIDER_CONFIG.classes.loaded);
                };
                
                if (slide.classList.contains(SLIDER_CONFIG.classes.slideActive)) {
                    loadImage();
                } else {
                    // Lazy load when slide becomes active
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                loadImage();
                                observer.unobserve(entry.target);
                            }
                        });
                    });
                    observer.observe(img);
                }
            });
        });
    }
    
    /**
     * Add slide
     */
    addSlide(html, index = null) {
        const slide = createElement('div', {
            className: SLIDER_CONFIG.classes.slide
        });
        
        if (typeof html === 'string') {
            slide.innerHTML = html;
        } else if (html instanceof HTMLElement) {
            slide.appendChild(html);
        }
        
        if (index !== null && index >= 0 && index < this.slideCount) {
            this.track.insertBefore(slide, this.slides[index]);
        } else {
            this.track.appendChild(slide);
        }
        
        // Update slides
        this.slides = $$(`.${SLIDER_CONFIG.classes.slide}`, this.track);
        this.slideCount = this.slides.length;
        
        // Rebuild dots if needed
        if (this.options.dots) {
            if (this.dotsContainer) {
                this.dotsContainer.remove();
            }
            this.buildDots();
        }
        
        // Update current slide
        if (this.currentSlide >= this.slideCount) {
            this.currentSlide = this.slideCount - 1;
        }
        
        this.goToSlide(this.currentSlide, false);
    }
    
    /**
     * Remove slide
     */
    removeSlide(index) {
        if (this.slideCount <= 1) return;
        if (index < 0 || index >= this.slideCount) return;
        
        const slide = this.slides[index];
        slide.remove();
        
        // Update slides
        this.slides = $$(`.${SLIDER_CONFIG.classes.slide}`, this.track);
        this.slideCount = this.slides.length;
        
        // Rebuild dots
        if (this.options.dots) {
            if (this.dotsContainer) {
                this.dotsContainer.remove();
            }
            this.buildDots();
        }
        
        // Update current slide
        if (this.currentSlide >= this.slideCount) {
            this.currentSlide = this.slideCount - 1;
        }
        
        this.goToSlide(this.currentSlide, false);
    }
    
    /**
     * Destroy slider
     */
    destroy() {
        if (this.destroyed) return;
        
        // Stop autoplay
        this.pause();
        
        // Remove event listeners
        this.unbindEvents();
        
        // Restore original slides
        this.slides.forEach(slide => {
            slide.classList.remove(
                SLIDER_CONFIG.classes.slide,
                SLIDER_CONFIG.classes.slideActive,
                SLIDER_CONFIG.classes.slideVisible
            );
            slide.removeAttribute('role');
            slide.removeAttribute('aria-roledescription');
            slide.removeAttribute('aria-label');
            slide.removeAttribute('aria-hidden');
            this.element.appendChild(slide);
        });
        
        // Remove added elements
        if (this.track) this.track.remove();
        if (this.dotsContainer) this.dotsContainer.remove();
        if (this.prevArrow) this.prevArrow.remove();
        if (this.nextArrow) this.nextArrow.remove();
        
        // Remove attributes
        this.element.removeAttribute('role');
        this.element.removeAttribute('aria-label');
        this.element.removeAttribute('aria-roledescription');
        
        // Clean up
        this.initialized = false;
        this.destroyed = true;
        
        // Destroy callback
        if (typeof this.options.onDestroy === 'function') {
            this.options.onDestroy(this);
        }
        
        // Dispatch destroy event
        dispatchEvent(this.element, 'slider:destroy');
        
        if (SLIDER_CONFIG.debug) {
            console.log('🎠 Slider destroyed');
        }
    }
}

// ===================================================================
// 🎠 TESTIMONIAL SLIDER MANAGER
// ===================================================================

const TestimonialSlider = {
    /**
     * Initialize testimonial slider
     */
    init(selector = '.testimonial-slider', options = {}) {
        const sliders = $$(selector);
        
        if (sliders.length === 0) {
            console.warn('No testimonial sliders found');
            return [];
        }
        
        const instances = sliders.map(slider => {
            // Check if already initialized
            if (slider.classList.contains('slider-initialized')) {
                return slider._martooSlider;
            }
            
            // Default options for testimonials
            const defaultOptions = {
                autoplay: true,
                autoplaySpeed: 5000,
                dots: true,
                arrows: true,
                infinite: true,
                touch: true,
                accessibility: true,
                slidesToShow: 1,
                slidesToScroll: 1,
                pauseOnHover: true,
                pauseOnFocus: true
            };
            
            // Create slider instance
            const sliderInstance = new MartooSlider(slider, {
                ...defaultOptions,
                ...options
            });
            
            // Store instance on element
            slider._martooSlider = sliderInstance;
            
            return sliderInstance;
        });
        
        return instances;
    },
    
    /**
     * Get slider instance
     */
    getInstance(selector) {
        const element = typeof selector === 'string' ? $(selector) : selector;
        return element?._martooSlider || null;
    },
    
    /**
     * Destroy slider
     */
    destroy(selector) {
        const slider = this.getInstance(selector);
        if (slider) {
            slider.destroy();
        }
    },
    
    /**
     * Load testimonials from API
     */
    async loadFromAPI(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const {
            limit = 5,
            featured = false,
            autoInit = true
        } = options;
        
        try {
            // Show loading state
            container.innerHTML = `
                <div class="testimonial-slider loading">
                    <div class="slider-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading testimonials...</p>
                    </div>
                </div>
            `;
            
            let testimonials = [];
            
            // Fetch from API
            if (window.MartooAPI?.testimonials?.getAll) {
                const response = await window.MartooAPI.testimonials.getAll({ limit, featured });
                if (response.success) {
                    testimonials = response.data;
                }
            } else {
                // Mock data
                await new Promise(resolve => setTimeout(resolve, 800));
                testimonials = this.getMockTestimonials().slice(0, limit);
            }
            
            // Build slider HTML
            const sliderHTML = this.buildSliderHTML(testimonials);
            container.innerHTML = sliderHTML;
            
            // Initialize slider
            if (autoInit) {
                setTimeout(() => {
                    this.init(`#${containerId} .testimonial-slider`);
                }, 100);
            }
            
            return testimonials;
            
        } catch (error) {
            console.error('Load testimonials error:', error);
            container.innerHTML = `
                <div class="testimonial-slider error">
                    <div class="slider-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load testimonials.</p>
                    </div>
                </div>
            `;
            return [];
        }
    },
    
    /**
     * Build slider HTML from testimonials data
     */
    buildSliderHTML(testimonials) {
        if (!testimonials || testimonials.length === 0) {
            return `
                <div class="testimonial-slider empty">
                    <div class="slider-empty">
                        <i class="fas fa-comments"></i>
                        <p>No testimonials yet.</p>
                    </div>
                </div>
            `;
        }
        
        let slidesHTML = '';
        
        testimonials.forEach(testimonial => {
            slidesHTML += `
                <div class="testimonial-card">
                    <div class="testimonial-rating">
                        ${'<i class="fas fa-star"></i>'.repeat(testimonial.rating || 5)}
                    </div>
                    <p class="testimonial-quote">"${testimonial.quote || testimonial.message}"</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">
                            ${testimonial.avatar 
                                ? `<img src="${testimonial.avatar}" alt="${testimonial.name}">`
                                : `<i class="fas fa-user-circle"></i>`
                            }
                        </div>
                        <div class="author-info">
                            <h4>${testimonial.name || 'Anonymous'}</h4>
                            <p>${testimonial.title || testimonial.role || 'Client'}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="testimonial-slider">
                ${slidesHTML}
            </div>
        `;
    },
    
    /**
     * Get mock testimonials for demo
     */
    getMockTestimonials() {
        return [
            {
                id: 1,
                name: 'Dr. Mwamba Banda',
                title: 'Public Health Specialist, MOH Zambia',
                rating: 5,
                quote: 'The GIS mapping support from Martoo Tech transformed our health facility distribution analysis. Highly professional team.',
                avatar: null
            },
            {
                id: 2,
                name: 'Chanda Mwila',
                title: 'MSc Candidate, UNZA',
                rating: 5,
                quote: 'STATA training was exceptional. Now I confidently analyze my own research data. Worth every kwacha!',
                avatar: null
            },
            {
                id: 3,
                name: 'Thandiwe Phiri',
                title: 'Program Manager, CIDRZ',
                rating: 5,
                quote: 'Proposal writing service helped us secure funding. Detailed, timely, and professional.',
                avatar: null
            },
            {
                id: 4,
                name: 'Peter Mulenga',
                title: 'PhD Student, CBU',
                rating: 5,
                quote: 'The team helped me with my thesis data analysis. They explained every step and I learned so much.',
                avatar: null
            },
            {
                id: 5,
                name: 'Grace Zulu',
                title: 'Research Officer, TDRC',
                rating: 5,
                quote: 'Excellent service! The QGIS maps they created for our malaria surveillance project were publication-ready.',
                avatar: null
            }
        ];
    }
};

// ===================================================================
// 🎠 FEATURED WORK SLIDER
// ===================================================================

const FeaturedSlider = {
    /**
     * Initialize featured work slider
     */
    init(selector = '.featured-slider', options = {}) {
        const sliders = $$(selector);
        
        if (sliders.length === 0) {
            console.warn('No featured sliders found');
            return [];
        }
        
        const instances = sliders.map(slider => {
            if (slider.classList.contains('slider-initialized')) {
                return slider._martooSlider;
            }
            
            const defaultOptions = {
                autoplay: true,
                autoplaySpeed: 6000,
                dots: true,
                arrows: true,
                infinite: true,
                touch: true,
                slidesToShow: 1,
                slidesToScroll: 1,
                pauseOnHover: true,
                fade: true
            };
            
            const sliderInstance = new MartooSlider(slider, {
                ...defaultOptions,
                ...options
            });
            
            slider._martooSlider = sliderInstance;
            
            return sliderInstance;
        });
        
        return instances;
    }
};

// ===================================================================
// 🎠 COURSE SLIDER
// ===================================================================

const CourseSlider = {
    /**
     * Initialize course slider
     */
    init(selector = '.course-slider', options = {}) {
        const sliders = $$(selector);
        
        if (sliders.length === 0) {
            console.warn('No course sliders found');
            return [];
        }
        
        const instances = sliders.map(slider => {
            if (slider.classList.contains('slider-initialized')) {
                return slider._martooSlider;
            }
            
            const defaultOptions = {
                autoplay: false,
                dots: true,
                arrows: true,
                infinite: false,
                touch: true,
                slidesToShow: 3,
                slidesToScroll: 1,
                pauseOnHover: true,
                responsive: [
                    {
                        breakpoint: 992,
                        settings: {
                            slidesToShow: 2,
                            slidesToScroll: 1
                        }
                    },
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1
                        }
                    }
                ]
            };
            
            const sliderInstance = new MartooSlider(slider, {
                ...defaultOptions,
                ...options
            });
            
            slider._martooSlider = sliderInstance;
            
            return sliderInstance;
        });
        
        return instances;
    }
};

// ===================================================================
// 📦 EXPORT PUBLIC API
// ===================================================================

const Slider = {
    // Core slider
    MartooSlider,
    
    // Slider managers
    testimonials: TestimonialSlider,
    featured: FeaturedSlider,
    courses: CourseSlider,
    
    // Utilities
    utils: {
        $,
        $$,
        debounce,
        throttle,
        createElement,
        getIndex,
        dispatchEvent
    },
    
    // Configuration
    config: SLIDER_CONFIG,
    
    // Version
    version: '2.0.0',
    
    /**
     * Initialize all sliders
     */
    initAll(options = {}) {
        const instances = [];
        
        // Initialize testimonial sliders
        const testimonialInstances = this.testimonials.init('.testimonial-slider', options);
        instances.push(...testimonialInstances);
        
        // Initialize featured sliders
        const featuredInstances = this.featured.init('.featured-slider', options);
        instances.push(...featuredInstances);
        
        // Initialize course sliders
        const courseInstances = this.courses.init('.course-slider', options);
        instances.push(...courseInstances);
        
        return instances;
    },
    
    /**
     * Destroy all sliders
     */
    destroyAll() {
        const sliders = $$('.slider-initialized');
        sliders.forEach(slider => {
            if (slider._martooSlider) {
                slider._martooSlider.destroy();
            }
        });
    }
};

// ===================================================================
// 🌐 EXPORT TO GLOBAL SCOPE
// ===================================================================

// Make Slider module available globally
if (typeof window !== 'undefined') {
    window.MartooSlider = Slider;
    window.TestimonialSlider = TestimonialSlider;
    
    // Auto-initialize testimonial sliders
    document.addEventListener('DOMContentLoaded', () => {
        // Check if there are any testimonial sliders on the page
        if ($('.testimonial-slider')) {
            Slider.testimonials.init();
        }
        
        // Check if there are any featured sliders
        if ($('.featured-slider')) {
            Slider.featured.init();
        }
        
        // Check if there are any course sliders
        if ($('.course-slider')) {
            Slider.courses.init();
        }
    });
    
    console.log('🎠 Martoo Slider v2.0.0 initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Slider;
}

export default Slider;
