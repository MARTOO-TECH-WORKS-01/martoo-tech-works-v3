/**
 * ===================================================================
 * MARTOO TECH WORKS - API SERVICE MODULE
 * Version: 2.0.0 - FIXED
 * Backend: Node.js/Express on Vercel - YOUR ACTUAL BACKEND
 * Repository: mtechworks1-hub/martoo-tech-backend-Qgis
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
        DEBUG: true // Turn on for debugging
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    const getAuthToken = () => {
        return localStorage.getItem('martoo_token') || 
               sessionStorage.getItem('martoo_token') || 
               null;
    };

    const formatErrorMessage = (error) => {
        if (typeof error === 'string') return error;
        
        if (error.response?.data?.error) {
            return error.response.data.error;
        }
        
        if (error.message) {
            if (error.message.includes('Failed to fetch')) {
                return 'Network error. Please check your internet connection.';
            }
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                return 'Request timed out. Please try again.';
            }
            return error.message;
        }
        
        return 'An unexpected error occurred. Please try again.';
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ===================================================================
    // 🔌 CORE API REQUEST FUNCTION - FIXED
    // ===================================================================
    
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

        // Build URL
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
                
                // ✅ FIXED: Don't try to set read-only properties
                if (error.name === 'AbortError') {
                    // Create a new error instead of modifying the existing one
                    const timeoutError = new Error('Request timeout');
                    timeoutError.status = 408;
                    timeoutError.originalError = error;
                    lastError = timeoutError;
                    break;
                }
                
                // Don't retry on certain errors
                if (error.status === 401 || error.status === 403) {
                    break;
                }
                
                if (error.status === 404) {
                    break;
                }
                
                if (error.status === 429) {
                    break;
                }
                
                if (error.status >= 500 && attempt < retries) {
                    attempt++;
                    await sleep(CONFIG.RETRY_DELAY * attempt);
                    continue;
                }
                
                break;
            }
        }

        clearTimeout(timeoutId);

        // Create error object with proper properties
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
    
    const uploadFile = async (file) => {
        if (!file) {
            throw { success: false, error: 'No file provided' };
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            throw {
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            };
        }

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

        return apiRequest('/upload', {
            method: 'POST',
            headers: {
                // Don't set Content-Type - browser will set it
            },
            data: formData,
            timeout: CONFIG.UPLOAD_TIMEOUT,
            retries: 2
        });
    };

    // ===================================================================
    // 🔐 AUTHENTICATION API
    // ===================================================================
    
    const AuthAPI = {
        async login(email, password) {
            return apiRequest('/users/login', {
                method: 'POST',
                data: { email, password },
                skipAuth: true
            });
        },

        async adminLogin(email, password) {
            return apiRequest('/login', {
                method: 'POST',
                data: { email, password },
                skipAuth: true
            });
        },

        async getProfile() {
            return apiRequest('/users/profile', {
                method: 'GET'
            });
        },

        async forgotPassword(email) {
            return apiRequest('/users/forgot-password', {
                method: 'POST',
                data: { email },
                skipAuth: true
            });
        },

        async resetPassword(token, password) {
            return apiRequest('/users/reset-password', {
                method: 'POST',
                data: { token, password },
                skipAuth: true
            });
        },

        async changePassword(currentPassword, newPassword) {
            return apiRequest('/users/change-password', {
                method: 'POST',
                data: { currentPassword, newPassword }
            });
        }
    };

    // ===================================================================
    // 👥 USER MANAGEMENT API
    // ===================================================================
    
    const UserAPI = {
        async getAllUsers(params = {}) {
            return apiRequest('/users', {
                method: 'GET',
                params
            });
        },

        async getUserById(userId) {
            return apiRequest(`/users/${userId}`, {
                method: 'GET'
            });
        },

        async updateUser(userId, userData) {
            return apiRequest(`/users/${userId}`, {
                method: 'PUT',
                data: userData
            });
        },

        async deleteUser(userId) {
            return apiRequest(`/users/${userId}`, {
                method: 'DELETE'
            });
        }
    };

    // ===================================================================
    // 📚 ENROLLMENT API
    // ===================================================================
    
    const EnrollmentAPI = {
        async createEnrollment(enrollmentData) {
            return apiRequest('/enrollments', {
                method: 'POST',
                data: enrollmentData,
                skipAuth: true
            });
        },

        async getAllEnrollments(params = {}) {
            return apiRequest('/enrollments', {
                method: 'GET',
                params
            });
        },

        async getEnrollmentByEmail(email) {
            return apiRequest(`/enrollments/${encodeURIComponent(email)}`, {
                method: 'GET'
            });
        },

        async uploadPaymentProof(enrollmentId, file) {
            const uploadResult = await uploadFile(file);
            return apiRequest(`/enrollments/${enrollmentId}/proof`, {
                method: 'POST',
                data: { fileUrl: uploadResult.data.url }
            });
        },

        async updateStatus(enrollmentId, status, adminNotes = null) {
            return apiRequest(`/enrollments/${enrollmentId}/status`, {
                method: 'PATCH',
                data: { status, adminNotes }
            });
        }
    };

    // ===================================================================
    // 🎓 COURSES API
    // ===================================================================
    
    const CourseAPI = {
        async getAllCourses(params = {}) {
            return apiRequest('/courses', {
                method: 'GET',
                params
            });
        },

        async getCourseById(courseId) {
            return apiRequest(`/courses/${courseId}`, {
                method: 'GET'
            });
        },

        async getMyCourses() {
            return apiRequest('/user/courses', {
                method: 'GET'
            });
        }
    };

    // ===================================================================
    // 📝 QUIZZES API
    // ===================================================================
    
    const QuizAPI = {
        async getAllQuizzes(params = {}) {
            return apiRequest('/quizzes', {
                method: 'GET',
                params
            });
        },

        async getQuizById(quizId) {
            return apiRequest(`/quizzes/${quizId}`, {
                method: 'GET'
            });
        },

        async submitQuiz(quizId, answers) {
            return apiRequest(`/quizzes/${quizId}/submit`, {
                method: 'POST',
                data: { answers }
            });
        }
    };

    // ===================================================================
    // 📄 MATERIALS API
    // ===================================================================
    
    const MaterialAPI = {
        async getAllMaterials(params = {}) {
            return apiRequest('/materials', {
                method: 'GET',
                params
            });
        },

        async getMaterialById(materialId) {
            return apiRequest(`/materials/${materialId}`, {
                method: 'GET'
            });
        }
    };

    // ===================================================================
    // 📋 ASSIGNMENTS API
    // ===================================================================
    
    const AssignmentAPI = {
        async getAllAssignments(params = {}) {
            return apiRequest('/assignments', {
                method: 'GET',
                params
            });
        },

        async getAssignmentById(assignmentId) {
            return apiRequest(`/assignments/${assignmentId}`, {
                method: 'GET'
            });
        },

        async submitAssignment(assignmentId, fileUrl, fileName, comments = '') {
            return apiRequest(`/assignments/${assignmentId}/submit`, {
                method: 'POST',
                data: { fileUrl, fileName, comments }
            });
        }
    };

    // ===================================================================
    // 💬 MESSAGES API
    // ===================================================================
    
    const MessageAPI = {
        async sendMessage(name, email, message, service = null, phone = null) {
            return apiRequest('/messages', {
                method: 'POST',
                data: { name, email, phone, service, message },
                skipAuth: true
            });
        },

        async getMyMessages() {
            return apiRequest('/messages', {
                method: 'GET'
            });
        }
    };

    // ===================================================================
    // 🔔 NOTIFICATIONS API
    // ===================================================================
    
    const NotificationAPI = {
        async getUserNotifications(email) {
            return apiRequest(`/notifications/${encodeURIComponent(email)}`, {
                method: 'GET'
            });
        }
    };

    // ===================================================================
    // 📊 ADMIN API
    // ===================================================================
    
    const AdminAPI = {
        async getStats() {
            return apiRequest('/admin/stats', {
                method: 'GET'
            });
        },

        async exportData(type = 'all') {
            return apiRequest('/admin/export', {
                method: 'GET',
                params: { type }
            });
        }
    };

    // ===================================================================
    // 🔍 SYSTEM API
    // ===================================================================
    
    const SystemAPI = {
        async checkHealth() {
            try {
                return await apiRequest('/health', {
                    method: 'GET',
                    skipAuth: true,
                    timeout: 5000,
                    retries: 1
                });
            } catch (error) {
                return { success: false, error: error.error || 'API is offline' };
            }
        },

        async getDocs() {
            return apiRequest('/docs', {
                method: 'GET',
                skipAuth: true
            });
        },

        async testEnv() {
            return apiRequest('/test-env', {
                method: 'GET'
            });
        }
    };

    // ===================================================================
    // 📦 EXPORT PUBLIC API
    // ===================================================================
    
    window.API = {
        request: apiRequest,
        upload: uploadFile,
        
        auth: AuthAPI,
        users: UserAPI,
        enrollments: EnrollmentAPI,
        courses: CourseAPI,
        quizzes: QuizAPI,
        materials: MaterialAPI,
        assignments: AssignmentAPI,
        messages: MessageAPI,
        notifications: NotificationAPI,
        admin: AdminAPI,
        system: SystemAPI,
        
        utils: {
            getAuthToken,
            formatErrorMessage
        },
        
        config: CONFIG,
        version: '2.0.0'
    };

    window.MartooAPI = window.API;

    // ===================================================================
    // 🚀 INITIALIZATION
    // ===================================================================
    
    function init() {
        console.log('✅ API connected to:', CONFIG.BASE_URL);
        console.log('📚 Backend: mtechworks1-hub/martoo-tech-backend-Qgis');
        
        // Test connection (don't fail if offline)
        SystemAPI.checkHealth()
            .then(() => console.log('✅ Backend connection verified'))
            .catch(() => console.log('⚠️ Backend offline - using demo mode'));
    }

    init();

})();
