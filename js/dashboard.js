/**
 * ===================================================================
 * MARTOO TECH WORKS - DASHBOARD MODULE
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel - YOUR ACTUAL BACKEND
 * Repository: mtechworks1-hub/martoo-tech-backend-Qgis
 * Features: User Dashboard, Admin Dashboard, Charts, Tables
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 IMMEDIATE SELF-EXECUTING FUNCTION - NO EXPORTS!
// ===================================================================

(function() {
    
    // ===================================================================
    // 🔧 DASHBOARD CONFIGURATION
    // ===================================================================
    
    const CONFIG = {
        // Refresh intervals
        REFRESH_INTERVAL: 30000, // 30 seconds
        NOTIFICATION_INTERVAL: 60000, // 1 minute
        
        // Chart colors - matches your theme
        CHART_COLORS: {
            primary: '#007BFF',
            secondary: '#28A745',
            warning: '#FFC107',
            danger: '#DC3545',
            info: '#17A2B8',
            gradient: {
                start: '#007BFF',
                end: '#00D4FF'
            }
        },
        
        // Status mappings - matches your backend
        STATUS: {
            'pending': { label: 'Pending', color: 'warning', icon: 'clock' },
            'submitted': { label: 'Submitted', color: 'info', icon: 'check-circle' },
            'graded': { label: 'Graded', color: 'success', icon: 'check-double' },
            'confirmed': { label: 'Confirmed', color: 'success', icon: 'check-circle' },
            'cancelled': { label: 'Cancelled', color: 'danger', icon: 'times-circle' },
            'active': { label: 'Active', color: 'success', icon: 'check-circle' },
            'inactive': { label: 'Inactive', color: 'secondary', icon: 'minus-circle' }
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
        if (amount === null || amount === undefined) return 'K0';
        return `K${Number(amount).toFixed(0).replace(/\d(?=(\d{3})+$)/g, '$&,')}`;
    };

    /**
     * Format date
     */
    const formatDate = (date, format = 'short') => {
        if (!date) return '—';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '—';
        
        const options = {
            full: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
            date: { day: 'numeric', month: 'short', year: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            short: { day: '2-digit', month: '2-digit', year: 'numeric' }
        };
        
        return d.toLocaleDateString('en-ZM', options[format] || options.date);
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
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    /**
     * Show toast notification (fallback if not available)
     */
    const showToast = (message, type = 'info', title = '') => {
        if (window.MartooToast) {
            window.MartooToast[type]?.(message, title);
        } else {
            console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
            alert(message);
        }
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
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not loaded');
                return null;
            }
            
            const canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            
            // Destroy existing chart
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
                this.charts.delete(canvasId);
            }
            
            // Default options - dark theme compatible
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
            
            try {
                const chart = new Chart(canvas, {
                    type,
                    data,
                    options: { ...defaultOptions, ...options }
                });
                
                this.charts.set(canvasId, chart);
                return chart;
            } catch (error) {
                console.error('Chart creation error:', error);
                return null;
            }
        },
        
        /**
         * Create enrollment trends chart
         */
        createEnrollmentChart(canvasId, data = {}) {
            const chartData = {
                labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Enrollments',
                    data: data.values || [0, 0, 0, 0, 0, 0],
                    borderColor: CONFIG.CHART_COLORS.primary,
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: CONFIG.CHART_COLORS.primary,
                    pointBorderColor: '#FFFFFF'
                }]
            };
            
            return this.createChart(canvasId, 'line', chartData, {
                scales: { y: { beginAtZero: true } }
            });
        },
        
        /**
         * Create revenue by service chart
         */
        createRevenueChart(canvasId, data = {}) {
            const chartData = {
                labels: data.labels || ['STATA', 'GIS', 'Research', 'Academic'],
                datasets: [{
                    data: data.values || [0, 0, 0, 0],
                    backgroundColor: [
                        CONFIG.CHART_COLORS.primary,
                        CONFIG.CHART_COLORS.secondary,
                        CONFIG.CHART_COLORS.warning,
                        CONFIG.CHART_COLORS.info
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            };
            
            return this.createChart(canvasId, 'doughnut', chartData, {
                plugins: { legend: { position: 'bottom' } },
                cutout: '70%'
            });
        },
        
        /**
         * Destroy all charts
         */
        destroyAll() {
            this.charts.forEach(chart => chart.destroy());
            this.charts.clear();
        }
    };

    // ===================================================================
    // 👤 USER DASHBOARD - MATCHES YOUR BACKEND
    // ===================================================================
    
    const UserDashboard = {
        refreshInterval: null,
        
        /**
         * Initialize user dashboard
         */
        async init() {
            try {
                // Check authentication
                if (!window.Auth || !window.Auth.isAuthenticated()) {
                    window.location.href = './login.html';
                    return;
                }
                
                // Redirect if admin
                if (window.Auth.isAdmin()) {
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
                showToast('Failed to load dashboard. Please refresh the page.', 'error');
            }
        },
        
        /**
         * Load all dashboard data
         */
        async loadDashboardData() {
            try {
                await Promise.all([
                    this.loadUserStats(),
                    this.loadMyCourses(),
                    this.loadAssignments(),
                    this.loadCertificates(),
                    this.loadNotifications()
                ]);
            } catch (error) {
                console.error('Load dashboard data error:', error);
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
                
                // Get enrolled courses from API
                let enrolledCourses = 0;
                let completedCourses = 0;
                let certificates = 0;
                let pendingAssignments = 0;
                
                if (window.API?.courses?.getMyCourses) {
                    const response = await window.API.courses.getMyCourses();
                    if (response.success) {
                        enrolledCourses = response.data.length || 0;
                        completedCourses = response.data.filter(c => c.progress === 100).length || 0;
                    }
                }
                
                if (window.API?.enrollments?.getEnrollmentByEmail && user.email) {
                    const response = await window.API.enrollments.getEnrollmentByEmail(user.email);
                    if (response.success) {
                        certificates = response.data.certificates?.length || 0;
                    }
                }
                
                // Update stat cards
                this.updateElement('enrolledCoursesStat', enrolledCourses);
                this.updateElement('completedCoursesStat', completedCourses);
                this.updateElement('certificatesStat', certificates);
                this.updateElement('pendingAssignmentsStat', pendingAssignments);
                
                // Update badges
                this.updateElement('courseCountBadge', enrolledCourses);
                this.updateElement('assignmentCountBadge', pendingAssignments);
                
                // Update welcome stats
                this.updateElement('welcomeCourses', enrolledCourses);
                this.updateElement('welcomeName', user.name?.split(' ')[0] || 'Student');
                
                return { enrolledCourses, completedCourses, certificates, pendingAssignments };
            } catch (error) {
                console.error('Load user stats error:', error);
                return null;
            }
        },
        
        /**
         * Load my courses
         */
        async loadMyCourses() {
            const container = document.getElementById('myCoursesGrid');
            if (!container) return;
            
            try {
                let courses = [];
                
                if (window.API?.courses?.getMyCourses) {
                    const response = await window.API.courses.getMyCourses();
                    if (response.success) {
                        courses = response.data || [];
                    }
                }
                
                // Mock data if no courses yet
                if (courses.length === 0) {
                    courses = [
                        {
                            id: 1,
                            title: 'Introduction to STATA',
                            instructor: 'Dr. Mwamba Banda',
                            progress: 75,
                            lessons: 12,
                            completed: 9,
                            nextLesson: 'Regression Analysis',
                            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
                            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                            category: 'gis'
                        }
                    ];
                }
                
                let html = '';
                courses.slice(0, 3).forEach(course => {
                    const icon = course.category === 'gis' ? 'map' : 
                                course.category === 'stata' ? 'chart-line' : 'flask';
                    
                    html += `
                        <div class="course-card" data-course-id="${course.id}">
                            <div class="course-header">
                                <div class="course-icon">
                                    <i class="fas fa-${icon}"></i>
                                </div>
                                <div class="course-info">
                                    <h4>${course.title || 'Untitled Course'}</h4>
                                    <p>${course.instructor || 'Martoo Tech'}</p>
                                </div>
                            </div>
                            <div class="course-body">
                                <div class="progress-item">
                                    <div class="progress-header">
                                        <span class="progress-label">Course Progress</span>
                                        <span class="progress-percent">${course.progress || 0}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${course.progress || 0}%"></div>
                                    </div>
                                </div>
                                <div class="course-meta">
                                    <div class="meta-item">
                                        <i class="fas fa-video"></i>
                                        <span>${course.completed || 0}/${course.lessons || 0} Lessons</span>
                                    </div>
                                    <div class="meta-item">
                                        <i class="fas fa-clock"></i>
                                        <span>Due: ${formatDate(course.dueDate, 'date')}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="course-footer">
                                <span>Next: ${course.nextLesson || 'Continue learning'}</span>
                                <button class="course-btn" onclick="window.Dashboard.user.continueCourse(${course.id})">
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
                container.innerHTML = '<div class="text-center py-4">Failed to load courses.</div>';
            }
        },
        
        /**
         * Load assignments
         */
        async loadAssignments() {
            const container = document.getElementById('assignmentsList');
            if (!container) return;
            
            try {
                let assignments = [];
                
                if (window.API?.assignments?.getAllAssignments) {
                    const response = await window.API.assignments.getAllAssignments({ limit: 5 });
                    if (response.success) {
                        assignments = response.data || [];
                    }
                }
                
                // Mock data
                if (assignments.length === 0) {
                    assignments = [
                        {
                            id: 1,
                            title: 'STATA Data Analysis Project',
                            course: 'Introduction to STATA',
                            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                            status: 'pending'
                        },
                        {
                            id: 2,
                            title: 'QGIS Health Facility Map',
                            course: 'GIS for Public Health',
                            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                            status: 'submitted'
                        }
                    ];
                }
                
                let html = '';
                assignments.forEach(assignment => {
                    const isUrgent = new Date(assignment.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000;
                    const statusConfig = CONFIG.STATUS[assignment.status] || CONFIG.STATUS.pending;
                    
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
                                    ${assignment.status || 'Pending'}
                                </span>
                                <button class="course-btn outline" onclick="window.Dashboard.user.viewAssignment(${assignment.id})">
                                    View
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                container.innerHTML = html;
            } catch (error) {
                console.error('Load assignments error:', error);
            }
        },
        
        /**
         * Load certificates
         */
        async loadCertificates() {
            const container = document.getElementById('certificatesGrid');
            if (!container) return;
            
            try {
                let certificates = [];
                
                const user = window.Auth?.getUser();
                if (user?.email && window.API?.enrollments?.getEnrollmentByEmail) {
                    const response = await window.API.enrollments.getEnrollmentByEmail(user.email);
                    if (response.success && response.data.certificates) {
                        certificates = response.data.certificates || [];
                    }
                }
                
                // Mock data
                if (certificates.length === 0) {
                    certificates = [
                        {
                            id: 1,
                            title: 'STATA for Public Health',
                            issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                            credentialId: 'MTW-STATA-2026-001'
                        },
                        {
                            id: 2,
                            title: 'QGIS Fundamentals',
                            issuedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                            credentialId: 'MTW-GIS-2026-015'
                        }
                    ];
                }
                
                let html = '';
                certificates.slice(0, 2).forEach(cert => {
                    html += `
                        <div class="certificate-card">
                            <div class="certificate-icon">
                                <i class="fas fa-certificate"></i>
                            </div>
                            <div class="certificate-info">
                                <h4>${cert.title}</h4>
                                <p>ID: ${cert.credentialId}</p>
                                <div class="certificate-date">
                                    <i class="fas fa-calendar-check"></i>
                                    <span>Issued: ${formatDate(cert.issuedDate, 'date')}</span>
                                </div>
                            </div>
                            <button class="certificate-btn" onclick="window.Dashboard.user.viewCertificate(${cert.id})">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    `;
                });
                
                container.innerHTML = html;
            } catch (error) {
                console.error('Load certificates error:', error);
            }
        },
        
        /**
         * Load notifications
         */
        async loadNotifications() {
            try {
                const user = window.Auth?.getUser();
                if (!user?.email) return;
                
                let unreadCount = 0;
                
                if (window.API?.notifications?.getUserNotifications) {
                    const response = await window.API.notifications.getUserNotifications(user.email);
                    if (response.success) {
                        unreadCount = response.data.filter(n => !n.read).length;
                    }
                }
                
                this.updateElement('notificationBadge', unreadCount);
                this.updateElement('messageBadge', unreadCount);
            } catch (error) {
                console.error('Load notifications error:', error);
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
            const query = e.target.value.trim();
            if (query.length < 2) return;
            console.log('Searching:', query);
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
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            
            this.refreshInterval = setInterval(async () => {
                if (document.visibilityState === 'visible') {
                    await this.loadUserStats();
                    await this.loadNotifications();
                }
            }, CONFIG.REFRESH_INTERVAL);
        },
        
        /**
         * Update element content
         */
        updateElement(id, value) {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        },
        
        /**
         * Course actions
         */
        continueCourse(courseId) {
            showToast('Loading course content...', 'info');
            setTimeout(() => {
                window.location.href = `./course-view.html?id=${courseId}`;
            }, 1000);
        },
        
        viewAssignment(assignmentId) {
            showToast('Loading assignment...', 'info');
            setTimeout(() => {
                window.location.href = `./assignment-view.html?id=${assignmentId}`;
            }, 1000);
        },
        
        viewCertificate(certificateId) {
            showToast('Downloading certificate...', 'success');
        }
    };

    // ===================================================================
    // 👑 ADMIN DASHBOARD - MATCHES YOUR BACKEND
    // ===================================================================
    
    const AdminDashboard = {
        refreshInterval: null,
        
        /**
         * Initialize admin dashboard
         */
        async init() {
            try {
                // Check authentication
                if (!window.Auth || !window.Auth.isAuthenticated()) {
                    window.location.href = './login.html';
                    return;
                }
                
                // Check admin role
                if (!window.Auth.isAdmin()) {
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
                showToast('Failed to load dashboard. Please refresh the page.', 'error');
            }
        },
        
        /**
         * Load all dashboard data
         */
        async loadDashboardData() {
            try {
                await Promise.all([
                    this.loadStats(),
                    this.loadRecentUsers(),
                    this.loadRecentEnrollments(),
                    this.loadNotifications()
                ]);
            } catch (error) {
                console.error('Load dashboard data error:', error);
                throw error;
            }
        },
        
        /**
         * Load dashboard statistics - GET /admin/stats
         */
        async loadStats() {
            try {
                let stats = {
                    totalUsers: 0,
                    totalEnrollments: 0,
                    pendingPayments: 0,
                    confirmedEnrollments: 0,
                    revenue: 0
                };
                
                if (window.API?.admin?.getStats) {
                    const response = await window.API.admin.getStats();
                    if (response.success) {
                        stats = response.data.stats || stats;
                    }
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
                return null;
            }
        },
        
        /**
         * Load recent users - GET /users
         */
        async loadRecentUsers() {
            const container = document.getElementById('recentUsersTable');
            if (!container) return;
            
            try {
                let users = [];
                
                if (window.API?.users?.getAllUsers) {
                    const response = await window.API.users.getAllUsers({ limit: 5 });
                    if (response.success) {
                        users = response.data.users || [];
                    }
                }
                
                // Mock data if no users
                if (users.length === 0) {
                    users = [
                        { id: 1, name: 'John Mulenga', email: 'john.mulenga@example.com', course: 'Introduction to STATA', status: 'active', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
                        { id: 2, name: 'Mary Banda', email: 'mary.banda@example.com', course: 'GIS for Public Health', status: 'active', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }
                    ];
                }
                
                let html = '';
                users.forEach(user => {
                    html += `
                        <tr>
                            <td>
                                <div class="user-info">
                                    <div class="user-avatar">${getInitials(user.name)}</div>
                                    <div class="user-details">
                                        <span class="user-name">${user.name || 'Unknown'}</span>
                                        <span class="user-email">${user.email || ''}</span>
                                    </div>
                                </div>
                            </td>
                            <td>${user.course || '—'}</td>
                            <td>
                                <span class="status-badge status-${user.status || 'active'}">
                                    <i class="fas fa-check-circle"></i>
                                    ${user.status || 'Active'}
                                </span>
                            </td>
                            <td>${formatDate(user.createdAt, 'short')}</td>
                            <td>
                                <button class="action-btn" onclick="window.Dashboard.admin.viewUser('${user.id}')" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                container.innerHTML = html;
            } catch (error) {
                console.error('Load recent users error:', error);
            }
        },
        
        /**
         * Load recent enrollments - GET /enrollments
         */
        async loadRecentEnrollments() {
            const container = document.getElementById('recentEnrollmentsTable');
            if (!container) return;
            
            try {
                let enrollments = [];
                
                if (window.API?.enrollments?.getAllEnrollments) {
                    const response = await window.API.enrollments.getAllEnrollments({ limit: 5 });
                    if (response.success) {
                        enrollments = response.data.enrollments || [];
                    }
                }
                
                // Mock data
                if (enrollments.length === 0) {
                    enrollments = [
                        { id: 1, name: 'John Mulenga', email: 'john.mulenga@example.com', course: 'Introduction to STATA', status: 'Payment Proof Submitted', createdAt: new Date().toISOString(), proofUrl: '#' },
                        { id: 2, name: 'Mary Banda', email: 'mary.banda@example.com', course: 'GIS for Public Health', status: 'Confirmed', createdAt: new Date().toISOString(), proofUrl: '#' }
                    ];
                }
                
                let html = '';
                enrollments.forEach(enrollment => {
                    const statusKey = enrollment.status?.toLowerCase().includes('pending') ? 'pending' :
                                     enrollment.status?.toLowerCase().includes('confirm') ? 'confirmed' : 'pending';
                    const statusConfig = CONFIG.STATUS[statusKey] || CONFIG.STATUS.pending;
                    
                    html += `
                        <tr>
                            <td>
                                <div class="user-info">
                                    <div class="user-avatar">${getInitials(enrollment.name)}</div>
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
                            <td>
                                <button class="action-btn" onclick="window.Dashboard.admin.viewEnrollment('${enrollment.id}')" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${enrollment.proofUrl ? `
                                    <button class="action-btn" onclick="window.open('${enrollment.proofUrl}')" title="View Proof">
                                        <i class="fas fa-receipt"></i>
                                    </button>
                                ` : ''}
                                <button class="action-btn" onclick="window.Dashboard.admin.updateEnrollmentStatus('${enrollment.id}')" title="Update Status">
                                    <i class="fas fa-check-circle"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                container.innerHTML = html;
            } catch (error) {
                console.error('Load recent enrollments error:', error);
            }
        },
        
        /**
         * Load notifications
         */
        async loadNotifications() {
            try {
                const user = window.Auth?.getUser();
                if (!user?.email) return;
                
                let unreadCount = 0;
                
                if (window.API?.notifications?.getUserNotifications) {
                    const response = await window.API.notifications.getUserNotifications(user.email);
                    if (response.success) {
                        unreadCount = response.data.filter(n => !n.read).length;
                    }
                }
                
                this.updateElement('notificationBadge', unreadCount);
                this.updateElement('messageBadge', unreadCount);
            } catch (error) {
                console.error('Load notifications error:', error);
            }
        },
        
        /**
         * Initialize charts
         */
        initCharts() {
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
            ChartManager.createEnrollmentChart('enrollmentChart');
            ChartManager.createRevenueChart('revenueChart');
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
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            
            this.refreshInterval = setInterval(async () => {
                if (document.visibilityState === 'visible') {
                    await this.loadStats();
                    await this.loadNotifications();
                }
            }, CONFIG.REFRESH_INTERVAL);
        },
        
        /**
         * Update element content
         */
        updateElement(id, value) {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        },
        
        /**
         * Admin actions
         */
        viewUser(userId) {
            showToast(`Viewing user ${userId}`, 'info');
        },
        
        viewEnrollment(enrollmentId) {
            showToast(`Viewing enrollment ${enrollmentId}`, 'info');
        },
        
        updateEnrollmentStatus(enrollmentId) {
            showToast(`Update status for enrollment ${enrollmentId}`, 'info');
        }
    };

    // ===================================================================
    // 📦 EXPORT PUBLIC API
    // ===================================================================
    
    window.Dashboard = {
        // User dashboard
        user: UserDashboard,
        
        // Admin dashboard
        admin: AdminDashboard,
        
        // Chart manager
        charts: ChartManager,
        
        // Utilities
        utils: {
            formatCurrency,
            formatDate,
            getInitials,
            debounce
        },
        
        // Version
        version: '2.0.0'
    };

    console.log('✅ Dashboard module loaded');

})();
