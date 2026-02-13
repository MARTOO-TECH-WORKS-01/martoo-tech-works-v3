/**
 * ===================================================================
 * MARTOO TECH WORKS - AUTHENTICATION MODULE
 * Version: 2.0.0 - FIXED
 * Backend: Node.js/Express on Vercel - YOUR ACTUAL BACKEND
 * Repository: mtechworks1-hub/martoo-tech-backend-Qgis
 * Features: JWT management, login, logout, session handling
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 IMMEDIATE SELF-EXECUTING FUNCTION - NO EXPORTS!
// ===================================================================

(function() {
    
    // ===================================================================
    // 🔧 AUTH CONFIGURATION
    // ===================================================================
    
    const CONFIG = {
        // Token storage keys
        TOKEN_KEY: 'martoo_token',
        USER_KEY: 'martoo_user',
        REMEMBER_KEY: 'martoo_remember',
        
        // Routes
        LOGIN_URL: 'login.html',
        DASHBOARD_URL: 'user_dashboard.html',
        ADMIN_DASHBOARD_URL: 'admin-dashboard.html',
        
        // Events
        EVENTS: {
            LOGIN: 'auth:login',
            LOGOUT: 'auth:logout',
            SESSION_EXPIRED: 'auth:sessionExpired'
        }
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    /**
     * Safe localStorage getter
     */
    const safeGet = (key, useSession = false) => {
        try {
            return useSession ? sessionStorage.getItem(key) : localStorage.getItem(key);
        } catch {
            return null;
        }
    };

    /**
     * Safe localStorage setter
     */
    const safeSet = (key, value, useSession = false) => {
        try {
            if (useSession) {
                sessionStorage.setItem(key, value);
            } else {
                localStorage.setItem(key, value);
            }
            return true;
        } catch {
            return false;
        }
    };

    /**
     * Safe localStorage remover
     */
    const safeRemove = (key, useSession = false) => {
        try {
            if (useSession) {
                sessionStorage.removeItem(key);
            } else {
                localStorage.removeItem(key);
            }
            return true;
        } catch {
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
        } catch {
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
    // 🔐 CORE AUTHENTICATION - MATCHES YOUR BACKEND
    // ===================================================================
    
    const Auth = {
        /**
         * Get authentication token from ANY storage
         */
        getToken() {
            return safeGet(CONFIG.TOKEN_KEY) || safeGet(CONFIG.TOKEN_KEY, true) || null;
        },

        /**
         * Store authentication token - NOW STORES IN BOTH STORAGES FOR REDUNDANCY
         */
        setToken(token, remember = false) {
            // ✅ ALWAYS store in both storages for redundancy
            safeSet(CONFIG.TOKEN_KEY, token, false); // localStorage
            safeSet(CONFIG.TOKEN_KEY, token, true);  // sessionStorage
            
            if (remember) {
                safeSet(CONFIG.REMEMBER_KEY, 'true', false);
            } else {
                safeRemove(CONFIG.REMEMBER_KEY, false);
            }
            
            // Also set cookie as backup
            this.setTokenCookie(token, remember);
            
            console.log('✅ Token stored in both localStorage and sessionStorage');
        },

        /**
         * Set token cookie
         */
        setTokenCookie(token, remember = false) {
            try {
                const expiry = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
                const date = new Date();
                date.setTime(date.getTime() + expiry);
                document.cookie = `${CONFIG.TOKEN_KEY}=${token}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
            } catch (error) {
                console.error('Cookie set error:', error);
            }
        },

        /**
         * Remove token cookie
         */
        removeTokenCookie() {
            try {
                document.cookie = `${CONFIG.TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
            } catch (error) {
                console.error('Cookie remove error:', error);
            }
        },

        /**
         * Check if user is authenticated
         */
        isAuthenticated() {
            const token = this.getToken();
            if (!token) return false;
            
            if (isTokenExpired(token)) {
                console.log('⚠️ Token expired, logging out');
                this.logout(false);
                return false;
            }
            
            return true;
        },

        /**
         * Check if user is admin
         */
        isAdmin() {
            const user = this.getUser();
            return user?.role === 'admin';
        },

        /**
         * Get current user data from ANY storage
         */
        getUser() {
            const userData = safeGet(CONFIG.USER_KEY) || safeGet(CONFIG.USER_KEY, true);
            if (!userData) return null;
            
            try {
                return JSON.parse(userData);
            } catch {
                return null;
            }
        },

        /**
         * Store user data in BOTH storages
         */
        setUser(user, remember = false) {
            const userString = JSON.stringify(user);
            // ✅ Store in both storages
            safeSet(CONFIG.USER_KEY, userString, false); // localStorage
            safeSet(CONFIG.USER_KEY, userString, true);  // sessionStorage
        },

        /**
         * Update user data
         */
        updateUser(updates) {
            const currentUser = this.getUser();
            if (!currentUser) return false;
            
            const updatedUser = { ...currentUser, ...updates };
            const remember = safeGet(CONFIG.REMEMBER_KEY) === 'true';
            this.setUser(updatedUser, remember);
            return true;
        },

        /**
         * Login user - POST /users/login
         */
        async login(email, password, remember = false) {
            try {
                if (!window.API) {
                    throw new Error('API module not loaded');
                }

                console.log('🔐 Login attempt for:', email);
                const response = await window.API.auth.login(email, password);
                
                if (response.success) {
                    console.log('✅ Login successful');
                    
                    // Store token (now stores in both storages)
                    this.setToken(response.data.token, remember);
                    
                    // Store user data
                    this.setUser(response.data.user, remember);
                    
                    // Store remembered email
                    if (remember) {
                        safeSet('martoo_remembered_email', email, false);
                    } else {
                        safeRemove('martoo_remembered_email', false);
                    }
                    
                    // Dispatch login event
                    this.dispatchEvent(CONFIG.EVENTS.LOGIN, {
                        user: response.data.user,
                        remember
                    });
                    
                    return {
                        success: true,
                        user: response.data.user,
                        redirect: this.getDashboardUrl(response.data.user.role)
                    };
                }
                
                console.log('❌ Login failed:', response.error);
                return response;
            } catch (error) {
                console.error('Login error:', error);
                return {
                    success: false,
                    error: error.message || 'Login failed. Please try again.'
                };
            }
        },

        /**
         * Admin login - POST /login
         */
        async adminLogin(email, password, remember = false) {
            try {
                if (!window.API) {
                    throw new Error('API module not loaded');
                }

                console.log('🔐 Admin login attempt for:', email);
                const response = await window.API.auth.adminLogin(email, password);
                
                if (response.success) {
                    console.log('✅ Admin login successful');
                    
                    // Store token (now stores in both storages)
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
                    this.dispatchEvent(CONFIG.EVENTS.LOGIN, {
                        user: adminUser,
                        remember,
                        isAdmin: true
                    });
                    
                    return {
                        success: true,
                        user: adminUser,
                        redirect: CONFIG.ADMIN_DASHBOARD_URL
                    };
                }
                
                console.log('❌ Admin login failed:', response.error);
                return response;
            } catch (error) {
                console.error('Admin login error:', error);
                return {
                    success: false,
                    error: error.message || 'Admin login failed. Please try again.'
                };
            }
        },

        /**
         * Logout user
         */
        logout(redirect = true) {
            console.log('🔓 Logging out...');
            
            // Clear ALL storage
            safeRemove(CONFIG.TOKEN_KEY, false);
            safeRemove(CONFIG.TOKEN_KEY, true);
            safeRemove(CONFIG.USER_KEY, false);
            safeRemove(CONFIG.USER_KEY, true);
            safeRemove(CONFIG.REMEMBER_KEY, false);
            
            // Clear cookie
            this.removeTokenCookie();
            
            // Clear any redirect data
            safeRemove('martoo_redirect_after_login', false);
            safeRemove('martoo_redirect_after_login', true);
            
            // Dispatch logout event
            this.dispatchEvent(CONFIG.EVENTS.LOGOUT);
            
            console.log('✅ Logout complete');
            
            // Redirect to login
            if (redirect) {
                window.location.href = CONFIG.LOGIN_URL;
            }
        },

        /**
         * Get dashboard URL based on user role
         */
        getDashboardUrl(role) {
            return role === 'admin' ? CONFIG.ADMIN_DASHBOARD_URL : CONFIG.DASHBOARD_URL;
        },

        /**
         * Redirect to appropriate dashboard
         */
        redirectToDashboard() {
            const user = this.getUser();
            if (!user) {
                window.location.href = CONFIG.LOGIN_URL;
                return;
            }
            
            const dashboardUrl = this.getDashboardUrl(user.role);
            window.location.href = dashboardUrl;
        },

        /**
         * 🔧 FIXED: Validate token with backend - NO AUTO-LOGOUT ON ERROR
         */
        async validateToken() {
            const token = this.getToken();
            if (!token) {
                console.log('❌ No token found for validation');
                return false;
            }
            
            try {
                if (!window.API) {
                    console.log('❌ API not available for validation');
                    return false;
                }

                console.log('🔍 Validating token with backend...');
                const response = await window.API.auth.getProfile();
                
                if (response.success) {
                    console.log('✅ Token is valid');
                    return true;
                } else {
                    console.log('❌ Token validation failed:', response.error);
                    return false;
                }
                
            } catch (error) {
                console.error('❌ Token validation error:', error);
                
                // ✅ FIXED: Don't logout automatically on validation error
                // The dashboard should decide what to do
                
                return false;
            }
        },

        /**
         * Refresh authentication state
         */
        async refreshAuthState() {
            if (!this.isAuthenticated()) return false;
            
            try {
                const response = await window.API.auth.getProfile();
                if (response.success) {
                    const remember = safeGet(CONFIG.REMEMBER_KEY) === 'true';
                    this.setUser(response.data.user, remember);
                    return true;
                }
            } catch (error) {
                console.error('Auth refresh error:', error);
            }
            
            return false;
        },

        /**
         * Get login URL with redirect
         */
        getLoginUrl(redirect = null) {
            const redirectUrl = redirect || window.location.pathname;
            return `${CONFIG.LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
        },

        /**
         * Require authentication for current page
         */
        requireAuth(requireAdmin = false) {
            if (!this.isAuthenticated()) {
                safeSet('martoo_redirect_after_login', window.location.pathname, true);
                window.location.href = this.getLoginUrl(window.location.pathname);
                return false;
            }
            
            if (requireAdmin && !this.isAdmin()) {
                window.location.href = CONFIG.DASHBOARD_URL;
                return false;
            }
            
            return true;
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
         * Add auth event listener
         */
        addEventListener(eventName, callback) {
            window.addEventListener(eventName, callback);
        },

        /**
         * Remove auth event listener
         */
        removeEventListener(eventName, callback) {
            window.removeEventListener(eventName, callback);
        }
    };

    // ===================================================================
    // 🔑 PASSWORD MANAGEMENT
    // ===================================================================
    
    const PasswordManager = {
        /**
         * Validate password strength
         */
        validateStrength(password) {
            const errors = [];
            let strength = 0;
            
            if (!password) {
                errors.push('Password is required');
                return { valid: false, errors, strength: 0, label: 'No password' };
            }
            
            if (password.length < 8) {
                errors.push('Password must be at least 8 characters');
            } else {
                strength += 1;
            }
            
            if (password.length >= 12) {
                strength += 1;
            }
            
            if (!/[A-Z]/.test(password)) {
                errors.push('Must contain uppercase letter');
            } else {
                strength += 1;
            }
            
            if (!/[a-z]/.test(password)) {
                errors.push('Must contain lowercase letter');
            } else {
                strength += 1;
            }
            
            if (!/[0-9]/.test(password)) {
                errors.push('Must contain number');
            } else {
                strength += 1;
            }
            
            if (!/[!@#$%^&*]/.test(password)) {
                errors.push('Must contain special character (!@#$%^&*)');
            } else {
                strength += 1;
            }
            
            const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein', 'welcome'];
            if (commonPasswords.includes(password.toLowerCase())) {
                errors.push('Password is too common');
                strength = Math.max(0, strength - 2);
            }
            
            const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
            
            return {
                valid: errors.length === 0,
                errors,
                strength: Math.min(6, strength),
                label: strengthLabels[Math.min(6, strength) - 1] || 'Very Weak'
            };
        },

        /**
         * Check if passwords match
         */
        doPasswordsMatch(password, confirm) {
            return password === confirm;
        },

        /**
         * Generate secure random password
         */
        generatePassword(length = 12) {
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const special = '!@#$%^&*';
            
            let password = '';
            
            password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
            password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
            password += numbers.charAt(Math.floor(Math.random() * numbers.length));
            password += special.charAt(Math.floor(Math.random() * special.length));
            
            const allChars = uppercase + lowercase + numbers + special;
            for (let i = 4; i < length; i++) {
                password += allChars.charAt(Math.floor(Math.random() * allChars.length));
            }
            
            return password.split('').sort(() => Math.random() - 0.5).join('');
        }
    };

    // ===================================================================
    // 🔄 SESSION MANAGEMENT
    // ===================================================================
    
    const SessionManager = {
        /**
         * Get session expiry time
         */
        getExpiry() {
            const token = Auth.getToken();
            if (!token) return null;
            
            const payload = parseJwt(token);
            return payload?.exp ? payload.exp * 1000 : null;
        },

        /**
         * Get remaining session time in minutes
         */
        getRemainingMinutes() {
            const expiry = this.getExpiry();
            if (!expiry) return 0;
            
            const remaining = Math.max(0, expiry - Date.now());
            return Math.floor(remaining / 60000);
        },

        /**
         * Check if session is about to expire
         */
        isExpiringSoon(minutes = 5) {
            const remaining = this.getRemainingMinutes();
            return remaining > 0 && remaining < minutes;
        },

        /**
         * Extend session
         */
        async extend() {
            if (!Auth.isAuthenticated()) return false;
            
            try {
                const isValid = await Auth.validateToken();
                return isValid;
            } catch {
                return false;
            }
        },

        /**
         * Start session monitoring
         */
        startMonitoring(onExpiry) {
            const interval = setInterval(async () => {
                if (!Auth.isAuthenticated()) {
                    clearInterval(interval);
                    return;
                }
                
                if (this.isExpiringSoon()) {
                    const extended = await this.extend();
                    if (!extended) {
                        Auth.dispatchEvent(CONFIG.EVENTS.SESSION_EXPIRED);
                        if (onExpiry) onExpiry();
                    }
                }
            }, 60000);
            
            return interval;
        },

        /**
         * Stop session monitoring
         */
        stopMonitoring(interval) {
            clearInterval(interval);
        }
    };

    // ===================================================================
    // 📝 FORM HANDLERS
    // ===================================================================
    
    const FormHandlers = {
        /**
         * Handle login form submission
         */
        async handleLogin(form, options = {}) {
            const { onSuccess, onError, rememberField = 'remember' } = options;
            
            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');
            const remember = formData.get(rememberField) === 'on';
            
            if (!email || !password) {
                if (onError) onError('Please enter both email and password');
                return { success: false, error: 'Email and password required' };
            }
            
            const result = await Auth.login(email, password, remember);
            
            if (result.success) {
                if (onSuccess) onSuccess(result);
                else window.location.href = result.redirect;
            } else {
                if (onError) onError(result.error || 'Login failed');
            }
            
            return result;
        },

        /**
         * Handle registration form submission
         */
        async handleRegistration(form, options = {}) {
            const { onSuccess, onError, validatePassword = true } = options;
            
            const formData = new FormData(form);
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const email = formData.get('email');
            const phone = formData.get('phone');
            const course = formData.get('course');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            const notes = formData.get('notes');
            
            if (!firstName || !lastName) {
                if (onError) onError('Please enter your full name');
                return { success: false, error: 'Name required' };
            }
            
            if (!email) {
                if (onError) onError('Please enter your email address');
                return { success: false, error: 'Email required' };
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                if (onError) onError('Please enter a valid email address');
                return { success: false, error: 'Invalid email' };
            }
            
            if (phone) {
                const phoneRegex = /^(\+?260|0)[97]\d{8}$/;
                if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                    if (onError) onError('Please enter a valid Zambian phone number');
                    return { success: false, error: 'Invalid phone' };
                }
            }
            
            if (!course) {
                if (onError) onError('Please select a course');
                return { success: false, error: 'Course required' };
            }
            
            if (validatePassword) {
                const validation = PasswordManager.validateStrength(password);
                if (!validation.valid) {
                    if (onError) onError(validation.errors[0]);
                    return { success: false, error: validation.errors[0] };
                }
                
                if (!PasswordManager.doPasswordsMatch(password, confirmPassword)) {
                    if (onError) onError('Passwords do not match');
                    return { success: false, error: 'Passwords do not match' };
                }
            }
            
            try {
                const formattedPhone = phone ? 
                    (phone.startsWith('0') ? '+260' + phone.substring(1) : 
                     phone.startsWith('260') ? '+' + phone : phone) : 
                    null;
                
                const enrollmentData = {
                    name: `${firstName} ${lastName}`.trim(),
                    email,
                    phone: formattedPhone,
                    course,
                    notes: notes || null
                };
                
                const response = await window.API.enrollments.createEnrollment(enrollmentData);
                
                if (response.success) {
                    if (onSuccess) {
                        onSuccess({ enrollmentId: response.data.id, email, course });
                    }
                    return { success: true, enrollmentId: response.data.id };
                } else {
                    if (onError) onError(response.error || 'Registration failed');
                    return response;
                }
            } catch (error) {
                console.error('Registration error:', error);
                const errorMessage = error.message || 'Registration failed. Please try again.';
                if (onError) onError(errorMessage);
                return { success: false, error: errorMessage };
            }
        },

        /**
         * Handle forgot password request
         */
        async handleForgotPassword(form, options = {}) {
            const { onSuccess, onError } = options;
            
            const formData = new FormData(form);
            const email = formData.get('email');
            
            if (!email) {
                if (onError) onError('Please enter your email address');
                return { success: false, error: 'Email required' };
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                if (onError) onError('Please enter a valid email address');
                return { success: false, error: 'Invalid email' };
            }
            
            try {
                const response = await window.API.auth.forgotPassword(email);
                
                if (response.success) {
                    if (onSuccess) onSuccess({ email });
                } else {
                    if (onError) onError(response.error || 'Password reset request failed');
                }
                
                return response;
            } catch (error) {
                console.error('Forgot password error:', error);
                const errorMessage = error.message || 'Request failed. Please try again.';
                if (onError) onError(errorMessage);
                return { success: false, error: errorMessage };
            }
        }
    };

    // ===================================================================
    // 🛡️ ROUTE GUARD
    // ===================================================================
    
    const RouteGuard = {
        /**
         * Protect route based on authentication
         */
        protect(options = {}) {
            const { requireAuth = true, requireAdmin = false, redirectTo = CONFIG.LOGIN_URL, fallback = null } = options;
            
            if (requireAuth && !Auth.isAuthenticated()) {
                if (redirectTo) {
                    safeSet('martoo_redirect_after_login', window.location.pathname, true);
                    window.location.href = redirectTo;
                }
                return fallback;
            }
            
            if (requireAdmin && !Auth.isAdmin()) {
                if (redirectTo) window.location.href = CONFIG.DASHBOARD_URL;
                return fallback;
            }
            
            return true;
        }
    };

    // ===================================================================
    // 🚀 INITIALIZATION
    // ===================================================================
    
    function init() {
        // Check for redirect after login
        const redirectUrl = safeGet('martoo_redirect_after_login', true);
        if (redirectUrl && Auth.isAuthenticated()) {
            safeRemove('martoo_redirect_after_login', true);
            if (!window.location.pathname.includes(redirectUrl)) {
                window.location.href = redirectUrl;
            }
        }
        
        // Dispatch initial auth state
        Auth.dispatchEvent('auth:stateChanged', {
            isAuthenticated: Auth.isAuthenticated(),
            isAdmin: Auth.isAdmin(),
            user: Auth.getUser()
        });
        
        console.log('✅ Auth module initialized', {
            authenticated: Auth.isAuthenticated(),
            admin: Auth.isAdmin()
        });
    }

    // ===================================================================
    // 📦 EXPORT PUBLIC API
    // ===================================================================
    
    window.Auth = {
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
        
        // Password management
        password: PasswordManager,
        
        // Session management
        session: SessionManager,
        
        // Form handlers
        forms: FormHandlers,
        
        // Route protection
        guard: RouteGuard,
        
        // Configuration
        config: CONFIG,
        
        // Version
        version: '2.0.0'
    };

    // Initialize
    init();

})();
