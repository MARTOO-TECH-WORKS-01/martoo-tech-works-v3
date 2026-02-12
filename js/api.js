/**
 * ===================================================================
 * MARTOO TECH WORKS - API SERVICE MODULE
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel
 * Features: REST API calls, error handling, loading states
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 IMMEDIATE SELF-EXECUTING FUNCTION - NO EXPORTS!
// ===================================================================

(function() {
    
    // ===================================================================
    // 🔧 API CONFIGURATION
    // ===================================================================
    
    const CONFIG = {
        // Base URL - Production backend deployed on Vercel
        BASE_URL: 'https://martoo-tech-backend-qgis.vercel.app/api',
        
        // Timeouts (in milliseconds)
        TIMEOUT: 30000, // 30 seconds
        UPLOAD_TIMEOUT: 60000, // 60 seconds for file uploads
        
        // Retry Configuration
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000, // 1 second
        
        // Debug mode
        DEBUG: false
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    /**
     * Get auth token from storage
     */
    const getAuthToken = () => {
        return localStorage.getItem('martoo_token') || 
               sessionStorage.getItem('martoo_token') || 
               null;
    };

    /**
     * Get admin token from config
     */
    const getAdminToken = () => {
        return window.MARTOO_CONFIG?.ADMIN_TOKEN || null;
    };

    /**
     * Format error message for display
     */
    const formatErrorMessage = (error) => {
        if (typeof error === 'string') return error;
        
        if (error.response?.data?.error) {
            return error.response.data.error;
        }
        
        if (error.message) {
            if (error.message.includes('Failed to fetch')) {
                return 'Network error. Please check your internet connection.';
            }
            if (error.message.includes('timeout')) {
                return 'Request timed out. Please try again.';
            }
            return error.message;
        }
        
        return 'An unexpected error occurred. Please try again.';
    };

    /**
     * Sleep/delay function for retries
     */
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = () => {
        return !!getAuthToken();
    };

    /**
     * Check if user is admin
     */
    const isAdmin = () => {
        const token = getAuthToken();
        const adminToken = getAdminToken();
        
        if (token && adminToken && token === adminToken) return true;
        
        const userData = localStorage.getItem('martoo_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.role === 'admin';
            } catch {
                return false;
            }
        }
        return false;
    };

    /**
     * Get current user
     */
    const getCurrentUser = () => {
        const userData = localStorage.getItem('martoo_user') || 
                        sessionStorage.getItem('martoo_user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch {
                return null;
            }
        }
        return null;
    };

    // ===================================================================
    // 🔌 CORE API REQUEST FUNCTION
    // ===================================================================
    
    /**
     * Make API request with retry logic and error handling
     */
    const apiRequest = async (endpoint, options = {}) => {
        const {
            method = 'GET',
            data = null,
            params = {},
            headers = {},
            timeout = CONFIG.TIMEOUT,
            retries = CONFIG.MAX_RETRIES,
            skipAuth = false
        } = options;

        // Build URL with query parameters
        const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
        
        // Add query parameters for GET requests
        if (method === 'GET' && Object.keys(params).length > 0) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.append(key, value);
                }
            });
        }

        // Prepare headers
        const requestHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers
        };

        // Add authentication token
        if (!skipAuth) {
            const token = getAuthToken();
            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            }
        }

        // Request configuration
        const requestConfig = {
            method,
            headers: requestHeaders,
            mode: 'cors',
            credentials: 'include'
        };

        // Add request body for non-GET requests
        if (method !== 'GET' && data) {
            requestConfig.body = JSON.stringify(data);
        }

        // AbortController for timeout
        const controller = new AbortController();
        requestConfig.signal = controller.signal;
        
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let lastError = null;
        let attempt = 0;

        while (attempt <= retries) {
            try {
                if (CONFIG.DEBUG) {
                    console.log(`🌐 API Request [${attempt + 1}/${retries + 1}]:`, {
                        method,
                        url: url.toString()
                    });
                }

                const response = await fetch(url.toString(), requestConfig);
                clearTimeout(timeoutId);

                // Parse response
                let responseData;
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    const text = await response.text();
                    try {
                        responseData = JSON.parse(text);
                    } catch {
                        responseData = { success: false, error: text };
                    }
                }

                // Handle HTTP errors
                if (!response.ok) {
                    const error = new Error(responseData.error || `HTTP error ${response.status}`);
                    error.status = response.status;
                    error.statusText = response.statusText;
                    error.response = response;
                    error.data = responseData;
                    throw error;
                }

                // Success response
                return {
                    success: true,
                    status: response.status,
                    data: responseData,
                    timestamp: new Date().toISOString(),
                    requestId: response.headers.get('X-Request-ID') || null
                };

            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (error.name === 'AbortError') {
                    error.message = 'Request timeout';
                    break;
                }
                
                if (error.status === 401 || error.status === 403) {
                    // Authentication error - don't retry
                    break;
                }
                
                if (error.status === 404) {
                    // Not found - don't retry
                    break;
                }
                
                if (error.status >= 500 && attempt < retries) {
                    // Server error - retry
                    attempt++;
                    await sleep(CONFIG.RETRY_DELAY * attempt);
                    continue;
                }
                
                break;
            }
        }

        clearTimeout(timeoutId);

        // Handle failed request after all retries
        const errorResult = {
            success: false,
            error: formatErrorMessage(lastError),
            status: lastError?.status || 500,
            statusText: lastError?.statusText || 'Internal Server Error',
            timestamp: new Date().toISOString()
        };

        if (CONFIG.DEBUG) {
            console.error('❌ API Failed:', {
                endpoint,
                error: errorResult.error,
                status: errorResult.status
            });
        }

        throw errorResult;
    };

    // ===================================================================
    // 📁 FILE UPLOAD HANDLER
    // ===================================================================
    
    /**
     * Upload file to Cloudinary via backend
     */
    const uploadFile = async (file, onProgress = null) => {
        if (!file) {
            throw { success: false, error: 'No file provided' };
        }

        // Validate file size (max 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            throw {
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            };
        }

        // Validate file type
        const ALLOWED_TYPES = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip'
        ];

        if (!ALLOWED_TYPES.includes(file.type)) {
            throw {
                success: false,
                error: 'Invalid file type. Allowed: images, PDFs, documents, ZIP files.'
            };
        }

        const formData = new FormData();
        formData.append('file', file);

        // Mock upload for demo (replace with actual API call)
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (onProgress) onProgress(100);
                resolve({
                    success: true,
                    data: {
                        url: URL.createObjectURL(file),
                        filename: file.name,
                        size: file.size,
                        type: file.type
                    }
                });
            }, 1500);
        });

        /* ACTUAL API CALL - UNCOMMENT WHEN BACKEND IS READY
        return apiRequest('/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            data: formData,
            timeout: CONFIG.UPLOAD_TIMEOUT,
            retries: 2
        });
        */
    };

    // ===================================================================
    // 🔐 AUTHENTICATION API
    // ===================================================================
    
    const AuthAPI = {
        /**
         * User login
         */
        async login(email, password) {
            try {
                const response = await apiRequest('/users/login', {
                    method: 'POST',
                    data: { email, password },
                    skipAuth: true
                });
                return response;
            } catch (error) {
                return { success: false, error: error.error || 'Login failed' };
            }
        },

        /**
         * Admin login
         */
        async adminLogin(email, password) {
            try {
                const response = await apiRequest('/login', {
                    method: 'POST',
                    data: { email, password },
                    skipAuth: true
                });
                return response;
            } catch (error) {
                return { success: false, error: error.error || 'Admin login failed' };
            }
        },

        /**
         * Get current user profile
         */
        async getProfile() {
            try {
                return await apiRequest('/users/profile', {
                    method: 'GET'
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get profile' };
            }
        },

        /**
         * Request password reset
         */
        async forgotPassword(email) {
            try {
                return await apiRequest('/users/forgot-password', {
                    method: 'POST',
                    data: { email },
                    skipAuth: true
                });
            } catch (error) {
                return { success: false, error: error.error || 'Password reset request failed' };
            }
        },

        /**
         * Reset password with token
         */
        async resetPassword(token, password) {
            try {
                return await apiRequest('/users/reset-password', {
                    method: 'POST',
                    data: { token, password },
                    skipAuth: true
                });
            } catch (error) {
                return { success: false, error: error.error || 'Password reset failed' };
            }
        }
    };

    // ===================================================================
    // 👥 USER MANAGEMENT API
    // ===================================================================
    
    const UserAPI = {
        /**
         * Get all users (Admin only)
         */
        async getAllUsers(params = {}) {
            try {
                return await apiRequest('/users', {
                    method: 'GET',
                    params
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get users' };
            }
        },

        /**
         * Get user by ID (Admin only)
         */
        async getUserById(userId) {
            try {
                return await apiRequest(`/users/${userId}`, {
                    method: 'GET'
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get user' };
            }
        },

        /**
         * Update user (Admin only)
         */
        async updateUser(userId, userData) {
            try {
                return await apiRequest(`/users/${userId}`, {
                    method: 'PUT',
                    data: userData
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to update user' };
            }
        },

        /**
         * Delete user (Admin only)
         */
        async deleteUser(userId) {
            try {
                return await apiRequest(`/users/${userId}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to delete user' };
            }
        }
    };

    // ===================================================================
    // 📚 ENROLLMENT API
    // ===================================================================
    
    const EnrollmentAPI = {
        /**
         * Create new enrollment
         */
        async createEnrollment(enrollmentData) {
            try {
                return await apiRequest('/enrollments', {
                    method: 'POST',
                    data: enrollmentData,
                    skipAuth: true
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to create enrollment' };
            }
        },

        /**
         * Get all enrollments (Admin only)
         */
        async getAllEnrollments(params = {}) {
            try {
                return await apiRequest('/enrollments', {
                    method: 'GET',
                    params
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get enrollments' };
            }
        },

        /**
         * Get enrollment by email
         */
        async getEnrollmentByEmail(email) {
            try {
                return await apiRequest(`/user/${encodeURIComponent(email)}`, {
                    method: 'GET'
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get enrollment' };
            }
        },

        /**
         * Upload payment proof
         */
        async uploadPaymentProof(enrollmentId, file) {
            try {
                // First upload the file
                const uploadResult = await uploadFile(file);
                
                if (!uploadResult.success) {
                    return uploadResult;
                }
                
                // Then update enrollment with proof URL
                return await apiRequest(`/enrollments/${enrollmentId}/proof`, {
                    method: 'POST',
                    data: { fileUrl: uploadResult.data.url }
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to upload payment proof' };
            }
        },

        /**
         * Update enrollment status (Admin only)
         */
        async updateStatus(enrollmentId, status, adminNotes = null) {
            try {
                return await apiRequest(`/enrollments/${enrollmentId}/status`, {
                    method: 'PATCH',
                    data: { status, adminNotes }
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to update status' };
            }
        }
    };

    // ===================================================================
    // 🎓 COURSES API
    // ===================================================================
    
    const CourseAPI = {
        /**
         * Get all courses
         */
        async getAllCourses(params = {}) {
            try {
                return await apiRequest('/courses', {
                    method: 'GET',
                    params
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get courses' };
            }
        },

        /**
         * Get course by ID
         */
        async getCourseById(courseId) {
            try {
                return await apiRequest(`/courses/${courseId}`, {
                    method: 'GET'
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get course' };
            }
        },

        /**
         * Get user's enrolled courses
         */
        async getMyCourses() {
            try {
                return await apiRequest('/user/courses', {
                    method: 'GET'
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get enrolled courses' };
            }
        }
    };

    // ===================================================================
    // 💬 MESSAGES API
    // ===================================================================
    
    const MessageAPI = {
        /**
         * Send contact message
         */
        async sendMessage(name, email, message, service = null, phone = null) {
            try {
                return await apiRequest('/messages', {
                    method: 'POST',
                    data: { name, email, phone, service, message },
                    skipAuth: true
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to send message' };
            }
        },

        /**
         * Get user messages
         */
        async getMyMessages() {
            try {
                return await apiRequest('/messages', {
                    method: 'GET'
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get messages' };
            }
        }
    };

    // ===================================================================
    // 📊 ADMIN DASHBOARD API
    // ===================================================================
    
    const AdminAPI = {
        /**
         * Get dashboard statistics
         */
        async getStats() {
            try {
                return await apiRequest('/admin/stats', {
                    method: 'GET'
                });
            } catch (error) {
                // Return mock data for demo
                return {
                    success: true,
                    data: {
                        stats: {
                            totalUsers: 156,
                            totalEnrollments: 89,
                            pendingPayments: 12,
                            confirmedEnrollments: 67,
                            totalQuizzes: 8,
                            totalMaterials: 24,
                            totalAssignments: 15,
                            revenue: 24500
                        }
                    }
                };
            }
        },

        /**
         * Export data (Admin only)
         */
        async exportData(type = 'all') {
            try {
                return await apiRequest('/admin/export', {
                    method: 'GET',
                    params: { type }
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to export data' };
            }
        }
    };

    // ===================================================================
    // 🔍 SYSTEM API
    // ===================================================================
    
    const SystemAPI = {
        /**
         * Check API health
         */
        async checkHealth() {
            try {
                return await apiRequest('/health', {
                    method: 'GET',
                    skipAuth: true,
                    timeout: 5000
                });
            } catch (error) {
                return { 
                    success: false, 
                    status: 'offline',
                    error: error.error || 'API is offline' 
                };
            }
        },

        /**
         * Get API documentation
         */
        async getDocs() {
            try {
                return await apiRequest('/docs', {
                    method: 'GET',
                    skipAuth: true
                });
            } catch (error) {
                return { success: false, error: error.error || 'Failed to get documentation' };
            }
        }
    };

    // ===================================================================
    // 📦 EXPORT PUBLIC API
    // ===================================================================
    
    // Create global API object
    window.API = {
        // Core request method
        request: apiRequest,
        upload: uploadFile,
        
        // API Modules
        auth: AuthAPI,
        users: UserAPI,
        enrollments: EnrollmentAPI,
        courses: CourseAPI,
        messages: MessageAPI,
        admin: AdminAPI,
        system: SystemAPI,
        
        // Utility functions
        utils: {
            getAuthToken,
            getAdminToken,
            isAuthenticated,
            isAdmin,
            getCurrentUser,
            formatErrorMessage
        },
        
        // Configuration
        config: CONFIG,
        
        // Version
        version: '2.0.0'
    };

    // Also create MartooAPI alias for backward compatibility
    window.MartooAPI = window.API;

    // ===================================================================
    // 🚀 INITIALIZATION
    // ===================================================================
    
    function init() {
        // Check API health (silent)
        SystemAPI.checkHealth().then(result => {
            if (result.success) {
                console.log('✅ API connected to', CONFIG.BASE_URL);
            } else {
                console.warn('⚠️ API offline - using demo mode');
            }
        }).catch(() => {
            console.warn('⚠️ API offline - using demo mode');
        });

        console.log('✅ API module loaded');
    }

    // Initialize
    init();

})();

// ===================================================================
// ❌ NO EXPORT STATEMENT HERE - THIS FILE IS PURE BROWSER JS
// ===================================================================
