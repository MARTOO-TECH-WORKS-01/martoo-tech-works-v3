/**
 * ===================================================================
 * MARTOO TECH WORKS - MAIN ENTRY POINT
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel - YOUR ACTUAL BACKEND
 * Repository: mtechworks1-hub/martoo-tech-backend-Qgis
 * Features: Global initialization, error handling, performance monitoring
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 IMMEDIATE SELF-EXECUTING FUNCTION - NO EXPORTS!
// ===================================================================

(function() {
    
    // ===================================================================
    // 🔧 GLOBAL CONFIGURATION
    // ===================================================================
    
    const CONFIG = {
        // App info
        APP_NAME: 'Martoo Tech Works',
        VERSION: '2.0.0',
        
        // Your live backend URL
        API_URL: 'https://martoo-tech-backend-qgis.vercel.app/api',
        
        // Environment
        ENV: 'production',
        DEBUG: false,
        
        // Your contact details
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
    // 🔧 GLOBAL ERROR HANDLER
    // ===================================================================
    
    const ErrorHandler = {
        /**
         * Initialize global error handling
         */
        init() {
            // Window error events
            window.addEventListener('error', (event) => {
                this.handleError({
                    message: event.message,
                    source: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    error: event.error,
                    type: 'uncaught'
                });
            });

            // Unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.handleError({
                    message: event.reason?.message || 'Unhandled Promise Rejection',
                    error: event.reason,
                    type: 'promise'
                });
            });

            // Console.error override for additional tracking
            const originalConsoleError = console.error;
            console.error = (...args) => {
                this.handleError({
                    message: args.join(' '),
                    type: 'console',
                    args
                });
                originalConsoleError.apply(console, args);
            };

            console.log('✅ Error handler initialized');
        },

        /**
         * Handle error
         */
        handleError(error) {
            // Log to console in development
            if (CONFIG.DEBUG) {
                console.group('❌ Error Caught');
                console.error('Type:', error.type);
                console.error('Message:', error.message);
                console.error('Source:', error.source);
                console.error('Line:', error.line);
                console.error('Error:', error.error);
                console.groupEnd();
            }

            // Track error for analytics (if available)
            if (window.gtag) {
                window.gtag('event', 'error', {
                    event_category: error.type || 'javascript',
                    event_label: error.message,
                    value: error.line || 0
                });
            }

            // Store error in localStorage for debugging
            try {
                const errors = JSON.parse(localStorage.getItem('martoo_errors') || '[]');
                errors.push({
                    timestamp: new Date().toISOString(),
                    ...error
                });
                // Keep last 10 errors only
                if (errors.length > 10) errors.shift();
                localStorage.setItem('martoo_errors', JSON.stringify(errors));
            } catch (e) {
                // Ignore storage errors
            }
        }
    };

    // ===================================================================
    // 📊 PERFORMANCE MONITORING
    // ===================================================================
    
    const PerformanceMonitor = {
        marks: {},
        measures: {},

        /**
         * Initialize performance monitoring
         */
        init() {
            if (window.performance && window.performance.mark) {
                this.mark('app-start');
                
                // Track page load performance
                window.addEventListener('load', () => {
                    this.mark('app-loaded');
                    this.measure('load-time', 'app-start', 'app-loaded');
                    
                    if (CONFIG.DEBUG) {
                        const loadTime = this.measures['load-time'];
                        console.log(`⏱️ Page load time: ${loadTime.toFixed(2)}ms`);
                    }
                });

                // Track first paint
                if (window.performance.getEntriesByType) {
                    const paintEntries = window.performance.getEntriesByType('paint');
                    paintEntries.forEach(entry => {
                        if (entry.name === 'first-contentful-paint') {
                            console.log(`🎨 First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
                        }
                    });
                }

                console.log('✅ Performance monitor initialized');
            }
        },

        /**
         * Create performance mark
         */
        mark(name) {
            if (window.performance && window.performance.mark) {
                window.performance.mark(name);
                this.marks[name] = performance.now();
            }
        },

        /**
         * Measure between marks
         */
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

        /**
         * Get page load time
         */
        getLoadTime() {
            if (window.performance && window.performance.timing) {
                const timing = window.performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                return loadTime > 0 ? loadTime : null;
            }
            return null;
        }
    };

    // ===================================================================
    // 📱 DEVICE DETECTION
    // ===================================================================
    
    const DeviceDetector = {
        /**
         * Detect device and browser
         */
        detect() {
            const ua = navigator.userAgent;
            
            return {
                // Device type
                isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
                isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
                isAndroid: /Android/.test(ua),
                isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                
                // Browser
                isChrome: !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime),
                isFirefox: typeof InstallTrigger !== 'undefined',
                isSafari: /^((?!chrome|android).)*safari/i.test(ua),
                isEdge: ua.indexOf('Edg') > -1,
                
                // OS
                isWindows: ua.indexOf('Windows') > -1,
                isMac: ua.indexOf('Mac') > -1,
                isLinux: ua.indexOf('Linux') > -1,
                
                // Screen
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                pixelRatio: window.devicePixelRatio || 1
            };
        },

        /**
         * Get browser info
         */
        getBrowserInfo() {
            const ua = navigator.userAgent;
            let browser = 'Unknown';
            
            if (this.detect().isChrome) browser = 'Chrome';
            else if (this.detect().isFirefox) browser = 'Firefox';
            else if (this.detect().isSafari) browser = 'Safari';
            else if (this.detect().isEdge) browser = 'Edge';
            
            return {
                name: browser,
                version: ua.match(/(?:Chrome|Firefox|Safari|Edg|MSIE|Trident)[\/\s](\d+)/)?.[1] || 'Unknown',
                ...this.detect()
            };
        },

        /**
         * Add device classes to body
         */
        addDeviceClasses() {
            const device = this.detect();
            const body = document.body;
            
            if (device.isMobile) body.classList.add('device-mobile');
            if (device.isIOS) body.classList.add('device-ios');
            if (device.isAndroid) body.classList.add('device-android');
            if (device.isTouch) body.classList.add('device-touch');
            
            // Responsive classes
            if (window.innerWidth < 768) body.classList.add('viewport-mobile');
            else if (window.innerWidth < 992) body.classList.add('viewport-tablet');
            else body.classList.add('viewport-desktop');
        }
    };

    // ===================================================================
    // 🌐 NETWORK STATUS
    // ===================================================================
    
    const NetworkMonitor = {
        /**
         * Initialize network monitoring
         */
        init() {
            window.addEventListener('online', () => {
                document.body.classList.remove('offline');
                this.showToast('You are back online', 'success');
            });

            window.addEventListener('offline', () => {
                document.body.classList.add('offline');
                this.showToast('You are currently offline', 'warning');
            });

            console.log('✅ Network monitor initialized');
        },

        /**
         * Show toast notification (fallback)
         */
        showToast(message, type = 'info') {
            // Use MartooToast if available
            if (window.MartooToast) {
                window.MartooToast[type]?.(message);
            } else {
                console.log(`[${type}] ${message}`);
            }
        },

        /**
         * Check if online
         */
        isOnline() {
            return navigator.onLine;
        }
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    const Utils = {
        /**
         * Safe query selector
         */
        $(selector, context = document) {
            try {
                return context.querySelector(selector);
            } catch {
                return null;
            }
        },

        /**
         * Safe query selector all
         */
        $$(selector, context = document) {
            try {
                return Array.from(context.querySelectorAll(selector));
            } catch {
                return [];
            }
        },

        /**
         * Debounce function
         */
        debounce(func, wait = 300) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        /**
         * Throttle function
         */
        throttle(func, limit = 300) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Format date
         */
        formatDate(date, format = 'short') {
            if (!date) return '—';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '—';
            
            const options = {
                full: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
                date: { day: 'numeric', month: 'short', year: 'numeric' },
                time: { hour: '2-digit', minute: '2-digit' },
                short: { day: '2-digit', month: '2-digit', year: 'numeric' }
            };
            
            return d.toLocaleDateString('en-ZM', options[format] || options.date);
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
            try {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Get cookie
         */
        getCookie(name) {
            try {
                const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
                return match ? match[2] : null;
            } catch {
                return null;
            }
        },

        /**
         * Delete cookie
         */
        deleteCookie(name) {
            try {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
                return true;
            } catch {
                return false;
            }
        }
    };

    // ===================================================================
    // 🚀 TOAST NOTIFICATION SYSTEM (FALLBACK)
    // ===================================================================
    
    const Toast = {
        /**
         * Show toast notification
         */
        show(message, type = 'info', duration = 5000) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };
            
            toast.innerHTML = `
                <div class="toast-icon">
                    <i class="fas ${icons[type] || icons.info}"></i>
                </div>
                <div class="toast-content">
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                document.body.appendChild(container);
            }
            
            container.appendChild(toast);
            
            toast.querySelector('.toast-close').addEventListener('click', () => {
                toast.remove();
            });
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, duration);
            
            return toast;
        },

        /**
         * Show success toast
         */
        success(message) {
            return this.show(message, 'success');
        },

        /**
         * Show error toast
         */
        error(message) {
            return this.show(message, 'error');
        },

        /**
         * Show warning toast
         */
        warning(message) {
            return this.show(message, 'warning');
        },

        /**
         * Show info toast
         */
        info(message) {
            return this.show(message, 'info');
        }
    };

    // ===================================================================
    // 🚀 INITIALIZATION
    // ===================================================================
    
    function init() {
        // 1. Make config globally available
        window.MARTOO_CONFIG = CONFIG;
        
        // 2. Initialize error handler
        ErrorHandler.init();
        
        // 3. Initialize performance monitoring
        PerformanceMonitor.init();
        
        // 4. Add device classes
        DeviceDetector.addDeviceClasses();
        
        // 5. Initialize network monitoring
        NetworkMonitor.init();
        
        // 6. Make utilities globally available
        window.$ = Utils.$;
        window.$$ = Utils.$$;
        window.MartooUtils = Utils;
        
        // 7. Make toast globally available
        window.MartooToast = Toast;
        
        // 8. Log environment info
        const device = DeviceDetector.getBrowserInfo();
        
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ███╗   ███╗ █████╗ ██████╗ ████████╗ ██████╗  ██████╗ 
║   ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗██╔═══██╗
║   ██╔████╔██║███████║██████╔╝   ██║   ██║   ██║██║   ██║
║   ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   ██║   ██║██║   ██║
║   ██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   ╚██████╔╝╚██████╔╝
║   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝ 
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║   🚀 Version: ${CONFIG.VERSION.padEnd(36)}║
║   🔧 Environment: ${CONFIG.ENV.padEnd(34)}║
║   🌐 Backend: ${CONFIG.API_URL.padEnd(36)}║
║   📱 Device: ${device.name} ${device.version} on ${device.isMobile ? 'Mobile' : 'Desktop'.padEnd(25)}║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `);

        // 9. Dispatch ready event
        const readyEvent = new CustomEvent('martoo:ready', {
            detail: { config: CONFIG, device }
        });
        window.dispatchEvent(readyEvent);
        
        // 10. Check if API is available
        if (window.API) {
            window.API.system.checkHealth()
                .then(() => console.log('✅ Backend connection verified'))
                .catch(() => console.warn('⚠️ Backend connection failed - using offline mode'));
        }
        
        // 11. Remove loading class from body
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
    }

    // ===================================================================
    // 🚀 START APPLICATION
    // ===================================================================
    
    // Add loading class
    document.body.classList.add('loading');
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Page became visible
            const event = new CustomEvent('martoo:visible');
            window.dispatchEvent(event);
        } else {
            // Page became hidden
            const event = new CustomEvent('martoo:hidden');
            window.dispatchEvent(event);
        }
    });

    // Handle before unload
    window.addEventListener('beforeunload', () => {
        // Cleanup if needed
    });

})();
