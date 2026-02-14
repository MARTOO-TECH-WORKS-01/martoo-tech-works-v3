/**
 * ===================================================================
 * MARTOO TECH WORKS - AUTHENTICATION MODULE
 * Version: 2.0.0 - ENV ADMIN FIXED
 * Features: Admin login via env vars, users via Firebase
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
            LOGOUT: 'auth:logout'
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
            if (useSession) sessionStorage.setItem(key, value);
            else localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    };

    const safeRemove = (key, useSession = false) => {
        try {
            if (useSession) sessionStorage.removeItem(key);
            else localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    };

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

    const isTokenExpired = (token) => {
        const payload = parseJwt(token);
        if (!payload || !payload.exp) return false;
        return payload.exp < Math.floor(Date.now() / 1000);
    };

    // ===================================================================
    // 🔐 CORE AUTHENTICATION
    // ===================================================================
    
    const Auth = {
        getToken() {
            return safeGet(CONFIG.TOKEN_KEY) || safeGet(CONFIG.TOKEN_KEY, true) || 
                   document.cookie.replace(/(?:(?:^|.*;\s*)martoo_token\s*\=\s*([^;]*).*$)|^.*$/, "$1") || null;
        },

        setToken(token, remember = false) {
            safeSet(CONFIG.TOKEN_KEY, token, false);
            safeSet(CONFIG.TOKEN_KEY, token, true);
            if (remember) safeSet(CONFIG.REMEMBER_KEY, 'true', false);
            else safeRemove(CONFIG.REMEMBER_KEY, false);
            this.setTokenCookie(token, remember);
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

        isAuthenticated() {
            const token = this.getToken();
            if (!token) return false;
            return !isTokenExpired(token); // Just check expiration, nothing else
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
                    
                    return {
                        success: true,
                        user: response.data.user,
                        redirect: this.getDashboardUrl(response.data.user.role)
                    };
                }
                return response;
            } catch (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message || 'Login failed' };
            }
        },

        /**
         * 🔐 ADMIN LOGIN - Uses env vars, not Firebase
         */
        async adminLogin(email, password, remember = false) {
            try {
                if (!window.API) throw new Error('API module not loaded');
                console.log('🔐 Admin login attempt for:', email);
                
                const response = await window.API.auth.adminLogin(email, password);
                
                if (response.success) {
                    console.log('✅ Admin login successful');
                    this.setToken(response.data.token, remember);
                    
                    // Admin user data - NOT from Firebase
                    const adminUser = {
                        id: 'admin',
                        email: response.data.user.email,
                        name: response.data.user.name || 'Administrator',
                        role: 'admin'
                    };
                    this.setUser(adminUser, remember);
                    
                    return {
                        success: true,
                        user: adminUser,
                        redirect: CONFIG.ADMIN_DASHBOARD_URL
                    };
                }
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
            if (redirect) window.location.href = CONFIG.LOGIN_URL;
        },

        getDashboardUrl(role) {
            return role === 'admin' ? CONFIG.ADMIN_DASHBOARD_URL : CONFIG.DASHBOARD_URL;
        },

        /**
         * 🔧 CRITICAL FIX: For admin users, ALWAYS return true without validation
         */
        async validateToken() {
            const token = this.getToken();
            if (!token) return false;
            
            // If token is expired, return false
            if (isTokenExpired(token)) return false;
            
            // For admin users (stored in user data), skip Firebase validation
            const user = this.getUser();
            if (user?.role === 'admin') {
                console.log('✅ Admin token valid (bypassing Firebase)');
                return true; // Admin tokens are always valid if not expired
            }
            
            // For regular users, validate with Firebase
            try {
                if (!window.API) return false;
                const response = await window.API.auth.getProfile();
                return response.success;
            } catch {
                return false;
            }
        },

        redirectToDashboard() {
            const user = this.getUser();
            if (!user) {
                window.location.href = CONFIG.LOGIN_URL;
                return;
            }
            window.location.href = this.getDashboardUrl(user.role);
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
        login: Auth.login.bind(Auth),
        adminLogin: Auth.adminLogin.bind(Auth),
        logout: Auth.logout.bind(Auth),
        
        validateToken: Auth.validateToken.bind(Auth),
        requireAuth: Auth.requireAuth.bind(Auth),
        redirectToDashboard: Auth.redirectToDashboard.bind(Auth),
        getDashboardUrl: Auth.getDashboardUrl.bind(Auth),
        getLoginUrl: Auth.getLoginUrl.bind(Auth),
        
        addEventListener: Auth.addEventListener.bind(Auth),
        removeEventListener: Auth.removeEventListener.bind(Auth),
        dispatchEvent: Auth.dispatchEvent.bind(Auth),
        
        config: CONFIG,
        version: '2.0.0'
    };

    init();
})();
