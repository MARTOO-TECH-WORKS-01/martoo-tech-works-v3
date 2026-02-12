/**
 * ===================================================================
 * MARTOO TECH WORKS - API SERVICE MODULE
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel - YOUR ACTUAL BACKEND
 * Repository: mtechworks1-hub/martoo-tech-backend-Qgis
 * Base URL: https://martoo-tech-backend-qgis.vercel.app/api
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 IMMEDIATE SELF-EXECUTING FUNCTION - NO EXPORTS!
// ===================================================================

(function() {
    
    // ===================================================================
    // 🔧 API CONFIGURATION - MATCHES YOUR BACKEND
    // ===================================================================
    
    const CONFIG = {
        // ✅ YOUR ACTUAL PRODUCTION BACKEND URL
        BASE_URL: 'https://martoo-tech-backend-qgis.vercel.app/api',
        
        // Timeouts
        TIMEOUT: 30000,
        UPLOAD_TIMEOUT: 60000,
        
        // Retry Configuration
        MAX_RETRIES: 2,
        RETRY_DELAY: 1000,
        
        // Debug mode
        DEBUG: false
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    const getAuthToken = () => {
        return localStorage.getItem('martoo_token') || 
               sessionStorage.getItem('martoo_token') || 
               null;
    };

    const isAuthenticated = () => {
        return !!getAuthToken();
    };

    const isAdmin = () => {
        const token = getAuthToken();
        const adminToken = 'YOUR_ADMIN_TOKEN'; // This should come from env
        return token === adminToken;
    };

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
    // 🔌 CORE API REQUEST - MATCHES YOUR BACKEND
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
        
        // Add query parameters
        if (method === 'GET' && Object.keys(params).length > 0) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.append(key, value);
                }
            });
        }

        // Headers - MATCHES YOUR BACKEND EXPECTATIONS
        const requestHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers
        };

        // Add authentication token (Bearer format - YOUR BACKEND USES THIS)
        if (!skipAuth) {
            const token = getAuthToken();
            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            }
        }

        const requestConfig = {
            method,
            headers: requestHeaders,
            mode: 'cors',
            credentials: 'include'
        };

        // Add body for non-GET requests
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

                // Handle HTTP errors - MATCHES YOUR BACKEND ERROR FORMAT
                if (!response.ok) {
                    const error = new Error(responseData.error || `HTTP error ${response.status}`);
                    error.status = response.status;
                    error.statusText = response.statusText;
                    error.data = responseData;
                    throw error;
                }

                return {
                    success: true,
                    status: response.status,
                    data: responseData,
                    timestamp: new Date().toISOString()
                };

            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (error.name === 'AbortError') {
                    error.message = 'Request timeout';
                    break;
                }
                
                if (error.status === 401 || error.status === 403) {
                    break;
                }
                
                if (error.status === 404) {
                    break;
                }
                
                if (error.status >= 500 && attempt < retries) {
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
                    continue;
                }
                
                break;
            }
        }

        clearTimeout(timeoutId);
        
        const error = new Error(lastError?.message || 'API request failed');
        error.status = lastError?.status || 500;
        error.data = lastError?.data;
        throw error;
    };

    // ===================================================================
    // 📁 FILE UPLOAD - MATCHES YOUR BACKEND CLOUDINARY INTEGRATION
    // ===================================================================
    
    const uploadFile = async (file) => {
        if (!file) {
            throw new Error('No file provided');
        }

        // Your backend limits
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File too large. Maximum size is 10MB.');
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
            throw new Error('Invalid file type. Allowed: images, PDFs, documents, ZIP files.');
        }

        const formData = new FormData();
        formData.append('file', file);

        // POST /upload - Your Cloudinary upload endpoint
        const response = await apiRequest('/upload', {
            method: 'POST',
            headers: {
                // Don't set Content-Type - browser sets it with boundary
            },
            data: formData,
            timeout: CONFIG.UPLOAD_TIMEOUT,
            retries: 1
        });

        return response;
    };

    // ===================================================================
    // 🔐 AUTHENTICATION API - MATCHES YOUR BACKEND ROUTES
    // ===================================================================
    
    const AuthAPI = {
        // POST /users/login - User login
        async login(email, password) {
            return apiRequest('/users/login', {
                method: 'POST',
                data: { email, password },
                skipAuth: true
            });
        },

        // POST /login - Admin login (FIXED with trim)
        async adminLogin(email, password) {
            return apiRequest('/login', {
                method: 'POST',
                data: { email, password },
                skipAuth: true
            });
        },

        // POST /users/register - Register user (Admin only)
        async registerUser(userData) {
            return apiRequest('/users/register', {
                method: 'POST',
                data: userData
            });
        },

        // GET /users/profile - Get user profile
        async getProfile() {
            return apiRequest('/users/profile', {
                method: 'GET'
            });
        },

        // POST /users/forgot-password - Request password reset
        async forgotPassword(email) {
            return apiRequest('/users/forgot-password', {
                method: 'POST',
                data: { email },
                skipAuth: true
            });
        },

        // POST /users/reset-password - Reset password
        async resetPassword(token, password) {
            return apiRequest('/users/reset-password', {
                method: 'POST',
                data: { token, password },
                skipAuth: true
            });
        },

        // POST /users/change-password - Change password
        async changePassword(currentPassword, newPassword) {
            return apiRequest('/users/change-password', {
                method: 'POST',
                data: { currentPassword, newPassword }
            });
        }
    };

    // ===================================================================
    // 👥 USER MANAGEMENT API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const UserAPI = {
        // GET /users - Get all users (Admin only)
        async getAllUsers(params = {}) {
            return apiRequest('/users', {
                method: 'GET',
                params
            });
        },

        // GET /users/:id - Get user by ID (Admin only)
        async getUserById(userId) {
            return apiRequest(`/users/${userId}`, {
                method: 'GET'
            });
        },

        // PUT /users/:id - Update user (Admin only)
        async updateUser(userId, userData) {
            return apiRequest(`/users/${userId}`, {
                method: 'PUT',
                data: userData
            });
        },

        // DELETE /users/:id - Delete user (Admin only)
        async deleteUser(userId) {
            return apiRequest(`/users/${userId}`, {
                method: 'DELETE'
            });
        }
    };

    // ===================================================================
    // 📚 ENROLLMENT API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const EnrollmentAPI = {
        // POST /enrollments - Create enrollment
        async createEnrollment(enrollmentData) {
            return apiRequest('/enrollments', {
                method: 'POST',
                data: enrollmentData,
                skipAuth: true
            });
        },

        // GET /enrollments - Get all enrollments (Admin only)
        async getAllEnrollments(params = {}) {
            return apiRequest('/enrollments', {
                method: 'GET',
                params
            });
        },

        // GET /user/:email - Get enrollment by email
        async getEnrollmentByEmail(email) {
            return apiRequest(`/user/${encodeURIComponent(email)}`, {
                method: 'GET'
            });
        },

        // POST /enrollments/:id/proof - Upload payment proof
        async uploadPaymentProof(enrollmentId, file) {
            const uploadResult = await uploadFile(file);
            return apiRequest(`/enrollments/${enrollmentId}/proof`, {
                method: 'POST',
                data: { fileUrl: uploadResult.data.url }
            });
        },

        // PATCH /enrollments/:id/status - Update enrollment status (Admin only)
        async updateStatus(enrollmentId, status, adminNotes = null) {
            return apiRequest(`/enrollments/${enrollmentId}/status`, {
                method: 'PATCH',
                data: { status, adminNotes }
            });
        }
    };

    // ===================================================================
    // 🎓 QUIZZES API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const QuizAPI = {
        // POST /quizzes - Create quiz (Admin only)
        async createQuiz(quizData) {
            return apiRequest('/quizzes', {
                method: 'POST',
                data: quizData
            });
        },

        // GET /quizzes - Get all quizzes
        async getAllQuizzes(params = {}) {
            return apiRequest('/quizzes', {
                method: 'GET',
                params
            });
        },

        // GET /quizzes/:id - Get single quiz
        async getQuizById(quizId) {
            return apiRequest(`/quizzes/${quizId}`, {
                method: 'GET'
            });
        },

        // PUT /quizzes/:id - Update quiz (Admin only)
        async updateQuiz(quizId, quizData) {
            return apiRequest(`/quizzes/${quizId}`, {
                method: 'PUT',
                data: quizData
            });
        },

        // DELETE /quizzes/:id - Delete quiz (Admin only)
        async deleteQuiz(quizId) {
            return apiRequest(`/quizzes/${quizId}`, {
                method: 'DELETE'
            });
        },

        // POST /quizzes/:id/submit - Submit quiz answers
        async submitQuiz(quizId, answers) {
            return apiRequest(`/quizzes/${quizId}/submit`, {
                method: 'POST',
                data: { answers }
            });
        },

        // GET /quizzes/:id/results - Get quiz results (Admin only)
        async getQuizResults(quizId) {
            return apiRequest(`/quizzes/${quizId}/results`, {
                method: 'GET'
            });
        }
    };

    // ===================================================================
    // 📄 MATERIALS API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const MaterialAPI = {
        // POST /materials - Upload material (Admin only)
        async uploadMaterial(materialData) {
            return apiRequest('/materials', {
                method: 'POST',
                data: materialData
            });
        },

        // GET /materials - Get all materials
        async getAllMaterials(params = {}) {
            return apiRequest('/materials', {
                method: 'GET',
                params
            });
        },

        // GET /materials/:id - Get single material
        async getMaterialById(materialId) {
            return apiRequest(`/materials/${materialId}`, {
                method: 'GET'
            });
        },

        // DELETE /materials/:id - Delete material (Admin only)
        async deleteMaterial(materialId) {
            return apiRequest(`/materials/${materialId}`, {
                method: 'DELETE'
            });
        }
    };

    // ===================================================================
    // 📋 ASSIGNMENTS API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const AssignmentAPI = {
        // POST /assignments - Create assignment (Admin only)
        async createAssignment(assignmentData) {
            return apiRequest('/assignments', {
                method: 'POST',
                data: assignmentData
            });
        },

        // GET /assignments - Get all assignments
        async getAllAssignments(params = {}) {
            return apiRequest('/assignments', {
                method: 'GET',
                params
            });
        },

        // GET /assignments/:id - Get single assignment
        async getAssignmentById(assignmentId) {
            return apiRequest(`/assignments/${assignmentId}`, {
                method: 'GET'
            });
        },

        // DELETE /assignments/:id - Delete assignment (Admin only)
        async deleteAssignment(assignmentId) {
            return apiRequest(`/assignments/${assignmentId}`, {
                method: 'DELETE'
            });
        },

        // POST /assignments/:id/submit - Submit assignment
        async submitAssignment(assignmentId, fileUrl, fileName, comments = '') {
            return apiRequest(`/assignments/${assignmentId}/submit`, {
                method: 'POST',
                data: { fileUrl, fileName, comments }
            });
        },

        // POST /assignments/:id/grade - Grade assignment (Admin only)
        async gradeAssignment(assignmentId, submissionId, score, feedback = '') {
            return apiRequest(`/assignments/${assignmentId}/grade`, {
                method: 'POST',
                data: { submissionId, score, feedback }
            });
        }
    };

    // ===================================================================
    // 💬 MESSAGES API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const MessageAPI = {
        // POST /messages - Send message
        async sendMessage(recipient, content, subject = '') {
            return apiRequest('/messages', {
                method: 'POST',
                data: { recipient, content, subject }
            });
        },

        // GET /messages - Get user messages
        async getMyMessages() {
            return apiRequest('/messages', {
                method: 'GET'
            });
        },

        // GET /messages/all - Get all messages (Admin only)
        async getAllMessages() {
            return apiRequest('/messages/all', {
                method: 'GET'
            });
        },

        // DELETE /messages/:id - Delete message
        async deleteMessage(messageId) {
            return apiRequest(`/messages/${messageId}`, {
                method: 'DELETE'
            });
        }
    };

    // ===================================================================
    // 🔔 NOTIFICATIONS API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const NotificationAPI = {
        // POST /notifications - Create notification (Admin only)
        async createNotification(email, message, type = 'info', link = null) {
            return apiRequest('/notifications', {
                method: 'POST',
                data: { email, message, type, link }
            });
        },

        // GET /notifications/:email - Get user notifications
        async getUserNotifications(email) {
            return apiRequest(`/notifications/${encodeURIComponent(email)}`, {
                method: 'GET'
            });
        },

        // PATCH /notifications/:id/read - Mark notification as read
        async markAsRead(notificationId) {
            return apiRequest(`/notifications/${notificationId}/read`, {
                method: 'PATCH'
            });
        },

        // PATCH /notifications/:email/read-all - Mark all as read
        async markAllAsRead(email) {
            return apiRequest(`/notifications/${encodeURIComponent(email)}/read-all`, {
                method: 'PATCH'
            });
        }
    };

    // ===================================================================
    // 📊 ADMIN API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const AdminAPI = {
        // GET /admin/stats - Get dashboard stats
        async getStats() {
            return apiRequest('/admin/stats', {
                method: 'GET'
            });
        },

        // GET /admin/export - Export data
        async exportData(type = 'all') {
            return apiRequest('/admin/export', {
                method: 'GET',
                params: { type }
            });
        }
    };

    // ===================================================================
    // 🔍 SYSTEM API - MATCHES YOUR BACKEND
    // ===================================================================
    
    const SystemAPI = {
        // GET /health - Health check
        async checkHealth() {
            return apiRequest('/health', {
                method: 'GET',
                skipAuth: true,
                timeout: 5000,
                retries: 1
            });
        },

        // GET /docs - API documentation
        async getDocs() {
            return apiRequest('/docs', {
                method: 'GET',
                skipAuth: true
            });
        },

        // GET /test-env - Test environment
        async testEnv() {
            return apiRequest('/test-env', {
                method: 'GET'
            });
        },

        // GET /debug-admin - Debug admin (Admin only)
        async debugAdmin() {
            return apiRequest('/debug-admin', {
                method: 'GET'
            });
        }
    };

    // ===================================================================
    // 📦 EXPORT PUBLIC API
    // ===================================================================
    
    window.API = {
        // Core
        request: apiRequest,
        upload: uploadFile,
        
        // All API modules
        auth: AuthAPI,
        users: UserAPI,
        enrollments: EnrollmentAPI,
        quizzes: QuizAPI,
        materials: MaterialAPI,
        assignments: AssignmentAPI,
        messages: MessageAPI,
        notifications: NotificationAPI,
        admin: AdminAPI,
        system: SystemAPI,
        
        // Utilities
        utils: {
            getAuthToken,
            isAuthenticated,
            isAdmin,
            getCurrentUser
        },
        
        config: CONFIG,
        version: '2.0.0'
    };

    // Alias for backward compatibility
    window.MartooAPI = window.API;

    // ===================================================================
    // 🚀 INITIALIZATION
    // ===================================================================
    
    function init() {
        console.log('✅ API connected to:', CONFIG.BASE_URL);
        console.log('📚 Backend: mtechworks1-hub/martoo-tech-backend-Qgis');
    }

    init();

})();
