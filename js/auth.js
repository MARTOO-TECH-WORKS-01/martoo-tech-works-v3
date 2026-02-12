/**
 * ===================================================================
 * MARTOO TECH WORKS - PRODUCTION READY AUTHENTICATION MODULE
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel
 * Authentication: JWT + Admin Token
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 AUTHENTICATION CONFIGURATION
// ===================================================================

const AUTH_CONFIG = {
    // Token storage keys
    TOKEN_KEY: 'martoo_token',
    USER_KEY: 'martoo_user',
    REMEMBER_KEY: 'martoo_remember',
    
    // Session duration
    SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
    REMEMBER_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
    
    // Routes
    LOGIN_URL: './login.html',
    DASHBOARD_URL: './user_dashboard.html',
    ADMIN_DASHBOARD_URL: './admin-dashboard.html',
    
    // Events
    EVENTS: {
        LOGIN: 'auth:login',
        LOGOUT: 'auth:logout',
        TOKEN_REFRESHED: 'auth:tokenRefreshed',
        SESSION_EXPIRED: 'auth:sessionExpired'
    }
};

// ===================================================================
// 🔧 UTILITY FUNCTIONS
// ===================================================================

/**
 * Safe localStorage getter with error handling
 */
const safeLocalStorageGet = (key) => {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error('localStorage access error:', error);
        return null;
    }
};

/**
 * Safe localStorage setter with error handling
 */
const safeLocalStorageSet = (key, value) => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error('localStorage set error:', error);
        return false;
    }
};

/**
 * Safe localStorage remove with error handling
 */
const safeLocalStorageRemove = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('localStorage remove error:', error);
        return false;
    }
};

/**
 * Safe sessionStorage getter with error handling
 */
const safeSessionStorageGet = (key) => {
    try {
        return sessionStorage.getItem(key);
    } catch (error) {
        console.error('sessionStorage access error:', error);
        return null;
    }
};

/**
 * Safe sessionStorage setter with error handling
 */
const safeSessionStorageSet = (key, value) => {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error('sessionStorage set error:', error);
        return false;
    }
};

/**
 * Safe sessionStorage remove with error handling
 */
const safeSessionStorageRemove = (key) => {
    try {
        sessionStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('sessionStorage remove error:', error);
        return false;
    }
};

/**
 * Parse JWT token to get payload
 */
const parseJwt = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('JWT parse error:', error);
        return null;
    }
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
};

// ===================================================================
// 🔐 CORE AUTHENTICATION FUNCTIONS
// ===================================================================

const Auth = {
    /**
     * Get authentication token from storage
     * @returns {string|null} JWT token or null
     */
    getToken() {
        return safeLocalStorageGet(AUTH_CONFIG.TOKEN_KEY) || 
               safeSessionStorageGet(AUTH_CONFIG.TOKEN_KEY) || 
               null;
    },

    /**
     * Store authentication token
     * @param {string} token - JWT token
     * @param {boolean} remember - Whether to remember user
     */
    setToken(token, remember = false) {
        if (remember) {
            safeLocalStorageSet(AUTH_CONFIG.TOKEN_KEY, token);
            safeLocalStorageSet(AUTH_CONFIG.REMEMBER_KEY, 'true');
            safeSessionStorageRemove(AUTH_CONFIG.TOKEN_KEY);
        } else {
            safeSessionStorageSet(AUTH_CONFIG.TOKEN_KEY, token);
            safeLocalStorageRemove(AUTH_CONFIG.TOKEN_KEY);
            safeLocalStorageRemove(AUTH_CONFIG.REMEMBER_KEY);
        }
        
        // Also set cookie as backup
        this.setTokenCookie(token, remember);
        
        // Dispatch event
        this.dispatchEvent(AUTH_CONFIG.EVENTS.TOKEN_REFRESHED, { token });
    },

    /**
     * Set token in cookie for server-side auth
     * @param {string} token - JWT token
     * @param {boolean} remember - Whether to remember user
     */
    setTokenCookie(token, remember = false) {
        try {
            const expiry = remember ? AUTH_CONFIG.REMEMBER_DURATION : AUTH_CONFIG.SESSION_DURATION;
            const date = new Date();
            date.setTime(date.getTime() + expiry);
            document.cookie = `${AUTH_CONFIG.TOKEN_KEY}=${token}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
        } catch (error) {
            console.error('Cookie set error:', error);
        }
    },

    /**
     * Remove token cookie
     */
    removeTokenCookie() {
        try {
            document.cookie = `${AUTH_CONFIG.TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
        } catch (error) {
            console.error('Cookie remove error:', error);
        }
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Check if token is expired
        if (isTokenExpired(token)) {
            this.logout();
            return false;
        }
        
        return true;
    },

    /**
     * Check if user is admin
     * @returns {boolean} Admin status
     */
    isAdmin() {
        const user = this.getUser();
        if (!user) return false;
        
        // Check admin role
        if (user.role === 'admin') return true;
        
        // Check admin email (fallback)
        const adminEmail = window.MARTOO_CONFIG?.ADMIN_EMAIL;
        if (adminEmail && user.email === adminEmail) return true;
        
        return false;
    },

    /**
     * Get current user data
     * @returns {Object|null} User object or null
     */
    getUser() {
        const userData = safeLocalStorageGet(AUTH_CONFIG.USER_KEY) || 
                        safeSessionStorageGet(AUTH_CONFIG.USER_KEY);
        
        if (!userData) return null;
        
        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('User data parse error:', error);
            return null;
        }
    },

    /**
     * Store user data
     * @param {Object} user - User object
     * @param {boolean} remember - Whether to remember user
     */
    setUser(user, remember = false) {
        const userString = JSON.stringify(user);
        
        if (remember) {
            safeLocalStorageSet(AUTH_CONFIG.USER_KEY, userString);
            safeSessionStorageRemove(AUTH_CONFIG.USER_KEY);
        } else {
            safeSessionStorageSet(AUTH_CONFIG.USER_KEY, userString);
            safeLocalStorageRemove(AUTH_CONFIG.USER_KEY);
        }
    },

    /**
     * Update user data
     * @param {Object} updates - Partial user updates
     */
    updateUser(updates) {
        const currentUser = this.getUser();
        if (!currentUser) return false;
        
        const updatedUser = { ...currentUser, ...updates };
        const remember = safeLocalStorageGet(AUTH_CONFIG.REMEMBER_KEY) === 'true';
        this.setUser(updatedUser, remember);
        
        return true;
    },

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {boolean} remember - Remember me flag
     * @returns {Promise} Login response
     */
    async login(email, password, remember = false) {
        try {
            const response = await window.MartooAPI.auth.login(email, password);
            
            if (response.success) {
                // Store token
                this.setToken(response.data.token, remember);
                
                // Store user data
                this.setUser(response.data.user, remember);
                
                // Store remembered email
                if (remember) {
                    safeLocalStorageSet('martoo_remembered_email', email);
                } else {
                    safeLocalStorageRemove('martoo_remembered_email');
                }
                
                // Dispatch login event
                this.dispatchEvent(AUTH_CONFIG.EVENTS.LOGIN, {
                    user: response.data.user,
                    remember
                });
                
                return {
                    success: true,
                    user: response.data.user,
                    redirect: this.getDashboardUrl(response.data.user.role)
                };
            }
            
            return response;
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.error || 'Login failed. Please try again.'
            };
        }
    },

    /**
     * Admin login
     * @param {string} email - Admin email
     * @param {string} password - Admin password
     * @param {boolean} remember - Remember me flag
     * @returns {Promise} Login response
     */
    async adminLogin(email, password, remember = false) {
        try {
            const response = await window.MartooAPI.auth.adminLogin(email, password);
            
            if (response.success) {
                // Store token
                this.setToken(response.data.token, remember);
                
                // Store admin user data
                const adminUser = {
                    id: 'admin',
                    email: response.data.user.email,
                    name: response.data.user.name || 'Administrator',
                    role: 'admin'
                };
                this.setUser(adminUser, remember);
                
                // Dispatch login event
                this.dispatchEvent(AUTH_CONFIG.EVENTS.LOGIN, {
                    user: adminUser,
                    remember,
                    isAdmin: true
                });
                
                return {
                    success: true,
                    user: adminUser,
                    redirect: AUTH_CONFIG.ADMIN_DASHBOARD_URL
                };
            }
            
            return response;
        } catch (error) {
            console.error('Admin login error:', error);
            return {
                success: false,
                error: error.error || 'Admin login failed. Please try again.'
            };
        }
    },

    /**
     * Logout user
     * @param {boolean} redirect - Whether to redirect to login
     */
    logout(redirect = true) {
        // Clear stored data
        safeLocalStorageRemove(AUTH_CONFIG.TOKEN_KEY);
        safeLocalStorageRemove(AUTH_CONFIG.USER_KEY);
        safeLocalStorageRemove(AUTH_CONFIG.REMEMBER_KEY);
        safeSessionStorageRemove(AUTH_CONFIG.TOKEN_KEY);
        safeSessionStorageRemove(AUTH_CONFIG.USER_KEY);
        
        // Clear cookie
        this.removeTokenCookie();
        
        // Clear any other auth-related items
        safeLocalStorageRemove('martoo_redirect_after_login');
        
        // Dispatch logout event
        this.dispatchEvent(AUTH_CONFIG.EVENTS.LOGOUT);
        
        // Redirect to login
        if (redirect) {
            window.location.href = AUTH_CONFIG.LOGIN_URL;
        }
    },

    /**
     * Get dashboard URL based on user role
     * @param {string} role - User role
     * @returns {string} Dashboard URL
     */
    getDashboardUrl(role) {
        return role === 'admin' 
            ? AUTH_CONFIG.ADMIN_DASHBOARD_URL 
            : AUTH_CONFIG.DASHBOARD_URL;
    },

    /**
     * Redirect to appropriate dashboard
     */
    redirectToDashboard() {
        const user = this.getUser();
        if (!user) {
            window.location.href = AUTH_CONFIG.LOGIN_URL;
            return;
        }
        
        const dashboardUrl = this.getDashboardUrl(user.role);
        window.location.href = dashboardUrl;
    },

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
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
     * Add auth event listener
     * @param {string} eventName - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(eventName, callback) {
        window.addEventListener(eventName, callback);
    },

    /**
     * Remove auth event listener
     * @param {string} eventName - Event name
     * @param {Function} callback - Event callback
     */
    removeEventListener(eventName, callback) {
        window.removeEventListener(eventName, callback);
    },

    /**
     * Check token validity
     * @returns {Promise<boolean>} Token validity status
     */
    async validateToken() {
        const token = this.getToken();
        if (!token) return false;
        
        try {
            // Try to get user profile to validate token
            const response = await window.MartooAPI.auth.getProfile();
            return response.success;
        } catch (error) {
            console.error('Token validation error:', error);
            
            // If token is invalid, logout
            if (error.status === 401 || error.status === 403) {
                this.logout();
            }
            
            return false;
        }
    },

    /**
     * Refresh authentication state
     * @returns {Promise<boolean>} Refresh success
     */
    async refreshAuthState() {
        if (!this.isAuthenticated()) return false;
        
        try {
            const response = await window.MartooAPI.auth.getProfile();
            if (response.success) {
                const remember = safeLocalStorageGet(AUTH_CONFIG.REMEMBER_KEY) === 'true';
                this.setUser(response.data.user, remember);
                return true;
            }
        } catch (error) {
            console.error('Auth refresh error:', error);
        }
        
        return false;
    },

    /**
     * Get login redirect URL
     * @returns {string} Login URL with redirect parameter
     */
    getLoginUrl(redirect = null) {
        const redirectUrl = redirect || window.location.pathname;
        return `${AUTH_CONFIG.LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
    },

    /**
     * Require authentication for current page
     * @param {boolean} requireAdmin - Whether admin access is required
     */
    requireAuth(requireAdmin = false) {
        if (!this.isAuthenticated()) {
            // Store current URL for redirect after login
            safeSessionStorageSet('martoo_redirect_after_login', window.location.pathname);
            
            // Redirect to login
            window.location.href = this.getLoginUrl(window.location.pathname);
            return false;
        }
        
        if (requireAdmin && !this.isAdmin()) {
            // Not an admin, redirect to user dashboard
            window.location.href = AUTH_CONFIG.DASHBOARD_URL;
            return false;
        }
        
        return true;
    },

    /**
     * Initialize auth state on page load
     */
    async init() {
        // Check if current page requires auth
        const protectedPages = [
            '/user_dashboard.html',
            '/admin-dashboard.html',
            '/dashboard.html',
            '/profile.html',
            '/settings.html'
        ];
        
        const currentPath = window.location.pathname;
        const requiresAuth = protectedPages.some(page => currentPath.includes(page));
        const requiresAdmin = currentPath.includes('admin-dashboard.html');
        
        if (requiresAuth) {
            const isAuthenticated = await this.validateToken();
            
            if (!isAuthenticated) {
                this.logout(true);
                return;
            }
            
            if (requiresAdmin && !this.isAdmin()) {
                window.location.href = AUTH_CONFIG.DASHBOARD_URL;
                return;
            }
        }
        
        // Check for redirect after login
        const redirectUrl = safeSessionStorageGet('martoo_redirect_after_login');
        if (redirectUrl && this.isAuthenticated()) {
            safeSessionStorageRemove('martoo_redirect_after_login');
            
            // Only redirect if not already on that page
            if (!window.location.pathname.includes(redirectUrl)) {
                window.location.href = redirectUrl;
            }
        }
        
        // Dispatch auth state event
        this.dispatchEvent('auth:stateChanged', {
            isAuthenticated: this.isAuthenticated(),
            isAdmin: this.isAdmin(),
            user: this.getUser()
        });
        
        console.log('🔐 Auth module initialized', {
            authenticated: this.isAuthenticated(),
            admin: this.isAdmin()
        });
    }
};

// ===================================================================
// 🛡️ ROUTE PROTECTION HELPER
// ===================================================================

const RouteGuard = {
    /**
     * Protect route based on authentication
     * @param {Object} options - Route protection options
     */
    protect(options = {}) {
        const {
            requireAuth = true,
            requireAdmin = false,
            redirectTo = AUTH_CONFIG.LOGIN_URL,
            fallback = null
        } = options;
        
        if (requireAuth && !Auth.isAuthenticated()) {
            if (redirectTo) {
                window.location.href = redirectTo;
            }
            return fallback;
        }
        
        if (requireAdmin && !Auth.isAdmin()) {
            if (redirectTo) {
                window.location.href = AUTH_CONFIG.DASHBOARD_URL;
            }
            return fallback;
        }
        
        return true;
    },
    
    /**
     * Create middleware for protected routes
     */
    middleware() {
        return async (to, from, next) => {
            const isAuthenticated = Auth.isAuthenticated();
            const isAdmin = Auth.isAdmin();
            const requiresAuth = to.meta?.requiresAuth ?? true;
            const requiresAdmin = to.meta?.requiresAdmin ?? false;
            
            if (requiresAuth && !isAuthenticated) {
                next(AUTH_CONFIG.LOGIN_URL);
                return;
            }
            
            if (requiresAdmin && !isAdmin) {
                next(AUTH_CONFIG.DASHBOARD_URL);
                return;
            }
            
            next();
        };
    }
};

// ===================================================================
// 🔑 PASSWORD MANAGEMENT
// ===================================================================

const PasswordManager = {
    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result
     */
    validateStrength(password) {
        const errors = [];
        let strength = 0;
        
        if (!password) {
            errors.push('Password is required');
            return { valid: false, errors, strength: 0 };
        }
        
        // Length check
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters');
        } else {
            strength += 1;
        }
        
        if (password.length >= 12) {
            strength += 1;
        }
        
        // Uppercase check
        if (!/[A-Z]/.test(password)) {
            errors.push('Must contain uppercase letter');
        } else {
            strength += 1;
        }
        
        // Lowercase check
        if (!/[a-z]/.test(password)) {
            errors.push('Must contain lowercase letter');
        } else {
            strength += 1;
        }
        
        // Number check
        if (!/[0-9]/.test(password)) {
            errors.push('Must contain number');
        } else {
            strength += 1;
        }
        
        // Special character check
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Must contain special character');
        } else {
            strength += 1;
        }
        
        // Common passwords check
        const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common');
            strength = Math.max(0, strength - 2);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            strength: Math.min(6, strength),
            strengthLabel: this.getStrengthLabel(strength)
        };
    },
    
    /**
     * Get password strength label
     * @param {number} strength - Strength score
     * @returns {string} Strength label
     */
    getStrengthLabel(strength) {
        if (strength <= 1) return 'Very Weak';
        if (strength === 2) return 'Weak';
        if (strength === 3) return 'Fair';
        if (strength === 4) return 'Good';
        if (strength === 5) return 'Strong';
        if (strength >= 6) return 'Very Strong';
        return 'Enter password';
    },
    
    /**
     * Generate secure random password
     * @param {number} length - Password length
     * @returns {string} Generated password
     */
    generatePassword(length = 12) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*';
        
        let password = '';
        
        // Ensure at least one of each character type
        password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
        password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
        password += special.charAt(Math.floor(Math.random() * special.length));
        
        // Fill remaining length
        const allChars = uppercase + lowercase + numbers + special;
        for (let i = 4; i < length; i++) {
            password += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        
        // Shuffle password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    },
    
    /**
     * Check if passwords match
     * @param {string} password - Password
     * @param {string} confirm - Confirm password
     * @returns {boolean} Passwords match
     */
    doPasswordsMatch(password, confirm) {
        return password === confirm;
    }
};

// ===================================================================
// 🔄 SESSION MANAGEMENT
// ===================================================================

const SessionManager = {
    /**
     * Get session expiry time
     * @returns {number|null} Expiry timestamp
     */
    getExpiry() {
        const token = Auth.getToken();
        if (!token) return null;
        
        const payload = parseJwt(token);
        return payload?.exp ? payload.exp * 1000 : null;
    },
    
    /**
     * Get remaining session time in milliseconds
     * @returns {number} Remaining time
     */
    getRemainingTime() {
        const expiry = this.getExpiry();
        if (!expiry) return 0;
        
        return Math.max(0, expiry - Date.now());
    },
    
    /**
     * Check if session is about to expire
     * @param {number} threshold - Time threshold in ms
     * @returns {boolean} Session expiring soon
     */
    isExpiringSoon(threshold = 5 * 60 * 1000) { // 5 minutes default
        const remaining = this.getRemainingTime();
        return remaining > 0 && remaining < threshold;
    },
    
    /**
     * Extend session
     * @returns {Promise<boolean>} Extension success
     */
    async extend() {
        if (!Auth.isAuthenticated()) return false;
        
        try {
            // Refresh token by validating
            const isValid = await Auth.validateToken();
            return isValid;
        } catch (error) {
            console.error('Session extension error:', error);
            return false;
        }
    },
    
    /**
     * Start session monitoring
     * @param {Function} onExpiry - Callback on expiry
     */
    startMonitoring(onExpiry) {
        // Check session every minute
        const interval = setInterval(async () => {
            if (!Auth.isAuthenticated()) {
                clearInterval(interval);
                return;
            }
            
            if (this.isExpiringSoon()) {
                const extended = await this.extend();
                if (!extended) {
                    Auth.dispatchEvent(AUTH_CONFIG.EVENTS.SESSION_EXPIRED);
                    if (onExpiry) onExpiry();
                }
            }
        }, 60000); // 1 minute
        
        return interval;
    },
    
    /**
     * Stop session monitoring
     * @param {number} interval - Interval ID
     */
    stopMonitoring(interval) {
        clearInterval(interval);
    }
};

// ===================================================================
// 📝 AUTH FORM HANDLERS
// ===================================================================

const AuthForms = {
    /**
     * Handle login form submission
     * @param {HTMLFormElement} form - Login form
     * @param {Object} options - Form options
     */
    async handleLogin(form, options = {}) {
        const {
            onSuccess,
            onError,
            rememberField = 'remember'
        } = options;
        
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get(rememberField) === 'on';
        
        try {
            const result = await Auth.login(email, password, remember);
            
            if (result.success) {
                if (onSuccess) {
                    onSuccess(result);
                } else {
                    window.location.href = result.redirect;
                }
            } else {
                if (onError) {
                    onError(result.error);
                }
            }
            
            return result;
        } catch (error) {
            console.error('Login form error:', error);
            const errorMessage = error.error || 'Login failed. Please try again.';
            
            if (onError) {
                onError(errorMessage);
            }
            
            return { success: false, error: errorMessage };
        }
    },
    
    /**
     * Handle registration form submission
     * @param {HTMLFormElement} form - Registration form
     * @param {Object} options - Form options
     */
    async handleRegistration(form, options = {}) {
        const {
            onSuccess,
            onError,
            validatePassword = true
        } = options;
        
        const formData = new FormData(form);
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const course = formData.get('course');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const notes = formData.get('notes');
        
        // Validation
        if (!firstName || !lastName) {
            const error = 'Please enter your full name';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        if (!email) {
            const error = 'Please enter your email address';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const error = 'Please enter a valid email address';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        if (phone) {
            const phoneRegex = /^(\+?260|0)[97]\d{8}$/;
            if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                const error = 'Please enter a valid Zambian phone number';
                if (onError) onError(error);
                return { success: false, error };
            }
        }
        
        if (!course) {
            const error = 'Please select a course';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        if (validatePassword) {
            const passwordValidation = PasswordManager.validateStrength(password);
            if (!passwordValidation.valid) {
                const error = passwordValidation.errors[0];
                if (onError) onError(error);
                return { success: false, error };
            }
            
            if (!PasswordManager.doPasswordsMatch(password, confirmPassword)) {
                const error = 'Passwords do not match';
                if (onError) onError(error);
                return { success: false, error };
            }
        }
        
        try {
            // Format phone number
            const formattedPhone = phone ? 
                (phone.startsWith('0') ? '+260' + phone.substring(1) : phone) : 
                null;
            
            const enrollmentData = {
                name: `${firstName} ${lastName}`.trim(),
                email,
                phone: formattedPhone,
                course,
                notes: notes || null
            };
            
            const response = await window.MartooAPI.enrollments.createEnrollment(enrollmentData);
            
            if (response.success) {
                if (onSuccess) {
                    onSuccess({
                        enrollmentId: response.data.id,
                        email,
                        course
                    });
                }
                
                return {
                    success: true,
                    enrollmentId: response.data.id
                };
            } else {
                if (onError) onError(response.error || 'Registration failed');
                return response;
            }
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error.error || 'Registration failed. Please try again.';
            
            if (onError) onError(errorMessage);
            return { success: false, error: errorMessage };
        }
    },
    
    /**
     * Handle password reset request
     * @param {HTMLFormElement} form - Forgot password form
     * @param {Object} options - Form options
     */
    async handleForgotPassword(form, options = {}) {
        const {
            onSuccess,
            onError
        } = options;
        
        const formData = new FormData(form);
        const email = formData.get('email');
        
        if (!email) {
            const error = 'Please enter your email address';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const error = 'Please enter a valid email address';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        try {
            const response = await window.MartooAPI.auth.forgotPassword(email);
            
            if (response.success) {
                if (onSuccess) {
                    onSuccess({ email });
                }
            } else {
                if (onError) onError(response.error || 'Password reset request failed');
            }
            
            return response;
        } catch (error) {
            console.error('Forgot password error:', error);
            const errorMessage = error.error || 'Request failed. Please try again.';
            
            if (onError) onError(errorMessage);
            return { success: false, error: errorMessage };
        }
    },
    
    /**
     * Handle password reset
     * @param {HTMLFormElement} form - Reset password form
     * @param {string} token - Reset token
     * @param {Object} options - Form options
     */
    async handleResetPassword(form, token, options = {}) {
        const {
            onSuccess,
            onError,
            validatePassword = true
        } = options;
        
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        if (!token) {
            const error = 'Invalid or expired reset token';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        if (validatePassword) {
            const passwordValidation = PasswordManager.validateStrength(password);
            if (!passwordValidation.valid) {
                const error = passwordValidation.errors[0];
                if (onError) onError(error);
                return { success: false, error };
            }
            
            if (!PasswordManager.doPasswordsMatch(password, confirmPassword)) {
                const error = 'Passwords do not match';
                if (onError) onError(error);
                return { success: false, error };
            }
        }
        
        try {
            const response = await window.MartooAPI.auth.resetPassword(token, password);
            
            if (response.success) {
                if (onSuccess) onSuccess();
            } else {
                if (onError) onError(response.error || 'Password reset failed');
            }
            
            return response;
        } catch (error) {
            console.error('Reset password error:', error);
            const errorMessage = error.error || 'Password reset failed. Please try again.';
            
            if (onError) onError(errorMessage);
            return { success: false, error: errorMessage };
        }
    },
    
    /**
     * Handle password change (authenticated)
     * @param {HTMLFormElement} form - Change password form
     * @param {Object} options - Form options
     */
    async handleChangePassword(form, options = {}) {
        const {
            onSuccess,
            onError,
            validatePassword = true
        } = options;
        
        const formData = new FormData(form);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        
        if (!currentPassword) {
            const error = 'Please enter your current password';
            if (onError) onError(error);
            return { success: false, error };
        }
        
        if (validatePassword) {
            const passwordValidation = PasswordManager.validateStrength(newPassword);
            if (!passwordValidation.valid) {
                const error = passwordValidation.errors[0];
                if (onError) onError(error);
                return { success: false, error };
            }
            
            if (!PasswordManager.doPasswordsMatch(newPassword, confirmPassword)) {
                const error = 'New passwords do not match';
                if (onError) onError(error);
                return { success: false, error };
            }
            
            if (currentPassword === newPassword) {
                const error = 'New password must be different from current password';
                if (onError) onError(error);
                return { success: false, error };
            }
        }
        
        try {
            const response = await window.MartooAPI.auth.changePassword(currentPassword, newPassword);
            
            if (response.success) {
                if (onSuccess) onSuccess();
            } else {
                if (onError) onError(response.error || 'Password change failed');
            }
            
            return response;
        } catch (error) {
            console.error('Change password error:', error);
            const errorMessage = error.error || 'Password change failed. Please try again.';
            
            if (onError) onError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }
};

// ===================================================================
// 📦 EXPORT PUBLIC API
// ===================================================================

const AuthModule = {
    // Core authentication
    getToken: Auth.getToken.bind(Auth),
    setToken: Auth.setToken.bind(Auth),
    isAuthenticated: Auth.isAuthenticated.bind(Auth),
    isAdmin: Auth.isAdmin.bind(Auth),
    getUser: Auth.getUser.bind(Auth),
    setUser: Auth.setUser.bind(Auth),
    updateUser: Auth.updateUser.bind(Auth),
    login: Auth.login.bind(Auth),
    adminLogin: Auth.adminLogin.bind(Auth),
    logout: Auth.logout.bind(Auth),
    
    // Session management
    validateToken: Auth.validateToken.bind(Auth),
    refreshAuthState: Auth.refreshAuthState.bind(Auth),
    requireAuth: Auth.requireAuth.bind(Auth),
    redirectToDashboard: Auth.redirectToDashboard.bind(Auth),
    getDashboardUrl: Auth.getDashboardUrl.bind(Auth),
    getLoginUrl: Auth.getLoginUrl.bind(Auth),
    
    // Events
    addEventListener: Auth.addEventListener.bind(Auth),
    removeEventListener: Auth.removeEventListener.bind(Auth),
    dispatchEvent: Auth.dispatchEvent.bind(Auth),
    
    // Initialization
    init: Auth.init.bind(Auth),
    
    // Password management
    password: PasswordManager,
    
    // Session management
    session: SessionManager,
    
    // Form handlers
    forms: AuthForms,
    
    // Route protection
    guard: RouteGuard,
    
    // Configuration
    config: AUTH_CONFIG,
    
    // Utilities
    utils: {
        parseJwt,
        isTokenExpired,
        safeLocalStorageGet,
        safeLocalStorageSet,
        safeLocalStorageRemove,
        safeSessionStorageGet,
        safeSessionStorageSet,
        safeSessionStorageRemove
    },
    
    // Version
    version: '2.0.0'
};

// ===================================================================
// 🌐 EXPORT TO GLOBAL SCOPE
// ===================================================================

// Make Auth module available globally
if (typeof window !== 'undefined') {
    window.MartooAuth = AuthModule;
    window.Auth = AuthModule; // Alias for convenience
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AuthModule.init());
    } else {
        AuthModule.init();
    }
    
    console.log('🔐 Martoo Auth v2.0.0 initialized', {
        authenticated: AuthModule.isAuthenticated(),
        admin: AuthModule.isAdmin()
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthModule;
}

export default AuthModule;
