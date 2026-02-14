/**
 * ===================================================================
 * MARTOO TECH WORKS - AUTHENTICATION MODULE
 * Version: 2.0.0 - ULTIMATE FIXED
 * Backend: Node.js/Express on Vercel
 * Features: JWT management, login, logout, session handling
 * ===================================================================
 */

'use strict';

(function() {
    
    const CONFIG = {
        TOKEN_KEY: 'martoo_token',
        USER_KEY: 'martoo_user',
        REMEMBER_KEY: 'martoo_remember',
        LOGIN_URL: 'login.html',
        DASHBOARD_URL: 'user_dashboard.html',
        ADMIN_DASHBOARD_URL: 'admin-dashboard.html',
        EVENTS: {
            LOGIN: 'auth:login',
            LOGOUT: 'auth:logout',
            SESSION_EXPIRED: 'auth:sessionExpired'
        }
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    const safeGet = (key, useSession = false) => {
        try {
            return useSession ? sessionStorage.getItem(key) : localStorage.getItem(key);
        } catch {
            return null;
        }
    };

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
     * Parse JWT token safely - NEVER throws
     */
    const parseJwt = (token) => {
        if (!token || typeof token !== 'string') return null;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const base64Url = parts[1];
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
     * Check if token is expired - SAFE version that NEVER triggers logout
     */
    const isTokenExpired = (token) => {
        const payload = parseJwt(token);
        if (!payload || !payload.exp) return false; // If we can't parse, assume it's NOT expired
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    };

    // ===================================================================
    // 🔐 CORE AUTHENTICATION - FIXED
    // ===================================================================
    
    const Auth = {
        getToken() {
            return safeGet(CONFIG.TOKEN_KEY) || safeGet(CONFIG.TOKEN_KEY, true) || 
                   document.cookie.replace(/(?:(?:^|.*;\s*)martoo_token\s*\=\s*([^;]*).*$)|^.*$/, "$1") || null;
        },

        setToken(token, remember = false) {
            safeSet(CONFIG.TOKEN_KEY, token, false);
            safeSet(CONFIG.TOKEN_KEY, token, true);
            
            if (remember) {
                safeSet(CONFIG.REMEMBER_KEY, 'true', false);
            } else {
                safeRemove(CONFIG.REMEMBER_KEY, false);
            }
            
            this.setTokenCookie(token, remember);
            console.log('✅ Token stored in both localStorage and sessionStorage');
        },

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

        removeTokenCookie() {
            try {
                document.cookie = `${CONFIG.TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
            } catch (error) {
                console.error('Cookie remove error:', error);
            }
        },

        /**
         * 🔧 FIXED: Never calls logout automatically
         */
        isAuthenticated() {
            const token = this.getToken();
            if (!token) return false;
            
            // Check expiration but DON'T logout - just return false
            if (isTokenExpired(token)) {
                console.log('⚠️ Token expired');
                return false;
            }
            
            return true;
        },

        isAdmin() {
            const user = this.getUser();
            return user?.role === 'admin';
        },

        getUser() {
            const userData = safeGet(CONFIG.USER_KEY) || safeGet(CONFIG.USER_KEY, true);
            if (!userData) return null;
            
            try {
                return JSON.parse(userData);
            } catch {
                return null;
            }
        },

        setUser(user, remember = false) {
            const userString = JSON.stringify(user);
            safeSet(CONFIG.USER_KEY, userString, false);
            safeSet(CONFIG.USER_KEY, userString, true);
        },

        updateUser(updates) {
            const currentUser = this.getUser();
            if (!currentUser) return false;
            
            const updatedUser = { ...currentUser, ...updates };
            const remember = safeGet(CONFIG.REMEMBER_KEY) === 'true';
            this.setUser(updatedUser, remember);
            return true;
        },

        async login(email, password, remember = false) {
            try {
                if (!window.API) throw new Error('API module not loaded');

                console.log('🔐 Login attempt for:', email);
                const response = await window.API.auth.login(email, password);
                
                if (response.success) {
                    console.log('✅ Login successful');
                    this.setToken(response.data.token, remember);
                    this.setUser(response.data.user, remember);
                    
                    if (remember) safeSet('martoo_remembered_email', email, false);
                    else safeRemove('martoo_remembered_email', false);
                    
                    this.dispatchEvent(CONFIG.EVENTS.LOGIN, { user: response.data.user, remember });
                    
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
                return { success: false, error: error.message || 'Login failed' };
            }
        },

        async adminLogin(email, password, remember = false) {
            try {
                if (!window.API) throw new Error('API module not loaded');

                console.log('🔐 Admin login attempt for:', email);
                const response = await window.API.auth.adminLogin(email, password);
                
                if (response.success) {
                    console.log('✅ Admin login successful');
                    this.setToken(response.data.token, remember);
                    
                    const adminUser = {
                        id: 'admin',
                        email: response.data.user.email,
                        name: response.data.user.name || 'Administrator',
                        role: 'admin'
                    };
                    this.setUser(adminUser, remember);
                    
                    this.dispatchEvent(CONFIG.EVENTS.LOGIN, { user: adminUser, remember, isAdmin: true });
                    
                    return { success: true, user: adminUser, redirect: CONFIG.ADMIN_DASHBOARD_URL };
                }
                
                console.log('❌ Admin login failed:', response.error);
                return response;
            } catch (error) {
                console.error('Admin login error:', error);
                return { success: false, error: error.message || 'Admin login failed' };
            }
        },

        logout(redirect = true) {
            console.log('🔓 Logging out...');
            
            safeRemove(CONFIG.TOKEN_KEY, false);
            safeRemove(CONFIG.TOKEN_KEY, true);
            safeRemove(CONFIG.USER_KEY, false);
            safeRemove(CONFIG.USER_KEY, true);
            safeRemove(CONFIG.REMEMBER_KEY, false);
            safeRemove('martoo_remembered_email', false);
            safeRemove('martoo_redirect_after_login', false);
            safeRemove('martoo_redirect_after_login', true);
            
            this.removeTokenCookie();
            this.dispatchEvent(CONFIG.EVENTS.LOGOUT);
            
            console.log('✅ Logout complete');
            
            if (redirect) window.location.href = CONFIG.LOGIN_URL;
        },

        getDashboardUrl(role) {
            return role === 'admin' ? CONFIG.ADMIN_DASHBOARD_URL : CONFIG.DASHBOARD_URL;
        },

        redirectToDashboard() {
            const user = this.getUser();
            if (!user) {
                window.location.href = CONFIG.LOGIN_URL;
                return;
            }
            window.location.href = this.getDashboardUrl(user.role);
        },

        /**
         * 🔧 FIXED: Validates token without side effects
         */
        async validateToken() {
            const token = this.getToken();
            if (!token) return false;
            
            try {
                if (!window.API) return false;

                console.log('🔍 Validating token with backend...');
                const response = await window.API.auth.getProfile();
                
                if (response.success) {
                    console.log('✅ Token is valid');
                    return true;
                } else {
                    console.log('❌ Token validation failed');
                    return false;
                }
            } catch (error) {
                console.error('❌ Token validation error:', error);
                return false;
            }
        },

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

        getLoginUrl(redirect = null) {
            const redirectUrl = redirect || window.location.pathname;
            return `${CONFIG.LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
        },

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

        dispatchEvent(eventName, detail = {}) {
            try {
                const event = new CustomEvent(eventName, { detail, bubbles: true, cancelable: true });
                window.dispatchEvent(event);
            } catch (error) {
                console.error('Event dispatch error:', error);
            }
        },

        addEventListener(eventName, callback) {
            window.addEventListener(eventName, callback);
        },

        removeEventListener(eventName, callback) {
            window.removeEventListener(eventName, callback);
        }
    };

    // ===================================================================
    // 🔑 PASSWORD MANAGEMENT (unchanged)
    // ===================================================================
    const PasswordManager = {
        validateStrength(password) {
            const errors = [];
            let strength = 0;
            
            if (!password) return { valid: false, errors: ['Password is required'], strength: 0, label: 'No password' };
            
            if (password.length < 8) errors.push('Password must be at least 8 characters');
            else strength += 1;
            
            if (password.length >= 12) strength += 1;
            if (/[A-Z]/.test(password)) strength += 1;
            if (/[a-z]/.test(password)) strength += 1;
            if (/[0-9]/.test(password)) strength += 1;
            if (/[!@#$%^&*]/.test(password)) strength += 1;
            
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

        doPasswordsMatch(password, confirm) {
            return password === confirm;
        },

        generatePassword(length = 12) {
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const special = '!@#$%^&*';
            
            let password = '';
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            password += numbers[Math.floor(Math.random() * numbers.length)];
            password += special[Math.floor(Math.random() * special.length)];
            
            const allChars = uppercase + lowercase + numbers + special;
            for (let i = 4; i < length; i++) {
                password += allChars[Math.floor(Math.random() * allChars.length)];
            }
            
            return password.split('').sort(() => Math.random() - 0.5).join('');
        }
    };

    // ===================================================================
    // 🔄 SESSION MANAGEMENT
    // ===================================================================
    const SessionManager = {
        getExpiry() {
            const token = Auth.getToken();
            if (!token) return null;
            const payload = parseJwt(token);
            return payload?.exp ? payload.exp * 1000 : null;
        },

        getRemainingMinutes() {
            const expiry = this.getExpiry();
            if (!expiry) return 0;
            const remaining = Math.max(0, expiry - Date.now());
            return Math.floor(remaining / 60000);
        },

        isExpiringSoon(minutes = 5) {
            const remaining = this.getRemainingMinutes();
            return remaining > 0 && remaining < minutes;
        },

        async extend() {
            return Auth.isAuthenticated() ? await Auth.validateToken() : false;
        },

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

        stopMonitoring(interval) {
            clearInterval(interval);
        }
    };

    // ===================================================================
    // 📝 FORM HANDLERS (unchanged)
    // ===================================================================
    const FormHandlers = {
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
            
            if (!firstName || !lastName) return errorResponse(onError, 'Please enter your full name');
            if (!email) return errorResponse(onError, 'Please enter your email address');
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return errorResponse(onError, 'Please enter a valid email address');
            
            if (phone) {
                const phoneRegex = /^(\+?260|0)[97]\d{8}$/;
                if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                    return errorResponse(onError, 'Please enter a valid Zambian phone number');
                }
            }
            
            if (!course) return errorResponse(onError, 'Please select a course');
            
            if (validatePassword) {
                const validation = PasswordManager.validateStrength(password);
                if (!validation.valid) return errorResponse(onError, validation.errors[0]);
                if (!PasswordManager.doPasswordsMatch(password, confirmPassword)) {
                    return errorResponse(onError, 'Passwords do not match');
                }
            }
            
            try {
                const formattedPhone = phone ? (phone.startsWith('0') ? '+260' + phone.substring(1) : phone) : null;
                const enrollmentData = {
                    name: `${firstName} ${lastName}`.trim(),
                    email,
                    phone: formattedPhone,
                    course,
                    notes: notes || null
                };
                
                const response = await window.API.enrollments.createEnrollment(enrollmentData);
                
                if (response.success) {
                    if (onSuccess) onSuccess({ enrollmentId: response.data.id, email, course });
                    return { success: true, enrollmentId: response.data.id };
                } else {
                    if (onError) onError(response.error || 'Registration failed');
                    return response;
                }
            } catch (error) {
                console.error('Registration error:', error);
                return errorResponse(onError, error.message || 'Registration failed. Please try again.');
            }
            
            function errorResponse(onError, message) {
                if (onError) onError(message);
                return { success: false, error: message };
            }
        },

        async handleForgotPassword(form, options = {}) {
            const { onSuccess, onError } = options;
            const formData = new FormData(form);
            const email = formData.get('email');
            
            if (!email) return errorResponse(onError, 'Please enter your email address');
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return errorResponse(onError, 'Please enter a valid email address');
            
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
                return errorResponse(onError, error.message || 'Request failed. Please try again.');
            }
            
            function errorResponse(onError, message) {
                if (onError) onError(message);
                return { success: false, error: message };
            }
        }
    };

    // ===================================================================
    // 🛡️ ROUTE GUARD
    // ===================================================================
    const RouteGuard = {
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
        const redirectUrl = safeGet('martoo_redirect_after_login', true);
        if (redirectUrl && Auth.isAuthenticated()) {
            safeRemove('martoo_redirect_after_login', true);
            if (!window.location.pathname.includes(redirectUrl)) {
                window.location.href = redirectUrl;
            }
        }
        
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
        
        validateToken: Auth.validateToken.bind(Auth),
        refreshAuthState: Auth.refreshAuthState.bind(Auth),
        requireAuth: Auth.requireAuth.bind(Auth),
        redirectToDashboard: Auth.redirectToDashboard.bind(Auth),
        getDashboardUrl: Auth.getDashboardUrl.bind(Auth),
        getLoginUrl: Auth.getLoginUrl.bind(Auth),
        
        addEventListener: Auth.addEventListener.bind(Auth),
        removeEventListener: Auth.removeEventListener.bind(Auth),
        dispatchEvent: Auth.dispatchEvent.bind(Auth),
        
        password: PasswordManager,
        session: SessionManager,
        forms: FormHandlers,
        guard: RouteGuard,
        config: CONFIG,
        version: '2.0.0'
    };

    init();
})();
