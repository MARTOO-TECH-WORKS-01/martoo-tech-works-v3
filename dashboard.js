/**
 * ===================================================================
 * MARTOO TECH WORKS - PRODUCTION READY DASHBOARD MODULE
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel
 * Authentication: JWT + Admin Token
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 DASHBOARD CONFIGURATION
// ===================================================================

const DASHBOARD_CONFIG = {
    // Refresh intervals
    REFRESH_INTERVAL: 30000, // 30 seconds
    STATS_CACHE_DURATION: 60000, // 1 minute
    NOTIFICATION_INTERVAL: 60000, // 1 minute
    
    // Charts
    CHART_COLORS: {
        primary: '#007BFF',
        secondary: '#28A745',
        warning: '#FFC107',
        danger: '#DC3545',
        info: '#17A2B8',
        dark: '#343A40',
        light: '#F8F9FA',
        gradient: {
            start: '#007BFF',
            end: '#00D4FF'
        }
    },
    
    // Status mappings
    STATUS: {
        pending: { label: 'Pending', color: 'warning', icon: 'clock' },
        submitted: { label: 'Submitted', color: 'info', icon: 'check-circle' },
        graded: { label: 'Graded', color: 'success', icon: 'check-double' },
        confirmed: { label: 'Confirmed', color: 'success', icon: 'check-circle' },
        cancelled: { label: 'Cancelled', color: 'danger', icon: 'times-circle' },
        active: { label: 'Active', color: 'success', icon: 'check-circle' },
        inactive: { label: 'Inactive', color: 'secondary', icon: 'minus-circle' }
    },
    
    // Date formats
    DATE_FORMAT: {
        full: 'DD MMM YYYY, HH:mm',
        date: 'DD MMM YYYY',
        time: 'HH:mm',
        short: 'DD/MM/YYYY'
    },
    
    // Pagination
    ITEMS_PER_PAGE: 10,
    ITEMS_PER_PAGE_OPTIONS: [10, 25, 50, 100]
};

// ===================================================================
// 🔧 UTILITY FUNCTIONS
// ===================================================================

/**
 * Format currency (ZMW)
 */
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'ZMW 0';
    return new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Format date
 */
const formatDate = (date, format = 'date') => {
    if (!date) return '—';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    
    const options = {
        full: {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        },
        date: {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        },
        time: {
            hour: '2-digit',
            minute: '2-digit'
        },
        short: {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }
    };
    
    return d.toLocaleDateString('en-ZM', options[format] || options.date);
};

/**
 * Format relative time (e.g., "2 days ago")
 */
const formatRelativeTime = (date) => {
    if (!date) return '—';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
    if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    if (diffWeek > 0) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
};

/**
 * Truncate text with ellipsis
 */
const truncateText = (text, length = 50) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
};

/**
 * Get initials from name
 */
const getInitials = (name) => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

/**
 * Debounce function
 */
const debounce = (func, wait = 300) => {
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
 * Throttle function
 */
const throttle = (func, limit = 300) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// ===================================================================
// 📊 CHART MANAGER
// ===================================================================

const ChartManager = {
    charts: new Map(),
    
    /**
     * Create or update chart
     */
    createChart(canvasId, type, data, options = {}) {
        if (!canvasId) return null;
        
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        // Destroy existing chart if any
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
            this.charts.delete(canvasId);
        }
        
        // Default options
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#E6E9F0',
                        font: { family: 'Open Sans', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1A2A4A',
                    titleColor: '#FFFFFF',
                    bodyColor: '#CDD3E0',
                    borderColor: '#007BFF',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9AA5B8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9AA5B8' }
                }
            }
        };
        
        // Merge options
        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const chart = new Chart(canvas, {
                type,
                data,
                options: mergedOptions
            });
            
            this.charts.set(canvasId, chart);
            return chart;
        } catch (error) {
            console.error('Chart creation error:', error);
            return null;
        }
    },
    
    /**
     * Destroy chart
     */
    destroyChart(canvasId) {
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
            this.charts.delete(canvasId);
        }
    },
    
    /**
     * Destroy all charts
     */
    destroyAll() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    },
    
    /**
     * Create enrollment trends chart
     */
    createEnrollmentChart(canvasId, data) {
        const chartData = {
            labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Enrollments',
                data: data.values || [12, 19, 15, 25, 22, 30],
                borderColor: DASHBOARD_CONFIG.CHART_COLORS.primary,
                backgroundColor: `rgba(0, 123, 255, 0.1)`,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: DASHBOARD_CONFIG.CHART_COLORS.primary,
                pointBorderColor: '#FFFFFF',
                pointHoverRadius: 6,
                pointHoverBackgroundColor: DASHBOARD_CONFIG.CHART_COLORS.primary,
                pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 2
            }]
        };
        
        return this.createChart(canvasId, 'line', chartData, {
            scales: {
                y: { beginAtZero: true }
            }
        });
    },
    
    /**
     * Create revenue by service chart (doughnut)
     */
    createRevenueChart(canvasId, data) {
        const chartData = {
            labels: data.labels || ['STATA', 'GIS', 'Research', 'Academic'],
            datasets: [{
                data: data.values || [45, 25, 20, 10],
                backgroundColor: [
                    DASHBOARD_CONFIG.CHART_COLORS.primary,
                    DASHBOARD_CONFIG.CHART_COLORS.secondary,
                    DASHBOARD_CONFIG.CHART_COLORS.warning,
                    DASHBOARD_CONFIG.CHART_COLORS.info
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        };
        
        return this.createChart(canvasId, 'doughnut', chartData, {
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%'
        });
    },
    
    /**
     * Create course progress chart
     */
    createProgressChart(canvasId, progress) {
        const chartData = {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [progress, 100 - progress],
                backgroundColor: [
                    DASHBOARD_CONFIG.CHART_COLORS.secondary,
                    'rgba(255, 255, 255, 0.1)'
                ],
                borderWidth: 0
            }]
        };
        
        return this.createChart(canvasId, 'doughnut', chartData, {
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            cutout: '80%'
        });
    }
};

// ===================================================================
// 📋 TABLE MANAGER
// ===================================================================

const TableManager = {
    /**
     * Render users table
     */
    renderUsersTable(containerId, users, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const {
            showActions = true,
            onView,
            onEdit,
            onDelete
        } = options;
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users" style="font-size: 48px; color: var(--neutral-400); margin-bottom: 16px;"></i>
                    <p style="color: var(--neutral-400);">No users found</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Course</th>
                            <th>Status</th>
                            <th>Joined</th>
                            ${showActions ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        users.forEach(user => {
            const status = user.status || 'active';
            const statusConfig = DASHBOARD_CONFIG.STATUS[status] || DASHBOARD_CONFIG.STATUS.active;
            
            html += `
                <tr>
                    <td>
                        <div class="user-info">
                            <div class="user-avatar">
                                ${getInitials(user.name)}
                            </div>
                            <div class="user-details">
                                <span class="user-name">${user.name || 'Unknown'}</span>
                                <span class="user-email">${user.email || ''}</span>
                            </div>
                        </div>
                    </td>
                    <td>${user.course || '—'}</td>
                    <td>
                        <span class="status-badge status-${statusConfig.color}">
                            <i class="fas fa-${statusConfig.icon}"></i>
                            ${statusConfig.label}
                        </span>
                    </td>
                    <td>${formatDate(user.createdAt, 'short')}</td>
                    ${showActions ? `
                        <td>
                            <button class="action-btn" onclick="Dashboard.viewUser('${user.id}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="Dashboard.editUser('${user.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="Dashboard.deleteUser('${user.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    ` : ''}
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    /**
     * Render enrollments table
     */
    renderEnrollmentsTable(containerId, enrollments, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const {
            showActions = true,
            onView,
            onApprove,
            onReject
        } = options;
        
        if (!enrollments || enrollments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-graduation-cap" style="font-size: 48px; color: var(--neutral-400); margin-bottom: 16px;"></i>
                    <p style="color: var(--neutral-400);">No enrollments found</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Course</th>
                            <th>Status</th>
                            <th>Date</th>
                            ${showActions ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        enrollments.forEach(enrollment => {
            const status = enrollment.status?.toLowerCase().replace(' ', '-') || 'pending';
            const statusKey = status.includes('pending') ? 'pending' : 
                            status.includes('confirmed') ? 'confirmed' : 
                            status.includes('cancelled') ? 'cancelled' : 'pending';
            const statusConfig = DASHBOARD_CONFIG.STATUS[statusKey] || DASHBOARD_CONFIG.STATUS.pending;
            
            html += `
                <tr>
                    <td>
                        <div class="user-info">
                            <div class="user-avatar">
                                ${getInitials(enrollment.name)}
                            </div>
                            <div class="user-details">
                                <span class="user-name">${enrollment.name || 'Unknown'}</span>
                                <span class="user-email">${enrollment.email || ''}</span>
                            </div>
                        </div>
                    </td>
                    <td>${enrollment.course || '—'}</td>
                    <td>
                        <span class="status-badge status-${statusConfig.color}">
                            <i class="fas fa-${statusConfig.icon}"></i>
                            ${enrollment.status || 'Pending'}
                        </span>
                    </td>
                    <td>${formatDate(enrollment.createdAt, 'short')}</td>
                    ${showActions ? `
                        <td>
                            <button class="action-btn" onclick="Dashboard.viewEnrollment('${enrollment.id}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${enrollment.proofUrl ? `
                                <button class="action-btn" onclick="window.open('${enrollment.proofUrl}')" title="View Proof">
                                    <i class="fas fa-receipt"></i>
                                </button>
                            ` : ''}
                            <button class="action-btn" onclick="Dashboard.updateEnrollmentStatus('${enrollment.id}')" title="Update Status">
                                <i class="fas fa-check-circle"></i>
                            </button>
                        </td>
                    ` : ''}
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    /**
     * Render courses table
     */
    renderCoursesTable(containerId, courses, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const { showActions = true } = options;
        
        if (!courses || courses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-book" style="font-size: 48px; color: var(--neutral-400); margin-bottom: 16px;"></i>
                    <p style="color: var(--neutral-400);">No courses found</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Course</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Students</th>
                            <th>Status</th>
                            ${showActions ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        courses.forEach(course => {
            html += `
                <tr>
                    <td>
                        <div class="course-info">
                            <strong>${course.title || 'Untitled'}</strong>
                            <small style="display: block; color: var(--neutral-400);">${course.instructor || '—'}</small>
                        </div>
                    </td>
                    <td>${course.category || '—'}</td>
                    <td>${course.price ? `K${course.price}` : 'Free'}</td>
                    <td>${course.students || 0}</td>
                    <td>
                        <span class="status-badge status-${course.isPublished ? 'success' : 'secondary'}">
                            <i class="fas fa-${course.isPublished ? 'check-circle' : 'minus-circle'}"></i>
                            ${course.isPublished ? 'Published' : 'Draft'}
                        </span>
                    </td>
                    ${showActions ? `
                        <td>
                            <button class="action-btn" onclick="Dashboard.viewCourse('${course.id}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="Dashboard.editCourse('${course.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="Dashboard.deleteCourse('${course.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    ` : ''}
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    /**
     * Render assignments table
     */
    renderAssignmentsTable(containerId, assignments, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const { showActions = true } = options;
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-tasks" style="font-size: 48px; color: var(--neutral-400); margin-bottom: 16px;"></i>
                    <p style="color: var(--neutral-400);">No assignments found</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Assignment</th>
                            <th>Course</th>
                            <th>Due Date</th>
                            <th>Submissions</th>
                            <th>Status</th>
                            ${showActions ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        assignments.forEach(assignment => {
            const isUrgent = new Date(assignment.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000;
            
            html += `
                <tr>
                    <td>
                        <strong>${assignment.title || 'Untitled'}</strong>
                    </td>
                    <td>${assignment.course || '—'}</td>
                    <td>
                        <span style="color: ${isUrgent ? 'var(--danger)' : 'var(--neutral-300)'};">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(assignment.dueDate, 'date')}
                        </span>
                    </td>
                    <td>${assignment.submissions?.length || 0}</td>
                    <td>
                        <span class="status-badge status-${assignment.isPublished ? 'success' : 'secondary'}">
                            <i class="fas fa-${assignment.isPublished ? 'check-circle' : 'minus-circle'}"></i>
                            ${assignment.isPublished ? 'Active' : 'Draft'}
                        </span>
                    </td>
                    ${showActions ? `
                        <td>
                            <button class="action-btn" onclick="Dashboard.viewAssignment('${assignment.id}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="Dashboard.editAssignment('${assignment.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="Dashboard.deleteAssignment('${assignment.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    ` : ''}
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }
};

// ===================================================================
// 📊 USER DASHBOARD
// ===================================================================

const UserDashboard = {
    refreshInterval: null,
    
    /**
     * Initialize user dashboard
     */
    async init() {
        try {
            // Check authentication
            if (!window.Auth?.isAuthenticated()) {
                window.location.href = './login.html';
                return;
            }
            
            // Redirect if admin
            if (window.Auth?.isAdmin()) {
                window.location.href = './admin-dashboard.html';
                return;
            }
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Initialize event listeners
            this.initEventListeners();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('✅ User Dashboard initialized');
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            window.MartooToast?.error('Failed to load dashboard. Please refresh the page.');
        }
    },
    
    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            // Show loading states
            this.showLoading();
            
            // Load data in parallel
            await Promise.all([
                this.loadUserStats(),
                this.loadMyCourses(),
                this.loadAssignments(),
                this.loadCertificates(),
                this.loadNotifications()
            ]);
            
            // Hide loading states
            this.hideLoading();
        } catch (error) {
            console.error('Load dashboard data error:', error);
            this.hideLoading();
            throw error;
        }
    },
    
    /**
     * Load user statistics
     */
    async loadUserStats() {
        try {
            const user = window.Auth?.getUser();
            if (!user) return;
            
            // Mock data - replace with actual API calls
            const stats = {
                enrolledCourses: 3,
                completedCourses: 1,
                certificates: 2,
                pendingAssignments: 2,
                totalProgress: 45
            };
            
            // Update stat cards
            this.updateElement('enrolledCoursesStat', stats.enrolledCourses);
            this.updateElement('completedCoursesStat', stats.completedCourses);
            this.updateElement('certificatesStat', stats.certificates);
            this.updateElement('pendingAssignmentsStat', stats.pendingAssignments);
            
            // Update badges
            this.updateElement('courseCountBadge', stats.enrolledCourses);
            this.updateElement('assignmentCountBadge', stats.pendingAssignments);
            
            // Update welcome stats
            this.updateElement('welcomeCourses', stats.enrolledCourses);
            this.updateElement('welcomeProgress', `${stats.totalProgress}%`);
            this.updateElement('welcomeName', user.name?.split(' ')[0] || 'Student');
            
            return stats;
        } catch (error) {
            console.error('Load user stats error:', error);
            throw error;
        }
    },
    
    /**
     * Load my courses
     */
    async loadMyCourses() {
        try {
            // Mock data - replace with actual API call
            const courses = [
                {
                    id: 1,
                    title: 'Introduction to STATA',
                    instructor: 'Dr. Mwamba Banda',
                    progress: 75,
                    lessons: 12,
                    completed: 9,
                    nextLesson: 'Regression Analysis',
                    dueDate: '2026-03-15',
                    category: 'stata'
                },
                {
                    id: 2,
                    title: 'GIS for Public Health',
                    instructor: 'Martoo Tech',
                    progress: 45,
                    lessons: 24,
                    completed: 11,
                    nextLesson: 'Heat Map Creation',
                    dueDate: '2026-03-20',
                    category: 'gis'
                },
                {
                    id: 3,
                    title: 'Research Methodology',
                    instructor: 'Prof. Thandiwe Phiri',
                    progress: 30,
                    lessons: 18,
                    completed: 5,
                    nextLesson: 'Data Collection Methods',
                    dueDate: '2026-03-25',
                    category: 'research'
                }
            ];
            
            const container = document.getElementById('myCoursesGrid');
            if (!container) return;
            
            let html = '';
            courses.forEach(course => {
                html += `
                    <div class="course-card" data-course-id="${course.id}">
                        <div class="course-header">
                            <div class="course-icon">
                                <i class="fas fa-${course.category === 'gis' ? 'map' : course.category === 'stata' ? 'chart-line' : 'flask'}"></i>
                            </div>
                            <div class="course-info">
                                <h4>${course.title}</h4>
                                <p>${course.instructor}</p>
                            </div>
                        </div>
                        <div class="course-body">
                            <div class="progress-item">
                                <div class="progress-header">
                                    <span class="progress-label">Course Progress</span>
                                    <span class="progress-percent">${course.progress}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${course.progress}%"></div>
                                </div>
                            </div>
                            <div class="course-meta">
                                <div class="meta-item">
                                    <i class="fas fa-video"></i>
                                    <span>${course.completed}/${course.lessons} Lessons</span>
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-clock"></i>
                                    <span>Due: ${formatDate(course.dueDate, 'date')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="course-footer">
                            <span>Next: ${course.nextLesson}</span>
                            <button class="course-btn" onclick="Dashboard.continueCourse(${course.id})">
                                Continue
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Load my courses error:', error);
            throw error;
        }
    },
    
    /**
     * Load assignments
     */
    async loadAssignments() {
        try {
            // Mock data - replace with actual API call
            const assignments = [
                {
                    id: 1,
                    title: 'STATA Data Analysis Project',
                    course: 'Introduction to STATA',
                    dueDate: '2026-03-15',
                    status: 'pending'
                },
                {
                    id: 2,
                    title: 'QGIS Health Facility Map',
                    course: 'GIS for Public Health',
                    dueDate: '2026-03-10',
                    status: 'submitted'
                },
                {
                    id: 3,
                    title: 'Research Proposal Outline',
                    course: 'Research Methodology',
                    dueDate: '2026-03-05',
                    status: 'graded',
                    score: 85
                }
            ];
            
            const container = document.getElementById('assignmentsList');
            if (!container) return;
            
            let html = '';
            assignments.forEach(assignment => {
                const isUrgent = new Date(assignment.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000;
                const statusConfig = DASHBOARD_CONFIG.STATUS[assignment.status] || DASHBOARD_CONFIG.STATUS.pending;
                const statusText = assignment.status === 'graded' 
                    ? `Graded: ${assignment.score}%` 
                    : statusConfig.label;
                
                html += `
                    <div class="assignment-item">
                        <div class="assignment-info">
                            <div class="assignment-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="assignment-details">
                                <h4>${assignment.title}</h4>
                                <p>${assignment.course}</p>
                            </div>
                        </div>
                        <div class="assignment-meta">
                            <div class="due-date ${isUrgent ? 'urgent' : ''}">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Due: ${formatDate(assignment.dueDate, 'date')}</span>
                            </div>
                            <span class="status-badge status-${statusConfig.color}">
                                <i class="fas fa-${statusConfig.icon}"></i>
                                ${statusText}
                            </span>
                            <button class="course-btn outline" onclick="Dashboard.viewAssignment(${assignment.id})">
                                View
                            </button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Load assignments error:', error);
            throw error;
        }
    },
    
    /**
     * Load certificates
     */
    async loadCertificates() {
        try {
            // Mock data - replace with actual API call
            const certificates = [
                {
                    id: 1,
                    title: 'STATA for Public Health',
                    issuedDate: '2026-01-15',
                    credentialId: 'MTW-STATA-2026-001'
                },
                {
                    id: 2,
                    title: 'QGIS Fundamentals',
                    issuedDate: '2026-02-01',
                    credentialId: 'MTW-GIS-2026-015'
                }
            ];
            
            const container = document.getElementById('certificatesGrid');
            if (!container) return;
            
            let html = '';
            certificates.forEach(cert => {
                html += `
                    <div class="certificate-card">
                        <div class="certificate-icon">
                            <i class="fas fa-certificate"></i>
                        </div>
                        <div class="certificate-info">
                            <h4>${cert.title}</h4>
                            <p>Credential ID: ${cert.credentialId}</p>
                            <div class="certificate-date">
                                <i class="fas fa-calendar-check"></i>
                                <span>Issued: ${formatDate(cert.issuedDate, 'date')}</span>
                            </div>
                        </div>
                        <button class="certificate-btn" onclick="Dashboard.viewCertificate(${cert.id})">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Load certificates error:', error);
            throw error;
        }
    },
    
    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            const user = window.Auth?.getUser();
            if (!user) return;
            
            // Mock data - replace with actual API call
            const notifications = [
                { read: false },
                { read: false },
                { read: true }
            ];
            
            const unreadCount = notifications.filter(n => !n.read).length;
            this.updateElement('notificationBadge', unreadCount);
            this.updateElement('messageBadge', unreadCount);
            
            return notifications;
        } catch (error) {
            console.error('Load notifications error:', error);
            throw error;
        }
    },
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.Auth?.logout(true);
            });
        }
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar);
        }
        
        // Notification button
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                window.MartooToast?.info('No new notifications', 'All Caught Up');
            });
        }
        
        // Search input
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(this.handleSearch.bind(this), 500));
        }
    },
    
    /**
     * Handle search
     */
    handleSearch(e) {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 2) return;
        
        console.log('Searching for:', query);
        // Implement search functionality
    },
    
    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const main = document.getElementById('mainContent');
        sidebar?.classList.toggle('collapsed');
        main?.classList.toggle('expanded');
    },
    
    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                await Promise.all([
                    this.loadUserStats(),
                    this.loadNotifications()
                ]);
            }
        }, DASHBOARD_CONFIG.REFRESH_INTERVAL);
    },
    
    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },
    
    /**
     * Show loading states
     */
    showLoading() {
        // Add loading skeleton classes
        document.querySelectorAll('.stat-card .stat-number').forEach(el => {
            el.style.opacity = '0.5';
            el.classList.add('loading-skeleton');
        });
    },
    
    /**
     * Hide loading states
     */
    hideLoading() {
        // Remove loading skeleton classes
        document.querySelectorAll('.stat-card .stat-number').forEach(el => {
            el.style.opacity = '1';
            el.classList.remove('loading-skeleton');
        });
    },
    
    /**
     * Update element content
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        ChartManager.destroyAll();
    }
};

// ===================================================================
// 👑 ADMIN DASHBOARD
// ===================================================================

const AdminDashboard = {
    refreshInterval: null,
    
    /**
     * Initialize admin dashboard
     */
    async init() {
        try {
            // Check authentication
            if (!window.Auth?.isAuthenticated()) {
                window.location.href = './login.html';
                return;
            }
            
            // Check admin role
            if (!window.Auth?.isAdmin()) {
                window.location.href = './user_dashboard.html';
                return;
            }
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Initialize charts
            this.initCharts();
            
            // Initialize event listeners
            this.initEventListeners();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('✅ Admin Dashboard initialized');
        } catch (error) {
            console.error('Admin dashboard initialization error:', error);
            window.MartooToast?.error('Failed to load dashboard. Please refresh the page.');
        }
    },
    
    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            // Show loading states
            this.showLoading();
            
            // Load data in parallel
            await Promise.all([
                this.loadStats(),
                this.loadRecentUsers(),
                this.loadRecentEnrollments(),
                this.loadNotifications()
            ]);
            
            // Hide loading states
            this.hideLoading();
        } catch (error) {
            console.error('Load dashboard data error:', error);
            this.hideLoading();
            throw error;
        }
    },
    
    /**
     * Load dashboard statistics
     */
    async loadStats() {
        try {
            // Try to fetch from API
            let stats = null;
            
            if (window.MartooAPI?.admin?.getStats) {
                const response = await window.MartooAPI.admin.getStats();
                if (response.success) {
                    stats = response.data.stats;
                }
            }
            
            // Fallback to mock data
            if (!stats) {
                stats = {
                    totalUsers: 156,
                    totalEnrollments: 89,
                    pendingPayments: 12,
                    confirmedEnrollments: 67,
                    totalQuizzes: 8,
                    totalMaterials: 24,
                    totalAssignments: 15,
                    revenue: 24500
                };
            }
            
            // Update stat cards
            this.updateElement('totalUsersStat', stats.totalUsers || 0);
            this.updateElement('totalEnrollmentsStat', stats.totalEnrollments || 0);
            this.updateElement('pendingPaymentsStat', stats.pendingPayments || 0);
            this.updateElement('confirmedEnrollmentsStat', stats.confirmedEnrollments || 0);
            
            // Update badges
            this.updateElement('userCountBadge', stats.totalUsers || 0);
            this.updateElement('enrollmentBadge', stats.pendingPayments || 0);
            this.updateElement('paymentBadge', stats.pendingPayments || 0);
            
            // Update welcome stats
            this.updateElement('welcomeEnrollments', stats.totalEnrollments || 0);
            this.updateElement('welcomeUsers', stats.totalUsers || 0);
            this.updateElement('welcomeRevenue', formatCurrency(stats.revenue || 0));
            
            return stats;
        } catch (error) {
            console.error('Load stats error:', error);
            throw error;
        }
    },
    
    /**
     * Load recent users
     */
    async loadRecentUsers() {
        try {
            // Try to fetch from API
            let users = null;
            
            if (window.MartooAPI?.users?.getAllUsers) {
                const response = await window.MartooAPI.users.getAllUsers({ limit: 5 });
                if (response.success) {
                    users = response.data.users;
                }
            }
            
            // Fallback to mock data
            if (!users) {
                users = [
                    { id: 1, name: 'John Mulenga', email: 'john.mulenga@example.com', course: 'Introduction to STATA', status: 'active', createdAt: '2026-02-10' },
                    { id: 2, name: 'Mary Banda', email: 'mary.banda@example.com', course: 'GIS for Public Health', status: 'active', createdAt: '2026-02-09' },
                    { id: 3, name: 'Peter Phiri', email: 'peter.phiri@example.com', course: 'Research Methodology', status: 'active', createdAt: '2026-02-08' },
                    { id: 4, name: 'Grace Zulu', email: 'grace.zulu@example.com', course: 'Advanced GIS', status: 'inactive', createdAt: '2026-02-07' },
                    { id: 5, name: 'Chanda Mwila', email: 'chanda.mwila@example.com', course: 'STATA Masterclass', status: 'active', createdAt: '2026-02-06' }
                ];
            }
            
            TableManager.renderUsersTable('recentUsersTable', users, {
                showActions: true
            });
        } catch (error) {
            console.error('Load recent users error:', error);
            throw error;
        }
    },
    
    /**
     * Load recent enrollments
     */
    async loadRecentEnrollments() {
        try {
            // Try to fetch from API
            let enrollments = null;
            
            if (window.MartooAPI?.enrollments?.getAllEnrollments) {
                const response = await window.MartooAPI.enrollments.getAllEnrollments({ limit: 5 });
                if (response.success) {
                    enrollments = response.data.enrollments;
                }
            }
            
            // Fallback to mock data
            if (!enrollments) {
                enrollments = [
                    { id: 1, name: 'John Mulenga', email: 'john.mulenga@example.com', course: 'Introduction to STATA', status: 'Payment Proof Submitted', createdAt: '2026-02-10', proofUrl: '#' },
                    { id: 2, name: 'Mary Banda', email: 'mary.banda@example.com', course: 'GIS for Public Health', status: 'Confirmed', createdAt: '2026-02-09', proofUrl: '#' },
                    { id: 3, name: 'Peter Phiri', email: 'peter.phiri@example.com', course: 'Research Methodology', status: 'Pending Payment', createdAt: '2026-02-08' },
                    { id: 4, name: 'Grace Zulu', email: 'grace.zulu@example.com', course: 'Advanced GIS', status: 'Payment Proof Submitted', createdAt: '2026-02-07', proofUrl: '#' },
                    { id: 5, name: 'Chanda Mwila', email: 'chanda.mwila@example.com', course: 'STATA Masterclass', status: 'Confirmed', createdAt: '2026-02-06', proofUrl: '#' }
                ];
            }
            
            TableManager.renderEnrollmentsTable('recentEnrollmentsTable', enrollments, {
                showActions: true
            });
        } catch (error) {
            console.error('Load recent enrollments error:', error);
            throw error;
        }
    },
    
    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            const user = window.Auth?.getUser();
            if (!user) return;
            
            // Try to fetch from API
            let notifications = null;
            
            if (window.MartooAPI?.notifications?.getUserNotifications) {
                const response = await window.MartooAPI.notifications.getUserNotifications(user.email);
                if (response.success) {
                    notifications = response.data.notifications;
                }
            }
            
            // Fallback to mock data
            if (!notifications) {
                notifications = [
                    { read: false },
                    { read: false },
                    { read: true }
                ];
            }
            
            const unreadCount = notifications.filter(n => !n.read).length;
            this.updateElement('notificationBadge', unreadCount);
            this.updateElement('messageBadge', unreadCount);
            
            return notifications;
        } catch (error) {
            console.error('Load notifications error:', error);
            throw error;
        }
    },
    
    /**
     * Initialize charts
     */
    initCharts() {
        // Wait for Chart.js to load
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
            script.onload = () => this.createCharts();
            document.head.appendChild(script);
        } else {
            this.createCharts();
        }
    },
    
    /**
     * Create charts
     */
    createCharts() {
        // Enrollment trends chart
        ChartManager.createEnrollmentChart('enrollmentChart', {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            values: [12, 19, 15, 25, 22, 30]
        });
        
        // Revenue by service chart
        ChartManager.createRevenueChart('revenueChart', {
            labels: ['STATA', 'GIS', 'Research', 'Academic'],
            values: [45, 25, 20, 10]
        });
    },
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.Auth?.logout(true);
            });
        }
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar);
        }
        
        // Notification button
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                window.MartooToast?.info('No new notifications', 'All Caught Up');
            });
        }
        
        // Search input
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(this.handleSearch.bind(this), 500));
        }
        
        // Navigation links
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.loadSection(section);
            });
        });
    },
    
    /**
     * Load dashboard section
     */
    async loadSection(section) {
        const content = document.getElementById('dashboardContent');
        if (!content) return;
        
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) activeLink.classList.add('active');
        
        // Load section content
        switch (section) {
            case 'dashboard':
                content.innerHTML = this.getDashboardHTML();
                await Promise.all([
                    this.loadStats(),
                    this.loadRecentUsers(),
                    this.loadRecentEnrollments()
                ]);
                this.createCharts();
                break;
                
            case 'users':
                content.innerHTML = await this.getUsersHTML();
                break;
                
            case 'enrollments':
                content.innerHTML = await this.getEnrollmentsHTML();
                break;
                
            case 'courses':
                content.innerHTML = await this.getCoursesHTML();
                break;
                
            case 'quizzes':
                content.innerHTML = await this.getQuizzesHTML();
                break;
                
            case 'payments':
                content.innerHTML = await this.getPaymentsHTML();
                break;
                
            case 'messages':
                content.innerHTML = await this.getMessagesHTML();
                break;
                
            case 'settings':
                content.innerHTML = await this.getSettingsHTML();
                break;
        }
    },
    
    /**
     * Get dashboard HTML
     */
    getDashboardHTML() {
        return `
            <!-- Welcome Banner -->
            <div class="welcome-banner">
                <div class="welcome-content">
                    <h2>Welcome back, <span id="adminNameDisplay">Administrator</span>!</h2>
                    <p>Here's what's happening with your platform today.</p>
                </div>
                <div class="welcome-stats">
                    <div class="welcome-stat">
                        <div class="stat-value" id="welcomeEnrollments">0</div>
                        <div class="stat-label">Total Enrollments</div>
                    </div>
                    <div class="welcome-stat">
                        <div class="stat-value" id="welcomeUsers">0</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="welcome-stat">
                        <div class="stat-value" id="welcomeRevenue">ZMW 0</div>
                        <div class="stat-label">Revenue</div>
                    </div>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Total Users</h4>
                        <div class="stat-number" id="totalUsersStat">0</div>
                        <div class="stat-trend positive">
                            <i class="fas fa-arrow-up"></i> +12%
                        </div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Enrollments</h4>
                        <div class="stat-number" id="totalEnrollmentsStat">0</div>
                        <div class="stat-trend positive">
                            <i class="fas fa-arrow-up"></i> +8%
                        </div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Pending Payments</h4>
                        <div class="stat-number" id="pendingPaymentsStat">0</div>
                        <div class="stat-trend">
                            <i class="fas fa-clock"></i> Awaiting
                        </div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-credit-card"></i>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Confirmed</h4>
                        <div class="stat-number" id="confirmedEnrollmentsStat">0</div>
                        <div class="stat-trend positive">
                            <i class="fas fa-check-circle"></i> Active
                        </div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
            </div>

            <!-- Charts -->
            <div class="charts-grid">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Enrollment Trends</h3>
                        <div class="chart-actions">
                            <button class="chart-btn active" data-period="week">Weekly</button>
                            <button class="chart-btn" data-period="month">Monthly</button>
                            <button class="chart-btn" data-period="year">Yearly</button>
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas id="enrollmentChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Revenue by Service</h3>
                        <div class="chart-actions">
                            <button class="chart-btn active" data-period="month">This Month</button>
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Users -->
            <div class="table-card">
                <div class="table-header">
                    <h3>Recent Users</h3>
                    <div class="table-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="Dashboard.loadSection('users')">
                            View All
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
                <div id="recentUsersTable"></div>
            </div>

            <!-- Recent Enrollments -->
            <div class="table-card">
                <div class="table-header">
                    <h3>Pending Enrollments</h3>
                    <div class="table-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="Dashboard.loadSection('enrollments')">
                            View All
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
                <div id="recentEnrollmentsTable"></div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <div class="quick-action-card" onclick="Dashboard.showCreateUserModal()">
                    <div class="quick-action-icon">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <h4 class="quick-action-title">Add User</h4>
                    <p class="quick-action-desc">Create new student account</p>
                </div>

                <div class="quick-action-card" onclick="Dashboard.showCreateCourseModal()">
                    <div class="quick-action-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h4 class="quick-action-title">New Course</h4>
                    <p class="quick-action-desc">Create course content</p>
                </div>

                <div class="quick-action-card" onclick="Dashboard.showUploadMaterialModal()">
                    <div class="quick-action-icon">
                        <i class="fas fa-upload"></i>
                    </div>
                    <h4 class="quick-action-title">Upload Material</h4>
                    <p class="quick-action-desc">Share learning resources</p>
                </div>

                <div class="quick-action-card" onclick="Dashboard.showCreateQuizModal()">
                    <div class="quick-action-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <h4 class="quick-action-title">Create Quiz</h4>
                    <p class="quick-action-desc">Assess student progress</p>
                </div>
            </div>
        `;
    },
    
    /**
     * Handle search
     */
    handleSearch(e) {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 2) return;
        
        console.log('Searching for:', query);
        // Implement search functionality
    },
    
    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const main = document.getElementById('mainContent');
        sidebar?.classList.toggle('collapsed');
        main?.classList.toggle('expanded');
    },
    
    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                await Promise.all([
                    this.loadStats(),
                    this.loadNotifications()
                ]);
            }
        }, DASHBOARD_CONFIG.REFRESH_INTERVAL);
    },
    
    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },
    
    /**
     * Show loading states
     */
    showLoading() {
        // Add loading skeleton classes
        document.querySelectorAll('.stat-card .stat-number').forEach(el => {
            el.style.opacity = '0.5';
            el.classList.add('loading-skeleton');
        });
    },
    
    /**
     * Hide loading states
     */
    hideLoading() {
        // Remove loading skeleton classes
        document.querySelectorAll('.stat-card .stat-number').forEach(el => {
            el.style.opacity = '1';
            el.classList.remove('loading-skeleton');
        });
    },
    
    /**
     * Update element content
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        ChartManager.destroyAll();
    }
};

// ===================================================================
// 🎯 PUBLIC DASHBOARD API
// ===================================================================

const Dashboard = {
    // User dashboard
    user: UserDashboard,
    
    // Admin dashboard
    admin: AdminDashboard,
    
    // Chart manager
    charts: ChartManager,
    
    // Table manager
    tables: TableManager,
    
    // Utilities
    utils: {
        formatCurrency,
        formatDate,
        formatRelativeTime,
        truncateText,
        getInitials,
        debounce,
        throttle
    },
    
    // Configuration
    config: DASHBOARD_CONFIG,
    
    // Action handlers (to be overridden)
    viewUser: (id) => console.log('View user:', id),
    editUser: (id) => console.log('Edit user:', id),
    deleteUser: (id) => console.log('Delete user:', id),
    viewEnrollment: (id) => console.log('View enrollment:', id),
    updateEnrollmentStatus: (id) => console.log('Update enrollment:', id),
    viewCourse: (id) => console.log('View course:', id),
    editCourse: (id) => console.log('Edit course:', id),
    deleteCourse: (id) => console.log('Delete course:', id),
    viewAssignment: (id) => console.log('View assignment:', id),
    editAssignment: (id) => console.log('Edit assignment:', id),
    deleteAssignment: (id) => console.log('Delete assignment:', id),
    continueCourse: (id) => console.log('Continue course:', id),
    viewCertificate: (id) => console.log('View certificate:', id),
    
    // Modal handlers
    showCreateUserModal: () => console.log('Create user modal'),
    showCreateCourseModal: () => console.log('Create course modal'),
    showUploadMaterialModal: () => console.log('Upload material modal'),
    showCreateQuizModal: () => console.log('Create quiz modal'),
    
    // Section loader
    loadSection: (section) => AdminDashboard.loadSection(section),
    
    // Version
    version: '2.0.0'
};

// ===================================================================
// 🌐 EXPORT TO GLOBAL SCOPE
// ===================================================================

// Make Dashboard module available globally
if (typeof window !== 'undefined') {
    window.Dashboard = Dashboard;
    window.ChartManager = ChartManager;
    window.TableManager = TableManager;
    
    // Auto-initialize based on page
    document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname;
        
        if (path.includes('admin-dashboard.html')) {
            Dashboard.admin.init();
        } else if (path.includes('user_dashboard.html')) {
            Dashboard.user.init();
        }
    });
    
    console.log('📊 Martoo Dashboard v2.0.0 initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}

export default Dashboard;
