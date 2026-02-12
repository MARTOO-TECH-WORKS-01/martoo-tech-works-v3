/**
 * ===================================================================
 * MARTOO TECH WORKS - PRODUCTION READY NAVIGATION MODULE
 * Version: 2.0.0
 * Features: Mobile menu, active states, smooth scroll, breadcrumbs,
 *           scroll spy, dropdowns, keyboard navigation
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 NAVIGATION CONFIGURATION
// ===================================================================

const NAV_CONFIG = {
    // Selectors
    selectors: {
        header: '.header',
        navMenu: '.nav-menu',
        mobileToggle: '.mobile-toggle',
        navLink: '.nav-link',
        dropdown: '.dropdown',
        dropdownToggle: '.dropdown-toggle',
        dropdownMenu: '.dropdown-menu',
        breadcrumb: '.breadcrumb',
        breadcrumbItem: '.breadcrumb-item'
    },

    // Classes
    classes: {
        active: 'active',
        open: 'open',
        collapsed: 'collapsed',
        expanded: 'expanded',
        scrolled: 'scrolled',
        menuOpen: 'menu-open',
        dropdownOpen: 'dropdown-open'
    },

    // Breakpoints
    breakpoints: {
        mobile: 768,
        tablet: 992,
        desktop: 1200
    },

    // Scroll offset for anchor links (header height + padding)
    scrollOffset: 100,

    // Smooth scroll duration (ms)
    scrollDuration: 800,

    // Auto-hide header on scroll
    autoHideHeader: false,

    // Breadcrumb separator
    breadcrumbSeparator: '<i class="fas fa-chevron-right"></i>',

    // Debug mode
    debug: false
};

// ===================================================================
// 🔧 UTILITY FUNCTIONS
// ===================================================================

/**
 * Safe query selector with error handling
 */
const $ = (selector, context = document) => {
    try {
        return context.querySelector(selector);
    } catch (error) {
        if (NAV_CONFIG.debug) console.error(`Selector error [${selector}]:`, error);
        return null;
    }
};

/**
 * Safe query selector all with error handling
 */
const $$ = (selector, context = document) => {
    try {
        return Array.from(context.querySelectorAll(selector));
    } catch (error) {
        if (NAV_CONFIG.debug) console.error(`Selector all error [${selector}]:`, error);
        return [];
    }
};

/**
 * Debounce function for performance
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
 * Throttle function for performance
 */
const throttle = (func, limit = 100) => {
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
 * Check if element is in viewport
 */
const isInViewport = (element, offset = 0) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 - offset &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
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
 * Get element offset relative to document
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
// 📱 MOBILE MENU MANAGER
// ===================================================================

const MobileMenu = {
    /**
     * Initialize mobile menu
     */
    init() {
        this.header = $(NAV_CONFIG.selectors.header);
        this.navMenu = $(NAV_CONFIG.selectors.navMenu);
        this.mobileToggle = $(NAV_CONFIG.selectors.mobileToggle);
        
        if (!this.mobileToggle || !this.navMenu) return;
        
        this.bindEvents();
        this.checkViewport();
        
        if (NAV_CONFIG.debug) console.log('📱 Mobile menu initialized');
    },

    /**
     * Bind mobile menu events
     */
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

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            this.checkViewport();
        });

        // Close menu when clicking on nav link
        $$(NAV_CONFIG.selectors.navLink, this.navMenu).forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= NAV_CONFIG.breakpoints.mobile) {
                    this.closeMenu();
                }
            });
        });
    },

    /**
     * Toggle mobile menu
     */
    toggleMenu() {
        if (this.isMenuOpen()) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    },

    /**
     * Open mobile menu
     */
    openMenu() {
        this.mobileToggle?.classList.add(NAV_CONFIG.classes.active);
        this.navMenu?.classList.add(NAV_CONFIG.classes.active);
        document.body.classList.add(NAV_CONFIG.classes.menuOpen);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        this.dispatchEvent('menu:open');
        
        if (NAV_CONFIG.debug) console.log('📱 Mobile menu opened');
    },

    /**
     * Close mobile menu
     */
    closeMenu() {
        this.mobileToggle?.classList.remove(NAV_CONFIG.classes.active);
        this.navMenu?.classList.remove(NAV_CONFIG.classes.active);
        document.body.classList.remove(NAV_CONFIG.classes.menuOpen);
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Close any open dropdowns
        this.closeAllDropdowns();
        
        this.dispatchEvent('menu:close');
        
        if (NAV_CONFIG.debug) console.log('📱 Mobile menu closed');
    },

    /**
     * Check if mobile menu is open
     */
    isMenuOpen() {
        return this.navMenu?.classList.contains(NAV_CONFIG.classes.active) || false;
    },

    /**
     * Check viewport and adjust menu
     */
    checkViewport() {
        const isMobile = window.innerWidth <= NAV_CONFIG.breakpoints.mobile;
        
        if (!isMobile && this.isMenuOpen()) {
            this.closeMenu();
        }
        
        // Update body class for responsive styles
        if (isMobile) {
            document.body.classList.add('is-mobile');
        } else {
            document.body.classList.remove('is-mobile');
        }
    },

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        $$(NAV_CONFIG.selectors.dropdown).forEach(dropdown => {
            dropdown.classList.remove(NAV_CONFIG.classes.dropdownOpen);
            const toggle = $(NAV_CONFIG.selectors.dropdownToggle, dropdown);
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    },

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        try {
            const event = new CustomEvent(eventName, { 
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Event dispatch error:', error);
        }
    }
};

// ===================================================================
// 🎯 ACTIVE NAVIGATION MANAGER
// ===================================================================

const ActiveNav = {
    /**
     * Initialize active navigation
     */
    init() {
        this.navLinks = $$(NAV_CONFIG.selectors.navLink);
        this.currentPath = window.location.pathname.split('/').pop() || 'index.html';
        
        this.setActiveFromPath();
        this.bindEvents();
        
        if (NAV_CONFIG.debug) console.log('🎯 Active navigation initialized');
    },

    /**
     * Set active nav link based on current path
     */
    setActiveFromPath() {
        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Remove query parameters and hash
            const cleanHref = href ? href.split('?')[0].split('#')[0] : '';
            
            // Check if this link matches current page
            const isActive = cleanHref === './' + this.currentPath ||
                            cleanHref === this.currentPath ||
                            (this.currentPath === 'index.html' && (cleanHref === './index.html' || cleanHref === './' || cleanHref === '/')) ||
                            (cleanHref.includes(this.currentPath) && this.currentPath !== '');
            
            if (isActive) {
                this.setActive(link);
            }
        });
    },

    /**
     * Set active nav link
     */
    setActive(activeLink) {
        // Remove active class from all links
        this.navLinks.forEach(link => {
            link.classList.remove(NAV_CONFIG.classes.active);
        });
        
        // Add active class to current link
        activeLink.classList.add(NAV_CONFIG.classes.active);
        
        // Also activate parent dropdown if exists
        const parentDropdown = activeLink.closest(NAV_CONFIG.selectors.dropdown);
        if (parentDropdown) {
            const dropdownToggle = $(NAV_CONFIG.selectors.dropdownToggle, parentDropdown);
            if (dropdownToggle) {
                dropdownToggle.classList.add(NAV_CONFIG.classes.active);
            }
        }
        
        this.dispatchEvent('nav:active', { link: activeLink });
        
        if (NAV_CONFIG.debug) console.log('🎯 Active nav set:', activeLink.textContent.trim());
    },

    /**
     * Bind events
     */
    bindEvents() {
        // Update active state on click
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Don't update if it's a dropdown toggle or hash link
                if (link.classList.contains('dropdown-toggle') || link.getAttribute('href')?.startsWith('#')) {
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
    },

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        try {
            const event = new CustomEvent(eventName, { 
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Event dispatch error:', error);
        }
    }
};

// ===================================================================
// 🖱️ DROPDOWN MANAGER
// ===================================================================

const DropdownManager = {
    /**
     * Initialize dropdowns
     */
    init() {
        this.dropdowns = $$(NAV_CONFIG.selectors.dropdown);
        
        if (this.dropdowns.length === 0) return;
        
        this.bindEvents();
        
        if (NAV_CONFIG.debug) console.log('🖱️ Dropdown manager initialized');
    },

    /**
     * Bind dropdown events
     */
    bindEvents() {
        this.dropdowns.forEach(dropdown => {
            const toggle = $(NAV_CONFIG.selectors.dropdownToggle, dropdown);
            const menu = $(NAV_CONFIG.selectors.dropdownMenu, dropdown);
            
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

            // Keyboard navigation
            toggle.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.toggleDropdown(dropdown);
                        break;
                    case 'Escape':
                        this.closeDropdown(dropdown);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.openDropdown(dropdown);
                        this.focusNextItem(menu);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.openDropdown(dropdown);
                        this.focusPreviousItem(menu);
                        break;
                }
            });
        });

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            this.dropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target)) {
                    this.closeDropdown(dropdown);
                }
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

    /**
     * Toggle dropdown
     */
    toggleDropdown(dropdown) {
        if (dropdown.classList.contains(NAV_CONFIG.classes.dropdownOpen)) {
            this.closeDropdown(dropdown);
        } else {
            this.openDropdown(dropdown);
        }
    },

    /**
     * Open dropdown
     */
    openDropdown(dropdown) {
        // Close other open dropdowns
        this.dropdowns.forEach(d => {
            if (d !== dropdown) {
                this.closeDropdown(d);
            }
        });
        
        dropdown.classList.add(NAV_CONFIG.classes.dropdownOpen);
        const toggle = $(NAV_CONFIG.selectors.dropdownToggle, dropdown);
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
        }
        
        this.dispatchEvent('dropdown:open', { dropdown });
    },

    /**
     * Close dropdown
     */
    closeDropdown(dropdown) {
        dropdown.classList.remove(NAV_CONFIG.classes.dropdownOpen);
        const toggle = $(NAV_CONFIG.selectors.dropdownToggle, dropdown);
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
        }
        
        this.dispatchEvent('dropdown:close', { dropdown });
    },

    /**
     * Focus next menu item
     */
    focusNextItem(menu) {
        const items = $$('a, button', menu);
        const activeElement = document.activeElement;
        const currentIndex = items.indexOf(activeElement);
        
        if (currentIndex < items.length - 1) {
            items[currentIndex + 1].focus();
        } else {
            items[0].focus();
        }
    },

    /**
     * Focus previous menu item
     */
    focusPreviousItem(menu) {
        const items = $$('a, button', menu);
        const activeElement = document.activeElement;
        const currentIndex = items.indexOf(activeElement);
        
        if (currentIndex > 0) {
            items[currentIndex - 1].focus();
        } else {
            items[items.length - 1].focus();
        }
    },

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        try {
            const event = new CustomEvent(eventName, { 
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Event dispatch error:', error);
        }
    }
};

// ===================================================================
// 📜 SCROLL SPY & SMOOTH SCROLL
// ===================================================================

const ScrollManager = {
    /**
     * Initialize scroll manager
     */
    init() {
        this.anchorLinks = $$('a[href^="#"]:not([href="#"])');
        this.sections = [];
        
        this.bindEvents();
        this.collectSections();
        
        if (NAV_CONFIG.debug) console.log('📜 Scroll manager initialized');
    },

    /**
     * Bind scroll events
     */
    bindEvents() {
        // Smooth scroll for anchor links
        this.anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    e.preventDefault();
                    this.smoothScroll(href);
                }
            });
        });

        // Scroll spy
        window.addEventListener('scroll', throttle(() => {
            this.updateScrollSpy();
            this.updateHeaderOnScroll();
        }, 100));

        // Update on load
        window.addEventListener('load', () => {
            this.updateScrollSpy();
            this.checkHash();
        });
    },

    /**
     * Collect sections for scroll spy
     */
    collectSections() {
        this.sections = [];
        this.anchorLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                const section = document.querySelector(href);
                if (section) {
                    this.sections.push({
                        id: href,
                        element: section,
                        link: link
                    });
                }
            }
        });
    },

    /**
     * Smooth scroll to element
     */
    smoothScroll(target) {
        const targetElement = typeof target === 'string' 
            ? document.querySelector(target)
            : target;
        
        if (!targetElement) return;
        
        const offset = getOffset(targetElement).top - NAV_CONFIG.scrollOffset;
        
        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
        
        // Update URL hash without jumping
        if (typeof target === 'string') {
            history.pushState(null, null, target);
        }
        
        this.dispatchEvent('scroll:start', { target: targetElement });
        
        if (NAV_CONFIG.debug) console.log('📜 Smooth scroll to:', target);
    },

    /**
     * Update scroll spy - highlight current section
     */
    updateScrollSpy() {
        const scrollPosition = getScrollPosition().y + NAV_CONFIG.scrollOffset + 50;
        
        let currentSection = null;
        
        // Find the current section
        for (const section of this.sections) {
            const offset = getOffset(section.element).top;
            const height = section.element.offsetHeight;
            
            if (scrollPosition >= offset && scrollPosition < offset + height) {
                currentSection = section;
                break;
            }
        }
        
        // Update active states
        this.sections.forEach(section => {
            const isActive = section === currentSection;
            section.link.classList.toggle(NAV_CONFIG.classes.active, isActive);
        });
    },

    /**
     * Check URL hash on load
     */
    checkHash() {
        const hash = window.location.hash;
        if (hash) {
            setTimeout(() => {
                this.smoothScroll(hash);
            }, 100);
        }
    },

    /**
     * Update header on scroll (hide/show)
     */
    updateHeaderOnScroll() {
        if (!NAV_CONFIG.autoHideHeader) return;
        
        const header = $(NAV_CONFIG.selectors.header);
        if (!header) return;
        
        const scrollPosition = getScrollPosition().y;
        const lastScroll = this.lastScroll || 0;
        
        if (scrollPosition > lastScroll && scrollPosition > 100) {
            header.classList.add(NAV_CONFIG.classes.scrolled);
        } else {
            header.classList.remove(NAV_CONFIG.classes.scrolled);
        }
        
        this.lastScroll = scrollPosition;
    },

    /**
     * Scroll to top
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        try {
            const event = new CustomEvent(eventName, { 
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Event dispatch error:', error);
        }
    }
};

// ===================================================================
// 🍞 BREADCRUMB MANAGER
// ===================================================================

const BreadcrumbManager = {
    /**
     * Initialize breadcrumbs
     */
    init() {
        this.breadcrumb = $(NAV_CONFIG.selectors.breadcrumb);
        
        if (!this.breadcrumb) return;
        
        this.generateBreadcrumbs();
        
        if (NAV_CONFIG.debug) console.log('🍞 Breadcrumb manager initialized');
    },

    /**
     * Generate breadcrumbs based on current path
     */
    generateBreadcrumbs() {
        const path = window.location.pathname;
        const pathSegments = path.split('/').filter(segment => segment && !segment.includes('.html'));
        const fileName = path.split('/').pop() || 'index.html';
        
        let breadcrumbHtml = '';
        let currentPath = '';
        
        // Add home
        breadcrumbHtml += `
            <li class="breadcrumb-item">
                <a href="./index.html">
                    <i class="fas fa-home"></i>
                    <span>Home</span>
                </a>
            </li>
        `;
        
        // Add path segments
        pathSegments.forEach(segment => {
            currentPath += `/${segment}`;
            breadcrumbHtml += `
                <li class="breadcrumb-item">
                    <a href=".${currentPath}/">
                        ${this.formatSegmentName(segment)}
                    </a>
                </li>
            `;
        });
        
        // Add current page
        const pageName = this.getPageName(fileName);
        breadcrumbHtml += `
            <li class="breadcrumb-item active" aria-current="page">
                ${pageName}
            </li>
        `;
        
        this.breadcrumb.innerHTML = breadcrumbHtml;
    },

    /**
     * Format segment name for display
     */
    formatSegmentName(segment) {
        return segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },

    /**
     * Get page name from filename
     */
    getPageName(fileName) {
        const pageNames = {
            'index.html': 'Home',
            'about.html': 'About Us',
            'services.html': 'Services',
            'academy.html': 'Academy',
            'portfolio.html': 'Portfolio',
            'blog.html': 'Insights',
            'contact.html': 'Contact',
            'login.html': 'Sign In',
            'register.html': 'Create Account',
            'user_dashboard.html': 'Dashboard',
            'admin-dashboard.html': 'Admin Dashboard',
            'software_downloads.html': 'Software Downloads',
            'terms.html': 'Terms of Service',
            'privacy.html': 'Privacy Policy',
            'refund-policy.html': 'Refund Policy'
        };
        
        return pageNames[fileName] || fileName.replace('.html', '').split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
};

// ===================================================================
// 🔍 SEARCH BAR MANAGER
// ===================================================================

const SearchManager = {
    /**
     * Initialize search
     */
    init() {
        this.searchInput = $('.header-search input');
        this.searchButton = $('[data-action="search"]');
        
        if (!this.searchInput && !this.searchButton) return;
        
        this.bindEvents();
        
        if (NAV_CONFIG.debug) console.log('🔍 Search manager initialized');
    },

    /**
     * Bind search events
     */
    bindEvents() {
        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', debounce((e) => {
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    this.performSearch(query);
                }
            }, 500));
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value.trim();
                    if (query) {
                        this.performSearch(query);
                    }
                }
            });
        }
        
        // Search button
        if (this.searchButton) {
            this.searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.openSearchModal();
            });
        }
        
        // Keyboard shortcut: Ctrl+K or Cmd+K
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearchModal();
            }
        });
    },

    /**
     * Perform search
     */
    performSearch(query) {
        this.dispatchEvent('search:perform', { query });
        
        // Redirect to search results page
        // window.location.href = `./search.html?q=${encodeURIComponent(query)}`;
        
        if (NAV_CONFIG.debug) console.log('🔍 Search:', query);
    },

    /**
     * Open search modal
     */
    openSearchModal() {
        this.dispatchEvent('search:open');
        
        // Dispatch custom event for search modal
        const event = new CustomEvent('openSearchModal');
        window.dispatchEvent(event);
        
        if (NAV_CONFIG.debug) console.log('🔍 Search modal opened');
    },

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        try {
            const event = new CustomEvent(eventName, { 
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Event dispatch error:', error);
        }
    }
};

// ===================================================================
// 🎨 STICKY HEADER MANAGER
// ===================================================================

const StickyHeader = {
    /**
     * Initialize sticky header
     */
    init() {
        this.header = $(NAV_CONFIG.selectors.header);
        
        if (!this.header) return;
        
        this.bindEvents();
        this.checkSticky();
        
        if (NAV_CONFIG.debug) console.log('🎨 Sticky header initialized');
    },

    /**
     * Bind sticky header events
     */
    bindEvents() {
        window.addEventListener('scroll', throttle(() => {
            this.checkSticky();
        }, 50));
        
        window.addEventListener('resize', debounce(() => {
            this.checkSticky();
        }, 250));
    },

    /**
     * Check sticky state
     */
    checkSticky() {
        const scrollPosition = getScrollPosition().y;
        
        if (scrollPosition > 50) {
            this.header.classList.add('sticky');
            document.body.classList.add('has-sticky-header');
        } else {
            this.header.classList.remove('sticky');
            document.body.classList.remove('has-sticky-header');
        }
    }
};

// ===================================================================
// 📱 RESPONSIVE TABLE MANAGER
// ===================================================================

const ResponsiveTable = {
    /**
     * Initialize responsive tables
     */
    init() {
        this.tables = $$('table');
        
        if (this.tables.length === 0) return;
        
        this.wrapTables();
        
        if (NAV_CONFIG.debug) console.log('📱 Responsive table manager initialized');
    },

    /**
     * Wrap tables in responsive container
     */
    wrapTables() {
        this.tables.forEach(table => {
            // Skip if already wrapped
            if (table.parentElement?.classList.contains('table-responsive')) {
                return;
            }
            
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            wrapper.setAttribute('aria-label', 'Scrollable table');
            
            table.parentNode?.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }
};

// ===================================================================
// 🧭 MAIN NAVIGATION MODULE
// ===================================================================

const Navigation = {
    // Modules
    mobile: MobileMenu,
    active: ActiveNav,
    dropdowns: DropdownManager,
    scroll: ScrollManager,
    breadcrumb: BreadcrumbManager,
    search: SearchManager,
    sticky: StickyHeader,
    responsive: ResponsiveTable,

    // Utilities
    utils: {
        $,
        $$,
        debounce,
        throttle,
        isInViewport,
        getScrollPosition,
        getOffset,
        smoothScroll: (target) => ScrollManager.smoothScroll(target),
        scrollToTop: () => ScrollManager.scrollToTop()
    },

    // Configuration
    config: NAV_CONFIG,

    /**
     * Initialize all navigation modules
     */
    init() {
        // Initialize modules in order
        this.sticky.init();
        this.mobile.init();
        this.active.init();
        this.dropdowns.init();
        this.scroll.init();
        this.breadcrumb.init();
        this.search.init();
        this.responsive.init();
        
        // Add body class for JS enabled
        document.body.classList.add('js-enabled');
        
        this.dispatchEvent('navigation:init');
        
        if (NAV_CONFIG.debug) {
            console.log('🧭 Navigation module v2.0.0 initialized');
        }
    },

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        try {
            const event = new CustomEvent(eventName, { 
                detail,
                bubbles: true,
                cancelable: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Event dispatch error:', error);
        }
    },

    /**
     * Version
     */
    version: '2.0.0'
};

// ===================================================================
// 🌐 EXPORT TO GLOBAL SCOPE
// ===================================================================

// Make Navigation module available globally
if (typeof window !== 'undefined') {
    window.Navigation = Navigation;
    window.MobileMenu = MobileMenu;
    window.ActiveNav = ActiveNav;
    window.ScrollManager = ScrollManager;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Navigation.init());
    } else {
        Navigation.init();
    }
    
    // Handle page load with hash
    window.addEventListener('load', () => {
        if (window.location.hash) {
            setTimeout(() => {
                Navigation.scroll.smoothScroll(window.location.hash);
            }, 100);
        }
    });
    
    console.log('🧭 Martoo Navigation v2.0.0 initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}

export default Navigation;
