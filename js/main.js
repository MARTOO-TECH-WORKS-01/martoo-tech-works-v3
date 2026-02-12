/**
 * ===================================================================
 * MARTOO TECH WORKS - PRODUCTION READY MAIN.JS
 * Core initialization, global utilities, and shared functionality
 * Version: 2.0.0
 * ===================================================================
 */

(function() {
    'use strict';

    // ===================================================================
    // 🔥 GLOBAL CONFIGURATION
    // ===================================================================
    window.MARTOO_CONFIG = {
        APP_NAME: 'Martoo Tech Works',
        VERSION: '2.0.0',
        API_BASE_URL: 'https://martoo-tech-backend-qgis.vercel.app/api',
        ENV: 'production',
        DEBUG: false,
        CACHE_DURATION: 300, // 5 minutes
        ANIMATION_ENABLED: true,
        TOAST_DURATION: 5000,
        DEFAULT_CURRENCY: 'ZMW',
        CONTACT: {
            whatsapp: '260973495316',
            phone1: '260774766077',
            phone2: '260973495316',
            email1: 'martootechworks@gmail.com',
            email2: 'mtechworks1@gmail.com',
            facebook: 'https://www.facebook.com/profile.php?id=61568599103956',
            youtube: 'https://youtube.com/@martootechworks'
        }
    };

    // ===================================================================
    // 🚦 READY STATE DETECTION
    // ===================================================================
    const readyCallbacks = [];
    let isDOMReady = false;

    function onReady(callback) {
        if (isDOMReady) {
            callback();
        } else {
            readyCallbacks.push(callback);
        }
    }

    function triggerReady() {
        isDOMReady = true;
        readyCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in ready callback:', error);
            }
        });
    }

    // ===================================================================
    // 📱 DEVICE & BROWSER DETECTION
    // ===================================================================
    const Device = {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        isAndroid: /Android/.test(navigator.userAgent),
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        isFirefox: typeof InstallTrigger !== 'undefined',
        isChrome: !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime),
        
        getBrowserInfo() {
            const ua = navigator.userAgent;
            let browser = 'Unknown';
            
            if (this.isChrome) browser = 'Chrome';
            else if (this.isFirefox) browser = 'Firefox';
            else if (this.isSafari) browser = 'Safari';
            else if (ua.indexOf('MSIE') !== -1 || ua.indexOf('Trident/') !== -1) browser = 'Internet Explorer';
            else if (ua.indexOf('Edge') !== -1) browser = 'Edge';
            
            return {
                name: browser,
                version: ua.match(/(?:Chrome|Firefox|Safari|Edge|MSIE|Trident)[\/\s](\d+)/)?.[1] || 'Unknown',
                isMobile: this.isMobile,
                isTouch: this.isTouch
            };
        }
    };

    // ===================================================================
    // 🎯 PERFORMANCE MONITORING
    // ===================================================================
    const Performance = {
        marks: {},
        measures: {},
        
        mark(name) {
            if (window.performance && window.performance.mark) {
                window.performance.mark(name);
                this.marks[name] = performance.now();
            }
        },
        
        measure(name, startMark, endMark) {
            if (window.performance && window.performance.measure) {
                try {
                    window.performance.measure(name, startMark, endMark);
                    const entries = window.performance.getEntriesByName(name);
                    if (entries.length > 0) {
                        this.measures[name] = entries[0].duration;
                    }
                } catch (e) {
                    console.warn('Performance measure failed:', e);
                }
            }
        },
        
        getLoadTime() {
            if (window.performance && window.performance.timing) {
                const timing = window.performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                return loadTime > 0 ? loadTime : null;
            }
            return null;
        },
        
        logMetrics() {
            if (this.DEBUG) {
                console.log('📊 Performance Metrics:', {
                    loadTime: this.getLoadTime(),
                    measures: this.measures
                });
            }
        }
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    const Utils = {
        /**
         * Debounce function to limit rate of execution
         */
        debounce(func, wait = 300, immediate = false) {
            let timeout;
            return function executedFunction() {
                const context = this;
                const args = arguments;
                
                const later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                
                if (callNow) func.apply(context, args);
            };
        },

        /**
         * Throttle function to limit rate of execution
         */
        throttle(func, limit = 300) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Format currency
         */
        formatCurrency(amount, currency = 'ZMW') {
            if (isNaN(amount)) return `${currency} 0.00`;
            return `${currency} ${Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
        },

        /**
         * Format date
         */
        formatDate(date, format = 'DD MMM, YYYY') {
            const d = new Date(date);
            if (isNaN(d.getTime())) return 'Invalid Date';
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            const replacements = {
                'YYYY': d.getFullYear(),
                'YY': String(d.getFullYear()).slice(-2),
                'MM': String(d.getMonth() + 1).padStart(2, '0'),
                'MMM': months[d.getMonth()],
                'MMMM': months[d.getMonth()],
                'DD': String(d.getDate()).padStart(2, '0'),
                'DDD': days[d.getDay()],
                'HH': String(d.getHours()).padStart(2, '0'),
                'hh': String(d.getHours() % 12 || 12).padStart(2, '0'),
                'mm': String(d.getMinutes()).padStart(2, '0'),
                'ss': String(d.getSeconds()).padStart(2, '0'),
                'a': d.getHours() >= 12 ? 'PM' : 'AM'
            };
            
            return format.replace(/YYYY|YY|MMMM|MMM|MM|DDD|DD|HH|hh|mm|ss|a/g, match => replacements[match]);
        },

        /**
         * Truncate text with ellipsis
         */
        truncateText(text, length = 100, ellipsis = '...') {
            if (!text || text.length <= length) return text;
            return text.substring(0, length).trim() + ellipsis;
        },

        /**
         * Slugify string
         */
        slugify(text) {
            return text
                .toString()
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
        },

        /**
         * Validate email
         */
        isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(String(email).toLowerCase());
        },

        /**
         * Validate phone (Zambian format)
         */
        isValidZambianPhone(phone) {
            const cleaned = phone.replace(/\D/g, '');
            return /^(\+260|0)?[97]\d{8}$/.test(cleaned);
        },

        /**
         * Get URL parameters
         */
        getUrlParams() {
            const params = {};
            const queryString = window.location.search;
            
            if (queryString) {
                const pairs = queryString.substring(1).split('&');
                pairs.forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key) {
                        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
                    }
                });
            }
            
            return params;
        },

        /**
         * Set cookie
         */
        setCookie(name, value, days = 7) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            const expires = `expires=${date.toUTCString()}`;
            document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
        },

        /**
         * Get cookie
         */
        getCookie(name) {
            const cookieName = `${name}=`;
            const cookies = document.cookie.split(';');
            
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.indexOf(cookieName) === 0) {
                    return cookie.substring(cookieName.length);
                }
            }
            
            return null;
        },

        /**
         * Delete cookie
         */
        deleteCookie(name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        },

        /**
         * Copy to clipboard
         */
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return { success: true };
            } catch (err) {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                
                try {
                    document.execCommand('copy');
                    return { success: true };
                } catch (e) {
                    return { success: false, error: e };
                } finally {
                    document.body.removeChild(textarea);
                }
            }
        },

        /**
         * Generate random ID
         */
        generateId(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        /**
         * Safe JSON parse
         */
        safeJsonParse(str, fallback = null) {
            try {
                return JSON.parse(str);
            } catch {
                return fallback;
            }
        },

        /**
         * Detect offline/online status
         */
        isOnline() {
            return navigator.onLine;
        },

        /**
         * Smooth scroll to element
         */
        scrollToElement(element, offset = 0, duration = 800) {
            if (!element) return;
            
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    // ===================================================================
    // 🍞 TOAST NOTIFICATION SYSTEM
    // ===================================================================
    const Toast = {
        container: null,
        defaults: {
            duration: 5000,
            position: 'top-right',
            closeable: true
        },

        init() {
            // Create toast container if not exists
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'toast-container';
                this.container.className = `toast-container toast-${this.defaults.position}`;
                document.body.appendChild(this.container);
                
                // Add styles dynamically
                const style = document.createElement('style');
                style.textContent = `
                    #toast-container {
                        position: fixed;
                        z-index: 999999;
                        pointer-events: none;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        max-width: 350px;
                        width: 100%;
                    }
                    
                    #toast-container.toast-top-right {
                        top: 20px;
                        right: 20px;
                    }
                    
                    #toast-container.toast-top-left {
                        top: 20px;
                        left: 20px;
                    }
                    
                    #toast-container.toast-bottom-right {
                        bottom: 20px;
                        right: 20px;
                    }
                    
                    #toast-container.toast-bottom-left {
                        bottom: 20px;
                        left: 20px;
                    }
                    
                    #toast-container.toast-top-center {
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                    }
                    
                    #toast-container.toast-bottom-center {
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                    }
                    
                    .toast {
                        background: linear-gradient(145deg, #1A2A4A, #0F1A2F);
                        border-left: 4px solid;
                        border-radius: 8px;
                        padding: 16px;
                        color: white;
                        font-family: 'Open Sans', sans-serif;
                        font-size: 14px;
                        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        pointer-events: auto;
                        animation: toast-slide-in 0.3s ease;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(10px);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .toast::before {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 3px;
                        background: rgba(255, 255, 255, 0.1);
                    }
                    
                    .toast-progress {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        height: 3px;
                        width: 100%;
                        transform-origin: left;
                        animation: toast-progress linear forwards;
                    }
                    
                    .toast.success {
                        border-left-color: #28A745;
                    }
                    
                    .toast.success .toast-progress {
                        background: #28A745;
                    }
                    
                    .toast.error {
                        border-left-color: #DC3545;
                    }
                    
                    .toast.error .toast-progress {
                        background: #DC3545;
                    }
                    
                    .toast.warning {
                        border-left-color: #FFC107;
                    }
                    
                    .toast.warning .toast-progress {
                        background: #FFC107;
                    }
                    
                    .toast.info {
                        border-left-color: #007BFF;
                    }
                    
                    .toast.info .toast-progress {
                        background: #007BFF;
                    }
                    
                    .toast-icon {
                        font-size: 20px;
                        flex-shrink: 0;
                    }
                    
                    .toast-content {
                        flex: 1;
                    }
                    
                    .toast-title {
                        font-weight: 700;
                        margin-bottom: 4px;
                        color: white;
                    }
                    
                    .toast-message {
                        color: rgba(255, 255, 255, 0.9);
                        line-height: 1.5;
                    }
                    
                    .toast-close {
                        background: none;
                        border: none;
                        color: rgba(255, 255, 255, 0.5);
                        cursor: pointer;
                        padding: 4px;
                        font-size: 16px;
                        transition: color 0.2s;
                        flex-shrink: 0;
                    }
                    
                    .toast-close:hover {
                        color: white;
                    }
                    
                    @keyframes toast-slide-in {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes toast-progress {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                    
                    @media (max-width: 768px) {
                        #toast-container {
                            max-width: calc(100% - 40px);
                            left: 20px;
                            right: 20px;
                            transform: none;
                        }
                        
                        #toast-container.toast-top-right,
                        #toast-container.toast-top-left,
                        #toast-container.toast-top-center {
                            top: 20px;
                            left: 20px;
                            right: 20px;
                            width: auto;
                        }
                        
                        #toast-container.toast-bottom-right,
                        #toast-container.toast-bottom-left,
                        #toast-container.toast-bottom-center {
                            bottom: 20px;
                            left: 20px;
                            right: 20px;
                            width: auto;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        },

        show(options) {
            this.init();
            
            const {
                title,
                message,
                type = 'info',
                duration = this.defaults.duration,
                closeable = this.defaults.closeable
            } = options;
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            // Icons
            const icons = {
                success: '<i class="fas fa-check-circle"></i>',
                error: '<i class="fas fa-exclamation-circle"></i>',
                warning: '<i class="fas fa-exclamation-triangle"></i>',
                info: '<i class="fas fa-info-circle"></i>'
            };
            
            toast.innerHTML = `
                <div class="toast-icon">${icons[type] || icons.info}</div>
                <div class="toast-content">
                    ${title ? `<div class="toast-title">${title}</div>` : ''}
                    <div class="toast-message">${message}</div>
                </div>
                ${closeable ? '<button class="toast-close"><i class="fas fa-times"></i></button>' : ''}
                <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
            `;
            
            this.container.appendChild(toast);
            
            // Close button handler
            if (closeable) {
                toast.querySelector('.toast-close').addEventListener('click', () => {
                    this.hide(toast);
                });
            }
            
            // Auto hide
            if (duration > 0) {
                setTimeout(() => {
                    this.hide(toast);
                }, duration);
            }
            
            return toast;
        },

        hide(toast) {
            if (toast && toast.parentNode) {
                toast.style.animation = 'toast-slide-in 0.3s ease reverse';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        },

        success(message, title = 'Success', duration = 5000) {
            return this.show({ title, message, type: 'success', duration });
        },

        error(message, title = 'Error', duration = 5000) {
            return this.show({ title, message, type: 'error', duration });
        },

        warning(message, title = 'Warning', duration = 5000) {
            return this.show({ title, message, type: 'warning', duration });
        },

        info(message, title = 'Info', duration = 5000) {
            return this.show({ title, message, type: 'info', duration });
        }
    };

    // ===================================================================
    // 📊 ANALYTICS & TRACKING
    // ===================================================================
    const Analytics = {
        enabled: true,
        
        init() {
            if (!this.enabled) return;
            
            // Track page views
            this.trackPageView();
            
            // Track clicks on important elements
            document.addEventListener('click', (e) => {
                const element = e.target.closest('[data-track]');
                if (element) {
                    this.trackEvent('click', {
                        action: element.dataset.track,
                        label: element.dataset.label || element.textContent,
                        url: element.href || window.location.href
                    });
                }
            });
        },

        trackPageView() {
            const data = {
                event: 'page_view',
                url: window.location.href,
                path: window.location.pathname,
                title: document.title,
                referrer: document.referrer,
                timestamp: new Date().toISOString()
            };
            
            // Store in session storage for backend sync
            this.queueEvent(data);
        },

        trackEvent(category, action, label = '', value = null) {
            const data = {
                event: 'custom_event',
                category,
                action,
                label,
                value,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
            
            this.queueEvent(data);
        },

        queueEvent(data) {
            try {
                const queue = JSON.parse(sessionStorage.getItem('analytics_queue') || '[]');
                queue.push(data);
                sessionStorage.setItem('analytics_queue', JSON.stringify(queue));
                
                // Send immediately if queue is large
                if (queue.length >= 10) {
                    this.flush();
                }
            } catch (e) {
                console.warn('Failed to queue analytics event:', e);
            }
        },

        flush() {
            // Will be implemented with backend API
            const queue = JSON.parse(sessionStorage.getItem('analytics_queue') || '[]');
            if (queue.length > 0) {
                console.log('Analytics queue:', queue);
                sessionStorage.removeItem('analytics_queue');
            }
        }
    };

    // ===================================================================
    // 🎨 THEME & APPEARANCE
    // ===================================================================
    const Theme = {
        init() {
            this.setInitialTheme();
            this.setupThemeToggle();
        },

        setInitialTheme() {
            const savedTheme = Utils.getCookie('theme') || 'dark';
            this.setTheme(savedTheme);
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            Utils.setCookie('theme', theme, 365);
            
            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme } }));
        },

        toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
        },

        setupThemeToggle() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('[data-toggle="theme"]')) {
                    this.toggleTheme();
                }
            });
        }
    };

    // ===================================================================
    // 🚀 LAZY LOADING
    // ===================================================================
    const LazyLoader = {
        init() {
            if ('IntersectionObserver' in window) {
                this.setupImageLazyLoading();
                this.setupIframeLazyLoading();
            } else {
                this.loadAllImmediately();
            }
        },

        setupImageLazyLoading() {
            const images = document.querySelectorAll('img[data-src]');
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
            
            images.forEach(img => observer.observe(img));
        },

        setupIframeLazyLoading() {
            const iframes = document.querySelectorAll('iframe[data-src]');
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const iframe = entry.target;
                        iframe.src = iframe.dataset.src;
                        iframe.removeAttribute('data-src');
                        observer.unobserve(iframe);
                    }
                });
            }, {
                rootMargin: '100px 0px'
            });
            
            iframes.forEach(iframe => observer.observe(iframe));
        },

        loadImage(img) {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                    img.removeAttribute('data-srcset');
                }
                
                img.classList.add('loaded');
            }
        },

        loadAllImmediately() {
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.loadImage(img);
            });
            
            document.querySelectorAll('iframe[data-src]').forEach(iframe => {
                iframe.src = iframe.dataset.src;
                iframe.removeAttribute('data-src');
            });
        }
    };

    // ===================================================================
    // 🔍 SEBARANG FUNCTIONS (SEARCH BAR)
    // ===================================================================
    const Search = {
        init() {
            this.setupSearchTrigger();
            this.setupSearchModal();
        },

        setupSearchTrigger() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="search"]')) {
                    e.preventDefault();
                    this.openSearchModal();
                }
            });

            // Keyboard shortcut: Ctrl+K or Cmd+K
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.openSearchModal();
                }
            });
        },

        setupSearchModal() {
            // Will be implemented by search.js
        },

        openSearchModal() {
            window.dispatchEvent(new CustomEvent('openSearchModal'));
        }
    };

    // ===================================================================
    // 💪 INITIALIZATION
    // ===================================================================
    function init() {
        // Performance marking
        Performance.mark('init-start');
        
        // Set global objects
        window.MARTOO = {
            config: window.MARTOO_CONFIG,
            utils: Utils,
            toast: Toast,
            device: Device,
            performance: Performance,
            analytics: Analytics,
            theme: Theme,
            lazyLoader: LazyLoader,
            search: Search,
            version: '2.0.0'
        };
        
        // Initialize modules
        if (window.MARTOO_CONFIG.ANIMATION_ENABLED) {
            document.documentElement.classList.add('animations-enabled');
        }
        
        // Analytics init
        Analytics.init();
        
        // Theme init
        Theme.init();
        
        // Lazy loading init
        LazyLoader.init();
        
        // Search init
        Search.init();
        
        // Add touch class for touch devices
        if (Device.isTouch) {
            document.documentElement.classList.add('touch-device');
        }
        
        // Performance marking
        Performance.mark('init-end');
        Performance.measure('init-duration', 'init-start', 'init-end');
        
        // Log metrics in development
        if (window.MARTOO_CONFIG.DEBUG) {
            Performance.logMetrics();
            console.log('✅ Martoo Tech Works v2.0.0 initialized', {
                device: Device.getBrowserInfo(),
                config: window.MARTOO_CONFIG
            });
        }
        
        // Trigger ready event
        triggerReady();
    }

    // ===================================================================
    // 🚦 DOM READY HANDLER
    // ===================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM is already loaded
        init();
    }

    // ===================================================================
    // 📤 EXPOSE PUBLIC API
    // ===================================================================
    window.Martoo = {
        // Core
        utils: Utils,
        toast: Toast,
        device: Device,
        
        // Helpers
        formatCurrency: Utils.formatCurrency,
        formatDate: Utils.formatDate,
        isValidEmail: Utils.isValidEmail,
        copyToClipboard: Utils.copyToClipboard,
        
        // Events
        onReady: onReady,
        
        // Debug
        debug: window.MARTOO_CONFIG.DEBUG ? console.log : () => {}
    };

    // ===================================================================
    // 🛡️ ERROR HANDLING
    // ===================================================================
    window.addEventListener('error', (event) => {
        console.error('Global error:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        // Track error
        if (window.MARTOO && window.MARTOO.analytics) {
            window.MARTOO.analytics.trackEvent('error', 'javascript', event.message);
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Track error
        if (window.MARTOO && window.MARTOO.analytics) {
            window.MARTOO.analytics.trackEvent('error', 'promise', event.reason?.message || 'Unknown');
        }
    });

    // ===================================================================
    // 🔌 NETWORK STATUS
    // ===================================================================
    window.addEventListener('online', () => {
        document.documentElement.classList.remove('offline');
        Toast.info('You are back online', 'Connection Restored');
    });

    window.addEventListener('offline', () => {
        document.documentElement.classList.add('offline');
        Toast.warning('You are currently offline', 'No Internet Connection');
    });

})();
