/**
 * ===================================================================
 * MARTOO TECH WORKS - NAVIGATION MODULE
 * Version: 2.0.0
 * Features: Mobile menu, active states, smooth scroll, dropdowns
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
        selectors: {
            header: '.header',
            navMenu: '.nav-menu',
            mobileToggle: '.mobile-toggle',
            navLink: '.nav-link',
            dropdown: '.dropdown',
            dropdownToggle: '.dropdown-toggle',
            dropdownMenu: '.dropdown-menu'
        },
        classes: {
            active: 'active',
            open: 'open',
            collapsed: 'collapsed',
            menuOpen: 'menu-open'
        },
        breakpoints: {
            mobile: 768
        },
        scrollOffset: 100
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
     * Debounce function for performance
     */
    const debounce = (func, wait = 100) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    /**
     * Get scroll position
     */
    const getScrollPosition = () => {
        return {
            x: window.pageXOffset || document.documentElement.scrollLeft,
            y: window.pageYOffset || document.documentElement.scrollTop
        };
    };

    /**
     * Get element offset
     */
    const getOffset = (element) => {
        if (!element) return { top: 0, left: 0 };
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset
        };
    };

    // ===================================================================
    // 📱 MOBILE MENU
    // ===================================================================
    
    const MobileMenu = {
        header: null,
        navMenu: null,
        mobileToggle: null,
        
        init() {
            this.header = $(CONFIG.selectors.header);
            this.navMenu = $(CONFIG.selectors.navMenu);
            this.mobileToggle = $(CONFIG.selectors.mobileToggle);
            
            if (!this.mobileToggle || !this.navMenu) return;
            
            this.bindEvents();
            this.checkViewport();
        },
        
        bindEvents() {
            // Toggle menu
            this.mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });
            
            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!this.isMenuOpen()) return;
                
                const isClickInside = this.navMenu.contains(e.target) || 
                                     this.mobileToggle.contains(e.target);
                
                if (!isClickInside) {
                    this.closeMenu();
                }
            });
            
            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isMenuOpen()) {
                    this.closeMenu();
                }
            });
            
            // Handle window resize
            window.addEventListener('resize', debounce(() => {
                this.checkViewport();
            }, 250));
            
            // Close menu when clicking on nav link (mobile)
            $$(CONFIG.selectors.navLink, this.navMenu).forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= CONFIG.breakpoints.mobile) {
                        this.closeMenu();
                    }
                });
            });
        },
        
        toggleMenu() {
            if (this.isMenuOpen()) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        },
        
        openMenu() {
            this.mobileToggle?.classList.add(CONFIG.classes.active);
            this.navMenu?.classList.add(CONFIG.classes.active);
            document.body.classList.add(CONFIG.classes.menuOpen);
            document.body.style.overflow = 'hidden';
        },
        
        closeMenu() {
            this.mobileToggle?.classList.remove(CONFIG.classes.active);
            this.navMenu?.classList.remove(CONFIG.classes.active);
            document.body.classList.remove(CONFIG.classes.menuOpen);
            document.body.style.overflow = '';
        },
        
        isMenuOpen() {
            return this.navMenu?.classList.contains(CONFIG.classes.active) || false;
        },
        
        checkViewport() {
            const isMobile = window.innerWidth <= CONFIG.breakpoints.mobile;
            
            if (!isMobile && this.isMenuOpen()) {
                this.closeMenu();
            }
            
            document.body.classList.toggle('is-mobile', isMobile);
        }
    };

    // ===================================================================
    // 🎯 ACTIVE NAVIGATION
    // ===================================================================
    
    const ActiveNav = {
        navLinks: [],
        currentPath: '',
        
        init() {
            this.navLinks = $$(CONFIG.selectors.navLink);
            this.currentPath = window.location.pathname.split('/').pop() || 'index.html';
            this.setActiveFromPath();
            this.bindEvents();
        },
        
        setActiveFromPath() {
            this.navLinks.forEach(link => {
                const href = link.getAttribute('href');
                
                // Clean href
                const cleanHref = href ? href.split('?')[0].split('#')[0] : '';
                
                // Check if this link matches current page
                const isActive = 
                    cleanHref === this.currentPath ||
                    cleanHref === './' + this.currentPath ||
                    (this.currentPath === 'index.html' && 
                     (cleanHref === 'index.html' || cleanHref === './' || cleanHref === '/' || cleanHref === './index.html')) ||
                    (this.currentPath === '' && cleanHref === 'index.html');
                
                if (isActive) {
                    this.setActive(link);
                }
            });
        },
        
        setActive(activeLink) {
            // Remove active class from all links
            this.navLinks.forEach(link => {
                link.classList.remove(CONFIG.classes.active);
            });
            
            // Add active class to current link
            activeLink.classList.add(CONFIG.classes.active);
            
            // Also activate parent dropdown if exists
            const parentDropdown = activeLink.closest(CONFIG.selectors.dropdown);
            if (parentDropdown) {
                const dropdownToggle = $(CONFIG.selectors.dropdownToggle, parentDropdown);
                if (dropdownToggle) {
                    dropdownToggle.classList.add(CONFIG.classes.active);
                }
            }
        },
        
        bindEvents() {
            // Update active state on click
            this.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    // Don't update if it's a dropdown toggle or hash link
                    if (link.classList.contains('dropdown-toggle') || 
                        link.getAttribute('href')?.startsWith('#')) {
                        return;
                    }
                    
                    this.setActive(link);
                });
            });
            
            // Listen for popstate (browser back/forward)
            window.addEventListener('popstate', () => {
                this.currentPath = window.location.pathname.split('/').pop() || 'index.html';
                this.setActiveFromPath();
            });
        }
    };

    // ===================================================================
    // 📜 SMOOTH SCROLL
    // ===================================================================
    
    const SmoothScroll = {
        anchorLinks: [],
        
        init() {
            this.anchorLinks = $$('a[href^="#"]:not([href="#"])');
            this.bindEvents();
            this.checkHash();
        },
        
        bindEvents() {
            this.anchorLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href && href !== '#') {
                        e.preventDefault();
                        this.scrollTo(href);
                    }
                });
            });
        },
        
        scrollTo(target) {
            const targetElement = typeof target === 'string' 
                ? document.querySelector(target)
                : target;
            
            if (!targetElement) return;
            
            const offset = getOffset(targetElement).top - CONFIG.scrollOffset;
            
            window.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
            
            // Update URL hash without jumping
            if (typeof target === 'string') {
                history.pushState(null, null, target);
            }
        },
        
        checkHash() {
            const hash = window.location.hash;
            if (hash) {
                setTimeout(() => {
                    this.scrollTo(hash);
                }, 100);
            }
        },
        
        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    // ===================================================================
    // 🖱️ DROPDOWN MANAGER
    // ===================================================================
    
    const DropdownManager = {
        dropdowns: [],
        
        init() {
            this.dropdowns = $$(CONFIG.selectors.dropdown);
            if (this.dropdowns.length === 0) return;
            this.bindEvents();
        },
        
        bindEvents() {
            this.dropdowns.forEach(dropdown => {
                const toggle = $(CONFIG.selectors.dropdownToggle, dropdown);
                const menu = $(CONFIG.selectors.dropdownMenu, dropdown);
                
                if (!toggle || !menu) return;
                
                // Set ARIA attributes
                toggle.setAttribute('aria-haspopup', 'true');
                toggle.setAttribute('aria-expanded', 'false');
                menu.setAttribute('role', 'menu');
                
                // Toggle on click
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleDropdown(dropdown);
                });
            });
            
            // Close dropdowns on outside click
            document.addEventListener('click', () => {
                this.dropdowns.forEach(dropdown => {
                    this.closeDropdown(dropdown);
                });
            });
            
            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.dropdowns.forEach(dropdown => {
                        this.closeDropdown(dropdown);
                    });
                }
            });
        },
        
        toggleDropdown(dropdown) {
            if (dropdown.classList.contains(CONFIG.classes.open)) {
                this.closeDropdown(dropdown);
            } else {
                this.openDropdown(dropdown);
            }
        },
        
        openDropdown(dropdown) {
            // Close other open dropdowns
            this.dropdowns.forEach(d => {
                if (d !== dropdown) {
                    this.closeDropdown(d);
                }
            });
            
            dropdown.classList.add(CONFIG.classes.open);
            const toggle = $(CONFIG.selectors.dropdownToggle, dropdown);
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'true');
            }
        },
        
        closeDropdown(dropdown) {
            dropdown.classList.remove(CONFIG.classes.open);
            const toggle = $(CONFIG.selectors.dropdownToggle, dropdown);
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        }
    };

    // ===================================================================
    // 🎨 STICKY HEADER
    // ===================================================================
    
    const StickyHeader = {
        header: null,
        lastScroll: 0,
        
        init() {
            this.header = $(CONFIG.selectors.header);
            if (!this.header) return;
            this.bindEvents();
            this.checkSticky();
        },
        
        bindEvents() {
            window.addEventListener('scroll', () => {
                this.checkSticky();
            }, { passive: true });
        },
        
        checkSticky() {
            const scrollPosition = getScrollPosition().y;
            
            if (scrollPosition > 50) {
                this.header.classList.add('sticky');
            } else {
                this.header.classList.remove('sticky');
            }
            
            this.lastScroll = scrollPosition;
        }
    };

    // ===================================================================
    // 🚀 INITIALIZE ALL
    // ===================================================================
    
    function init() {
        // Initialize modules
        MobileMenu.init();
        ActiveNav.init();
        SmoothScroll.init();
        DropdownManager.init();
        StickyHeader.init();
        
        // Add body class for JS enabled
        document.body.classList.add('js-enabled');
        
        console.log('✅ Navigation initialized');
    }

    // Start everything when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

// ===================================================================
// ❌ NO EXPORT STATEMENT HERE - THIS FILE IS PURE BROWSER JS
// ===================================================================
