/**
 * ===================================================================
 * MARTOO TECH WORKS - PRODUCTION READY API SERVICE LAYER
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel
 * Database: Firebase Firestore
 * Authentication: JWT + Admin Token
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 API CONFIGURATION
// ===================================================================

const API_CONFIG = {
    // Base URL - Production backend deployed on Vercel
    BASE_URL: 'https://martoo-tech-backend-qgis.vercel.app/api',
    
    // Alternative URLs (fallback in order)
    FALLBACK_URLS: [
        'https://martoo-tech-backend-qgis.vercel.app/api',
        'https://martoo-tech-backend-qgis-git-main.vercel.app/api',
        'http://localhost:5000/api' // For local development
    ],
    
    // API Version
    VERSION: '2.0.0',
    
    // Timeouts (in milliseconds)
    TIMEOUT: 30000, // 30 seconds default
    UPLOAD_TIMEOUT: 60000, // 60 seconds for file uploads
    
    // Retry Configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    
    // Cache Configuration
    CACHE_DURATION: 300000, // 5 minutes
    ENABLE_CACHE: true,
    
    // Debug Mode
    DEBUG: false // Set to false in production
};

// ===================================================================
// 📦 IN-MEMORY CACHE
// ===================================================================

const API_CACHE = new Map();

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
    const now = Date.now();
    API_CACHE.forEach((value, key) => {
        if (value.expiry < now) {
            API_CACHE.delete(key);
            if (API_CONFIG.DEBUG) console.log(`🗑️ Cache expired: ${key}`);
        }
    });
};

// Run cache cleanup every 5 minutes
setInterval(clearExpiredCache, 300000);

// ===================================================================
// 🔧 UTILITY FUNCTIONS
// ===================================================================

/**
 * Generate cache key from endpoint and params
 */
const generateCacheKey = (endpoint, params = {}) => {
    return `${endpoint}:${JSON.stringify(params)}`;
};

/**
 * Get cached response if valid
 */
const getCachedResponse = (key) => {
    if (!API_CONFIG.ENABLE_CACHE) return null;
    
    const cached = API_CACHE.get(key);
    if (cached && cached.expiry > Date.now()) {
        if (API_CONFIG.DEBUG) console.log(`✅ Cache hit: ${key}`);
        return cached.data;
    }
    return null;
};

/**
 * Set cached response
 */
const setCachedResponse = (key, data, duration = API_CONFIG.CACHE_DURATION) => {
    if (!API_CONFIG.ENABLE_CACHE) return;
    
    API_CACHE.set(key, {
        data,
        expiry: Date.now() + duration,
        timestamp: new Date().toISOString()
    });
    
    if (API_CONFIG.DEBUG) console.log(`💾 Cache set: ${key}`);
};

/**
 * Clear cache by pattern (e.g., '/api/users')
 */
const clearCache = (pattern) => {
    const keys = [...API_CACHE.keys()];
    keys.forEach(key => {
        if (key.includes(pattern)) {
            API_CACHE.delete(key);
            if (API_CONFIG.DEBUG) console.log(`🧹 Cache cleared: ${key}`);
        }
    });
};

/**
 * Sleep/delay function for retries
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Safe JSON parse with fallback
 */
const safeJsonParse = (str, fallback = null) => {
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
};

/**
 * Get auth token from storage
 */
const getAuthToken = () => {
    return localStorage.getItem('martoo_token') || 
           sessionStorage.getItem('martoo_token') || 
           null;
};

/**
 * Get admin token from environment config
 */
const getAdminToken = () => {
    // In production, this should come from your environment config
    return window.MARTOO_CONFIG?.ADMIN_TOKEN || null;
};

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
    
    if (token === adminToken) return true;
    
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
    const userData = localStorage.getItem('martoo_user');
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch {
            return null;
        }
    }
    return null;
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

// ===================================================================
// 🔌 CORE API REQUEST FUNCTION
// ===================================================================

/**
 * Make API request with retry logic, timeout, and error handling
 */
const apiRequest = async (endpoint, options = {}) => {
    const {
        method = 'GET',
        data = null,
        params = {},
        headers = {},
        timeout = API_CONFIG.TIMEOUT,
        retries = API_CONFIG.MAX_RETRIES,
        useCache = false,
        cacheDuration = API_CONFIG.CACHE_DURATION,
        skipAuth = false,
        skipAdminCheck = false,
        baseUrl = API_CONFIG.BASE_URL
    } = options;

    // Build URL with query parameters
    const url = new URL(`${baseUrl}${endpoint}`);
    
    // Add query parameters for GET requests
    if (method === 'GET' && Object.keys(params).length > 0) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, value);
            }
        });
    }

    // Check cache for GET requests
    if (method === 'GET' && useCache) {
        const cacheKey = generateCacheKey(url.toString(), params);
        const cached = getCachedResponse(cacheKey);
        if (cached) return cached;
    }

    // Prepare headers
    const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Version': API_CONFIG.VERSION,
        'X-Requested-With': 'XMLHttpRequest',
        ...headers
    };

    // Add authentication token
    if (!skipAuth) {
        const token = getAuthToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    // Add admin token if available and not skipped
    if (!skipAdminCheck) {
        const adminToken = getAdminToken();
        if (adminToken) {
            requestHeaders['X-Admin-Token'] = adminToken;
        }
    }

    // Request configuration
    const requestConfig = {
        method,
        headers: requestHeaders,
        mode: 'cors',
        credentials: 'include',
        redirect: 'follow'
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
            if (API_CONFIG.DEBUG) {
                console.log(`🌐 API Request [${attempt + 1}/${retries + 1}]:`, {
                    method,
                    url: url.toString(),
                    data,
                    params
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
            const result = {
                success: true,
                status: response.status,
                data: responseData,
                timestamp: new Date().toISOString(),
                requestId: response.headers.get('X-Request-ID') || null
            };

            // Cache successful GET responses
            if (method === 'GET' && useCache) {
                const cacheKey = generateCacheKey(url.toString(), params);
                setCachedResponse(cacheKey, result, cacheDuration);
            }

            if (API_CONFIG.DEBUG) {
                console.log(`✅ API Success [${attempt + 1}]:`, {
                    endpoint,
                    status: response.status,
                    timestamp: result.timestamp
                });
            }

            return result;

        } catch (error) {
            lastError = error;
            
            // Don't retry on certain errors
            if (error.name === 'AbortError') {
                error.message = 'Request timeout';
                break;
            }
            
            if (error.status === 401 || error.status === 403) {
                // Authentication error - don't retry
                if (API_CONFIG.DEBUG) {
                    console.error(`🔐 Auth error [${error.status}]:`, error.message);
                }
                break;
            }
            
            if (error.status === 404) {
                // Not found - don't retry
                break;
            }
            
            if (error.status >= 500 && attempt < retries) {
                // Server error - retry
                attempt++;
                if (API_CONFIG.DEBUG) {
                    console.warn(`⚠️ API Retry [${attempt}/${retries}]:`, {
                        endpoint,
                        status: error.status,
                        attempt
                    });
                }
                await sleep(API_CONFIG.RETRY_DELAY * attempt);
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
        timestamp: new Date().toISOString(),
        details: API_CONFIG.DEBUG ? lastError?.data || lastError?.message : undefined
    };

    if (API_CONFIG.DEBUG) {
        console.error('❌ API Failed:', {
            endpoint,
            error: errorResult.error,
            status: errorResult.status,
            details: lastError
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
        'application/zip',
        'application/x-zip-compressed'
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
            'Content-Type': 'multipart/form-data'
        },
        data: formData,
        timeout: API_CONFIG.UPLOAD_TIMEOUT,
        retries: 2,
        skipAuth: false
    });
};

// ===================================================================
// 🔐 AUTHENTICATION API
// ===================================================================

const AuthAPI = {
    /**
     * User login
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} Login response with token and user data
     */
    async login(email, password) {
        return apiRequest('/users/login', {
            method: 'POST',
            data: { email, password },
            skipAuth: true,
            useCache: false
        });
    },

    /**
     * Admin login
     * @param {string} email - Admin email
     * @param {string} password - Admin password
     * @returns {Promise} Login response with admin token
     */
    async adminLogin(email, password) {
        return apiRequest('/login', {
            method: 'POST',
            data: { email, password },
            skipAuth: true,
            useCache: false
        });
    },

    /**
     * Register new user (Admin only)
     * @param {Object} userData - User registration data
     * @returns {Promise} Registration response
     */
    async registerUser(userData) {
        return apiRequest('/users/register', {
            method: 'POST',
            data: userData,
            skipAuth: false,
            useCache: false
        });
    },

    /**
     * Get current user profile
     * @returns {Promise} User profile data
     */
    async getProfile() {
        return apiRequest('/users/profile', {
            method: 'GET',
            useCache: true,
            cacheDuration: 60000 // 1 minute
        });
    },

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise} Password reset response
     */
    async forgotPassword(email) {
        return apiRequest('/users/forgot-password', {
            method: 'POST',
            data: { email },
            skipAuth: true,
            useCache: false
        });
    },

    /**
     * Reset password with token
     * @param {string} token - Reset token
     * @param {string} password - New password
     * @returns {Promise} Password reset response
     */
    async resetPassword(token, password) {
        return apiRequest('/users/reset-password', {
            method: 'POST',
            data: { token, password },
            skipAuth: true,
            useCache: false
        });
    },

    /**
     * Change password (authenticated)
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise} Password change response
     */
    async changePassword(currentPassword, newPassword) {
        return apiRequest('/users/change-password', {
            method: 'POST',
            data: { currentPassword, newPassword },
            useCache: false
        });
    }
};

// ===================================================================
// 👥 USER MANAGEMENT API
// ===================================================================

const UserAPI = {
    /**
     * Get all users (Admin only)
     * @param {Object} params - Pagination and filter params
     * @returns {Promise} Paginated users list
     */
    async getAllUsers(params = {}) {
        return apiRequest('/users', {
            method: 'GET',
            params,
            useCache: true,
            cacheDuration: 30000 // 30 seconds
        });
    },

    /**
     * Get user by ID (Admin only)
     * @param {string} userId - User ID
     * @returns {Promise} User data
     */
    async getUserById(userId) {
        return apiRequest(`/users/${userId}`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 60000 // 1 minute
        });
    },

    /**
     * Update user (Admin only)
     * @param {string} userId - User ID
     * @param {Object} userData - Updated user data
     * @returns {Promise} Update response
     */
    async updateUser(userId, userData) {
        const result = await apiRequest(`/users/${userId}`, {
            method: 'PUT',
            data: userData,
            useCache: false
        });
        
        // Clear user cache
        clearCache('/users');
        return result;
    },

    /**
     * Delete user (Admin only)
     * @param {string} userId - User ID
     * @returns {Promise} Delete response
     */
    async deleteUser(userId) {
        const result = await apiRequest(`/users/${userId}`, {
            method: 'DELETE',
            useCache: false
        });
        
        // Clear user cache
        clearCache('/users');
        return result;
    }
};

// ===================================================================
// 📚 ENROLLMENT API
// ===================================================================

const EnrollmentAPI = {
    /**
     * Create new enrollment
     * @param {Object} enrollmentData - Enrollment data
     * @returns {Promise} Enrollment response
     */
    async createEnrollment(enrollmentData) {
        return apiRequest('/enrollments', {
            method: 'POST',
            data: enrollmentData,
            skipAuth: true,
            useCache: false
        });
    },

    /**
     * Get all enrollments (Admin only)
     * @param {Object} params - Pagination and filter params
     * @returns {Promise} Paginated enrollments list
     */
    async getAllEnrollments(params = {}) {
        return apiRequest('/enrollments', {
            method: 'GET',
            params,
            useCache: true,
            cacheDuration: 30000 // 30 seconds
        });
    },

    /**
     * Get enrollment by email
     * @param {string} email - User email
     * @returns {Promise} Enrollment data
     */
    async getEnrollmentByEmail(email) {
        return apiRequest(`/user/${encodeURIComponent(email)}`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 60000 // 1 minute
        });
    },

    /**
     * Upload payment proof
     * @param {string} enrollmentId - Enrollment ID
     * @param {File} file - Payment proof file
     * @returns {Promise} Upload response
     */
    async uploadPaymentProof(enrollmentId, file) {
        return uploadFile(file).then(uploadResult => {
            return apiRequest(`/enrollments/${enrollmentId}/proof`, {
                method: 'POST',
                data: { fileUrl: uploadResult.data.url },
                useCache: false
            });
        });
    },

    /**
     * Update enrollment status (Admin only)
     * @param {string} enrollmentId - Enrollment ID
     * @param {string} status - New status
     * @param {string} adminNotes - Optional admin notes
     * @returns {Promise} Update response
     */
    async updateStatus(enrollmentId, status, adminNotes = null) {
        const result = await apiRequest(`/enrollments/${enrollmentId}/status`, {
            method: 'PATCH',
            data: { status, adminNotes },
            useCache: false
        });
        
        // Clear enrollment cache
        clearCache('/enrollments');
        return result;
    }
};

// ===================================================================
// 🎓 COURSES & ACADEMY API
// ===================================================================

const CourseAPI = {
    /**
     * Get all courses
     * @param {Object} params - Filter params (category, level, etc.)
     * @returns {Promise} Courses list
     */
    async getAllCourses(params = {}) {
        return apiRequest('/courses', {
            method: 'GET',
            params,
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Get course by ID
     * @param {string} courseId - Course ID
     * @returns {Promise} Course data
     */
    async getCourseById(courseId) {
        return apiRequest(`/courses/${courseId}`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Create new course (Admin only)
     * @param {Object} courseData - Course data
     * @returns {Promise} Creation response
     */
    async createCourse(courseData) {
        const result = await apiRequest('/courses', {
            method: 'POST',
            data: courseData,
            useCache: false
        });
        
        clearCache('/courses');
        return result;
    },

    /**
     * Update course (Admin only)
     * @param {string} courseId - Course ID
     * @param {Object} courseData - Updated course data
     * @returns {Promise} Update response
     */
    async updateCourse(courseId, courseData) {
        const result = await apiRequest(`/courses/${courseId}`, {
            method: 'PUT',
            data: courseData,
            useCache: false
        });
        
        clearCache('/courses');
        return result;
    },

    /**
     * Delete course (Admin only)
     * @param {string} courseId - Course ID
     * @returns {Promise} Delete response
     */
    async deleteCourse(courseId) {
        const result = await apiRequest(`/courses/${courseId}`, {
            method: 'DELETE',
            useCache: false
        });
        
        clearCache('/courses');
        return result;
    },

    /**
     * Enroll user in course
     * @param {string} courseId - Course ID
     * @returns {Promise} Enrollment response
     */
    async enrollInCourse(courseId) {
        return apiRequest('/enrollments', {
            method: 'POST',
            data: { courseId, type: 'course' },
            useCache: false
        });
    },

    /**
     * Get user's enrolled courses
     * @returns {Promise} Enrolled courses list
     */
    async getMyCourses() {
        return apiRequest('/user/courses', {
            method: 'GET',
            useCache: true,
            cacheDuration: 60000 // 1 minute
        });
    },

    /**
     * Get course progress
     * @param {string} courseId - Course ID
     * @returns {Promise} Course progress data
     */
    async getCourseProgress(courseId) {
        return apiRequest(`/courses/${courseId}/progress`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 30000 // 30 seconds
        });
    },

    /**
     * Update course progress
     * @param {string} courseId - Course ID
     * @param {number} lessonId - Lesson ID
     * @param {string} status - Lesson status (completed, in-progress)
     * @returns {Promise} Progress update response
     */
    async updateProgress(courseId, lessonId, status) {
        return apiRequest(`/courses/${courseId}/progress`, {
            method: 'POST',
            data: { lessonId, status },
            useCache: false
        });
    }
};

// ===================================================================
// 📝 QUIZZES API
// ===================================================================

const QuizAPI = {
    /**
     * Get all quizzes
     * @param {Object} params - Filter params
     * @returns {Promise} Quizzes list
     */
    async getAllQuizzes(params = {}) {
        return apiRequest('/quizzes', {
            method: 'GET',
            params,
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Get quiz by ID
     * @param {string} quizId - Quiz ID
     * @returns {Promise} Quiz data
     */
    async getQuizById(quizId) {
        return apiRequest(`/quizzes/${quizId}`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Create quiz (Admin only)
     * @param {Object} quizData - Quiz data
     * @returns {Promise} Creation response
     */
    async createQuiz(quizData) {
        const result = await apiRequest('/quizzes', {
            method: 'POST',
            data: quizData,
            useCache: false
        });
        
        clearCache('/quizzes');
        return result;
    },

    /**
     * Update quiz (Admin only)
     * @param {string} quizId - Quiz ID
     * @param {Object} quizData - Updated quiz data
     * @returns {Promise} Update response
     */
    async updateQuiz(quizId, quizData) {
        const result = await apiRequest(`/quizzes/${quizId}`, {
            method: 'PUT',
            data: quizData,
            useCache: false
        });
        
        clearCache('/quizzes');
        return result;
    },

    /**
     * Delete quiz (Admin only)
     * @param {string} quizId - Quiz ID
     * @returns {Promise} Delete response
     */
    async deleteQuiz(quizId) {
        const result = await apiRequest(`/quizzes/${quizId}`, {
            method: 'DELETE',
            useCache: false
        });
        
        clearCache('/quizzes');
        return result;
    },

    /**
     * Submit quiz answers
     * @param {string} quizId - Quiz ID
     * @param {Array} answers - Quiz answers
     * @returns {Promise} Submission results with score
     */
    async submitQuiz(quizId, answers) {
        return apiRequest(`/quizzes/${quizId}/submit`, {
            method: 'POST',
            data: { answers },
            useCache: false
        });
    },

    /**
     * Get quiz results (Admin only)
     * @param {string} quizId - Quiz ID
     * @returns {Promise} Quiz results
     */
    async getQuizResults(quizId) {
        return apiRequest(`/quizzes/${quizId}/results`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 60000 // 1 minute
        });
    }
};

// ===================================================================
// 📄 MATERIALS & RESOURCES API
// ===================================================================

const MaterialAPI = {
    /**
     * Get all materials
     * @param {Object} params - Filter params (course, category)
     * @returns {Promise} Materials list
     */
    async getAllMaterials(params = {}) {
        return apiRequest('/materials', {
            method: 'GET',
            params,
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Get material by ID
     * @param {string} materialId - Material ID
     * @returns {Promise} Material data
     */
    async getMaterialById(materialId) {
        return apiRequest(`/materials/${materialId}`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Upload material (Admin only)
     * @param {Object} materialData - Material data with file
     * @returns {Promise} Upload response
     */
    async uploadMaterial(materialData) {
        const result = await apiRequest('/materials', {
            method: 'POST',
            data: materialData,
            useCache: false
        });
        
        clearCache('/materials');
        return result;
    },

    /**
     * Delete material (Admin only)
     * @param {string} materialId - Material ID
     * @returns {Promise} Delete response
     */
    async deleteMaterial(materialId) {
        const result = await apiRequest(`/materials/${materialId}`, {
            method: 'DELETE',
            useCache: false
        });
        
        clearCache('/materials');
        return result;
    }
};

// ===================================================================
// 📋 ASSIGNMENTS API
// ===================================================================

const AssignmentAPI = {
    /**
     * Get all assignments
     * @param {Object} params - Filter params
     * @returns {Promise} Assignments list
     */
    async getAllAssignments(params = {}) {
        return apiRequest('/assignments', {
            method: 'GET',
            params,
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Get assignment by ID
     * @param {string} assignmentId - Assignment ID
     * @returns {Promise} Assignment data
     */
    async getAssignmentById(assignmentId) {
        return apiRequest(`/assignments/${assignmentId}`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 300000 // 5 minutes
        });
    },

    /**
     * Create assignment (Admin only)
     * @param {Object} assignmentData - Assignment data
     * @returns {Promise} Creation response
     */
    async createAssignment(assignmentData) {
        const result = await apiRequest('/assignments', {
            method: 'POST',
            data: assignmentData,
            useCache: false
        });
        
        clearCache('/assignments');
        return result;
    },

    /**
     * Delete assignment (Admin only)
     * @param {string} assignmentId - Assignment ID
     * @returns {Promise} Delete response
     */
    async deleteAssignment(assignmentId) {
        const result = await apiRequest(`/assignments/${assignmentId}`, {
            method: 'DELETE',
            useCache: false
        });
        
        clearCache('/assignments');
        return result;
    },

    /**
     * Submit assignment
     * @param {string} assignmentId - Assignment ID
     * @param {string} fileUrl - Submitted file URL
     * @param {string} fileName - Original file name
     * @param {string} comments - Optional comments
     * @returns {Promise} Submission response
     */
    async submitAssignment(assignmentId, fileUrl, fileName, comments = '') {
        return apiRequest(`/assignments/${assignmentId}/submit`, {
            method: 'POST',
            data: { fileUrl, fileName, comments },
            useCache: false
        });
    },

    /**
     * Grade assignment (Admin only)
     * @param {string} assignmentId - Assignment ID
     * @param {string} submissionId - Submission ID
     * @param {number} score - Grade score
     * @param {string} feedback - Optional feedback
     * @returns {Promise} Grade response
     */
    async gradeAssignment(assignmentId, submissionId, score, feedback = '') {
        return apiRequest(`/assignments/${assignmentId}/grade`, {
            method: 'POST',
            data: { submissionId, score, feedback },
            useCache: false
        });
    }
};

// ===================================================================
// 💬 MESSAGES API
// ===================================================================

const MessageAPI = {
    /**
     * Send message
     * @param {string} recipient - Recipient email
     * @param {string} content - Message content
     * @param {string} subject - Message subject
     * @returns {Promise} Send response
     */
    async sendMessage(recipient, content, subject = '') {
        return apiRequest('/messages', {
            method: 'POST',
            data: { recipient, content, subject },
            useCache: false
        });
    },

    /**
     * Get user messages
     * @returns {Promise} Messages list
     */
    async getMyMessages() {
        return apiRequest('/messages', {
            method: 'GET',
            useCache: true,
            cacheDuration: 30000 // 30 seconds
        });
    },

    /**
     * Get all messages (Admin only)
     * @returns {Promise} All messages
     */
    async getAllMessages() {
        return apiRequest('/messages/all', {
            method: 'GET',
            useCache: true,
            cacheDuration: 30000 // 30 seconds
        });
    },

    /**
     * Delete message
     * @param {string} messageId - Message ID
     * @returns {Promise} Delete response
     */
    async deleteMessage(messageId) {
        return apiRequest(`/messages/${messageId}`, {
            method: 'DELETE',
            useCache: false
        });
    }
};

// ===================================================================
// 🔔 NOTIFICATIONS API
// ===================================================================

const NotificationAPI = {
    /**
     * Get user notifications
     * @param {string} email - User email
     * @returns {Promise} Notifications list
     */
    async getUserNotifications(email) {
        return apiRequest(`/notifications/${encodeURIComponent(email)}`, {
            method: 'GET',
            useCache: true,
            cacheDuration: 30000 // 30 seconds
        });
    },

    /**
     * Create notification (Admin only)
     * @param {string} email - Recipient email
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {string} link - Optional link
     * @returns {Promise} Creation response
     */
    async createNotification(email, message, type = 'info', link = null) {
        return apiRequest('/notifications', {
            method: 'POST',
            data: { email, message, type, link },
            useCache: false
        });
    },

    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     * @returns {Promise} Update response
     */
    async markAsRead(notificationId) {
        return apiRequest(`/notifications/${notificationId}/read`, {
            method: 'PATCH',
            useCache: false
        });
    },

    /**
     * Mark all notifications as read
     * @param {string} email - User email
     * @returns {Promise} Update response
     */
    async markAllAsRead(email) {
        return apiRequest(`/notifications/${encodeURIComponent(email)}/read-all`, {
            method: 'PATCH',
            useCache: false
        });
    }
};

// ===================================================================
// 📊 ADMIN DASHBOARD API
// ===================================================================

const AdminAPI = {
    /**
     * Get dashboard statistics
     * @returns {Promise} Dashboard stats
     */
    async getStats() {
        return apiRequest('/admin/stats', {
            method: 'GET',
            useCache: true,
            cacheDuration: 60000 // 1 minute
        });
    },

    /**
     * Export data (Admin only)
     * @param {string} type - Data type to export
     * @returns {Promise} Export URL
     */
    async exportData(type = 'all') {
        return apiRequest('/admin/export', {
            method: 'GET',
            params: { type },
            useCache: false
        });
    }
};

// ===================================================================
// 🔍 SYSTEM & HEALTH API
// ===================================================================

const SystemAPI = {
    /**
     * Check API health
     * @returns {Promise} Health status
     */
    async checkHealth() {
        return apiRequest('/health', {
            method: 'GET',
            skipAuth: true,
            useCache: false,
            timeout: 5000 // 5 seconds
        });
    },

    /**
     * Get API documentation
     * @returns {Promise} API endpoints documentation
     */
    async getDocs() {
        return apiRequest('/docs', {
            method: 'GET',
            skipAuth: true,
            useCache: true,
            cacheDuration: 3600000 // 1 hour
        });
    },

    /**
     * Test environment (Admin only)
     * @returns {Promise} Environment test results
     */
    async testEnv() {
        return apiRequest('/test-env', {
            method: 'GET',
            useCache: false
        });
    }
};

// ===================================================================
// 📦 EXPORT PUBLIC API
// ===================================================================

const MartooAPI = {
    // Core request method
    request: apiRequest,
    upload: uploadFile,
    
    // Cache management
    cache: {
        get: getCachedResponse,
        set: setCachedResponse,
        clear: clearCache,
        clearExpired: clearExpiredCache
    },
    
    // Utility functions
    utils: {
        isAuthenticated,
        isAdmin,
        getCurrentUser,
        getAuthToken,
        formatErrorMessage,
        generateCacheKey,
        sleep
    },
    
    // API Modules
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
    
    // Configuration
    config: API_CONFIG,
    
    // Version
    version: API_CONFIG.VERSION
};

// ===================================================================
// 🌐 EXPORT TO GLOBAL SCOPE
// ===================================================================

// Make API available globally
if (typeof window !== 'undefined') {
    window.MartooAPI = MartooAPI;
    window.MARTOO_API_VERSION = API_CONFIG.VERSION;
    
    // Log initialization in development
    if (API_CONFIG.DEBUG) {
        console.log(`🔌 Martoo API v${API_CONFIG.VERSION} initialized`, {
            baseUrl: API_CONFIG.BASE_URL,
            cache: API_CONFIG.ENABLE_CACHE ? 'enabled' : 'disabled',
            timeout: `${API_CONFIG.TIMEOUT}ms`
        });
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MartooAPI;
}

export default MartooAPI;
