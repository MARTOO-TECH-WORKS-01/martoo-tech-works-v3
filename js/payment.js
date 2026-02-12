/**
 * ===================================================================
 * MARTOO TECH WORKS - PRODUCTION READY PAYMENT MODULE
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel
 * Payment Methods: Mobile Money (Airtel, MTN), Bank Transfer
 * Features: Payment proof upload, transaction tracking, enrollment flow
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 PAYMENT CONFIGURATION
// ===================================================================

const PAYMENT_CONFIG = {
    // Currency
    currency: 'ZMW',
    currencySymbol: 'K',
    
    // Payment methods
    methods: {
        airtel: {
            id: 'airtel',
            name: 'Airtel Money',
            icon: 'fas fa-mobile-alt',
            color: '#E60000',
            number: '0973495316',
            instructions: 'Dial *444# or use Airtel Money app. Send to 0973495316.'
        },
        mtn: {
            id: 'mtn',
            name: 'MTN Mobile Money',
            icon: 'fas fa-mobile-alt',
            color: '#FFCC00',
            number: '0774766077',
            instructions: 'Dial *165# or use MoMo app. Send to 0774766077.'
        },
        bank: {
            id: 'bank',
            name: 'Bank Transfer',
            icon: 'fas fa-university',
            color: '#007BFF',
            account: {
                bank: 'Zambia National Commercial Bank (Zanaco)',
                accountName: 'Martoo Tech Works',
                accountNumber: '1234567890',
                branch: 'Lusaka Main',
                swift: 'ZNCOZMLU'
            },
            instructions: 'Transfer to the account details below. Use your name as reference.'
        },
        cash: {
            id: 'cash',
            name: 'Cash Payment',
            icon: 'fas fa-money-bill-wave',
            color: '#28A745',
            instructions: 'Cash payments accepted at our Lusaka office by appointment only.'
        }
    },
    
    // Service pricing (base prices)
    pricing: {
        services: {
            'gis-basic': { name: 'GIS / QGIS Mapping - Basic', price: 200 },
            'gis-advanced': { name: 'GIS / QGIS Mapping - Advanced', price: 300 },
            'stata-basic': { name: 'STATA Analysis - Basic', price: 250 },
            'stata-advanced': { name: 'STATA Analysis - Advanced', price: 500 },
            'research-proposal': { name: 'Research Proposal Writing', price: 400 },
            'research-tools': { name: 'Research Tool Development', price: 600 },
            'academic-assignment': { name: 'Academic Assignment Support', price: 150 },
            'academic-formatting': { name: 'Thesis Formatting', price: 300 },
            'consulting-hourly': { name: 'Consulting Services (per hour)', price: 200 }
        },
        courses: {
            'stata-beginner': { name: 'Introduction to STATA', price: 0 }, // Free
            'stata-advanced': { name: 'Advanced STATA Analysis', price: 450 },
            'gis-beginner': { name: 'QGIS Fundamentals', price: 0 }, // Free
            'gis-advanced': { name: 'Advanced GIS Mapping', price: 350 },
            'research-methods': { name: 'Research Methodology', price: 300 },
            'proposal-writing': { name: 'Proposal Writing Masterclass', price: 400 },
            'academic-writing': { name: 'Academic Writing Essentials', price: 0 }, // Free
            'data-viz': { name: 'Data Visualization for Research', price: 250 }
        },
        subscriptions: {
            'monthly': { name: 'Monthly All Access Pass', price: 149 },
            'annual': { name: 'Annual All Access Pass', price: 1299 }
        }
    },
    
    // File upload
    upload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf'
        ],
        maxFiles: 1
    },
    
    // Transaction status
    status: {
        pending: 'Pending Payment',
        proof_submitted: 'Payment Proof Submitted',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        refunded: 'Refunded'
    },
    
    // Processing times
    processing: {
        proof_review: '24-48 hours',
        confirmation: 'Immediate upon verification',
        refund: '5-10 business days'
    },
    
    // Debug mode
    debug: false
};

// ===================================================================
// 🔧 UTILITY FUNCTIONS
// ===================================================================

/**
 * Format currency
 */
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return `${PAYMENT_CONFIG.currencySymbol}0`;
    return `${PAYMENT_CONFIG.currencySymbol}${Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

/**
 * Format phone number for display
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0,3)} ${cleaned.slice(3,6)} ${cleaned.slice(6)}`;
    }
    return phone;
};

/**
 * Generate transaction reference
 */
const generateTransactionRef = () => {
    const prefix = 'MTW';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * Validate mobile money number
 */
const validateMobileMoneyNumber = (number, provider) => {
    const cleaned = number.replace(/\D/g, '');
    
    if (provider === 'airtel') {
        return /^(097|77)\d{7}$/.test(cleaned) || /^26097\d{7}$/.test(cleaned) || /^\+26097\d{7}$/.test(cleaned);
    }
    
    if (provider === 'mtn') {
        return /^(076|77)\d{7}$/.test(cleaned) || /^26076\d{7}$/.test(cleaned) || /^\+26076\d{7}$/.test(cleaned);
    }
    
    return false;
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
 * Show toast notification
 */
const showToast = (message, type = 'info', title = '') => {
    if (window.MartooToast) {
        window.MartooToast[type]?.(message, title);
    } else {
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
};

// ===================================================================
// 💰 PRICE CALCULATOR
// ===================================================================

const PriceCalculator = {
    /**
     * Get service price
     */
    getServicePrice(serviceId) {
        return PAYMENT_CONFIG.pricing.services[serviceId] || null;
    },
    
    /**
     * Get course price
     */
    getCoursePrice(courseId) {
        return PAYMENT_CONFIG.pricing.courses[courseId] || null;
    },
    
    /**
     * Get subscription price
     */
    getSubscriptionPrice(planId) {
        return PAYMENT_CONFIG.pricing.subscriptions[planId] || null;
    },
    
    /**
     * Calculate total with discounts
     */
    calculateTotal(items, discountCode = null) {
        let subtotal = 0;
        const details = [];
        
        items.forEach(item => {
            let price = 0;
            let name = '';
            
            if (item.type === 'service') {
                const service = this.getServicePrice(item.id);
                price = service?.price || 0;
                name = service?.name || item.id;
            } else if (item.type === 'course') {
                const course = this.getCoursePrice(item.id);
                price = course?.price || 0;
                name = course?.name || item.id;
            } else if (item.type === 'subscription') {
                const subscription = this.getSubscriptionPrice(item.id);
                price = subscription?.price || 0;
                name = subscription?.name || item.id;
            }
            
            subtotal += price;
            details.push({
                ...item,
                name,
                price,
                quantity: item.quantity || 1
            });
        });
        
        // Apply discount (placeholder for future implementation)
        let discount = 0;
        let discountCode_used = null;
        
        if (discountCode === 'STUDENT10') {
            discount = subtotal * 0.1;
            discountCode_used = discountCode;
        }
        
        const total = subtotal - discount;
        
        return {
            subtotal,
            discount,
            discountCode: discountCode_used,
            total,
            details,
            currency: PAYMENT_CONFIG.currency
        };
    },
    
    /**
     * Format invoice
     */
    formatInvoice(calculation, transactionRef) {
        return {
            transactionRef: transactionRef || generateTransactionRef(),
            date: new Date().toISOString(),
            items: calculation.details,
            subtotal: calculation.subtotal,
            discount: calculation.discount,
            discountCode: calculation.discountCode,
            total: calculation.total,
            currency: calculation.currency,
            status: 'pending'
        };
    }
};

// ===================================================================
// 📤 PAYMENT PROOF UPLOAD
// ===================================================================

const PaymentProofUpload = {
    /**
     * Initialize upload component
     */
    init(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return null;
        
        this.options = {
            onFileSelected: null,
            onUploadStart: null,
            onUploadProgress: null,
            onUploadComplete: null,
            onUploadError: null,
            maxSize: PAYMENT_CONFIG.upload.maxSize,
            allowedTypes: PAYMENT_CONFIG.upload.allowedTypes,
            ...options
        };
        
        this.render();
        this.bindEvents();
        
        return this;
    },
    
    /**
     * Render upload component
     */
    render() {
        this.container.innerHTML = `
            <div class="payment-proof-upload">
                <div class="upload-area" id="uploadArea">
                    <div class="upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h4>Upload Payment Proof</h4>
                    <p>Drag and drop or click to upload</p>
                    <p class="upload-hint">
                        <i class="fas fa-info-circle"></i>
                        Accepted formats: JPEG, PNG, PDF (Max ${formatFileSize(this.options.maxSize)})
                    </p>
                    <input type="file" id="fileInput" accept="${this.options.allowedTypes.join(',')}" style="display: none;">
                    <button class="btn btn-primary" id="selectFileBtn">
                        <i class="fas fa-search"></i>
                        Select File
                    </button>
                </div>
                <div class="upload-preview" id="uploadPreview" style="display: none;"></div>
            </div>
        `;
    },
    
    /**
     * Bind events
     */
    bindEvents() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const selectFileBtn = document.getElementById('selectFileBtn');
        
        // Click to select file
        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        uploadArea.addEventListener('click', (e) => {
            if (e.target !== selectFileBtn && !selectFileBtn.contains(e.target)) {
                fileInput.click();
            }
        });
        
        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        // Drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            this.handleFileSelect(file);
        });
    },
    
    /**
     * Prevent defaults for drag events
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    /**
     * Handle file selection
     */
    async handleFileSelect(file) {
        if (!file) return;
        
        // Validate file size
        if (file.size > this.options.maxSize) {
            showToast(`File too large. Maximum size is ${formatFileSize(this.options.maxSize)}.`, 'error');
            return;
        }
        
        // Validate file type
        if (!this.options.allowedTypes.includes(file.type)) {
            showToast('Invalid file type. Please upload an image or PDF.', 'error');
            return;
        }
        
        // Show preview
        this.showPreview(file);
        
        // Callback
        if (this.options.onFileSelected) {
            this.options.onFileSelected(file);
        }
        
        // Auto upload if enabled
        if (this.options.autoUpload) {
            await this.upload(file);
        }
    },
    
    /**
     * Show file preview
     */
    showPreview(file) {
        const uploadArea = document.getElementById('uploadArea');
        const previewContainer = document.getElementById('uploadPreview');
        
        uploadArea.style.display = 'none';
        previewContainer.style.display = 'block';
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML = `
                    <div class="file-preview">
                        <div class="preview-image">
                            <img src="${e.target.result}" alt="Payment proof preview">
                        </div>
                        <div class="file-info">
                            <i class="fas fa-file-image"></i>
                            <div class="file-details">
                                <strong>${file.name}</strong>
                                <span>${formatFileSize(file.size)}</span>
                            </div>
                            <button class="btn btn-sm btn-outline" onclick="PaymentProofUpload.removeFile()">
                                <i class="fas fa-times"></i>
                                Remove
                            </button>
                        </div>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        } else {
            previewContainer.innerHTML = `
                <div class="file-preview">
                    <div class="preview-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="file-info">
                        <i class="fas fa-file-pdf"></i>
                        <div class="file-details">
                            <strong>${file.name}</strong>
                            <span>${formatFileSize(file.size)}</span>
                        </div>
                        <button class="btn btn-sm btn-outline" onclick="PaymentProofUpload.removeFile()">
                            <i class="fas fa-times"></i>
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }
        
        this.currentFile = file;
    },
    
    /**
     * Remove selected file
     */
    removeFile() {
        const uploadArea = document.getElementById('uploadArea');
        const previewContainer = document.getElementById('uploadPreview');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.style.display = 'block';
        previewContainer.style.display = 'none';
        fileInput.value = '';
        this.currentFile = null;
    },
    
    /**
     * Upload file to server
     */
    async upload(file = null) {
        const uploadFile = file || this.currentFile;
        if (!uploadFile) {
            showToast('No file selected.', 'error');
            return null;
        }
        
        try {
            if (this.options.onUploadStart) {
                this.options.onUploadStart(uploadFile);
            }
            
            showToast('Uploading payment proof...', 'info');
            
            // Use API service if available
            if (window.MartooAPI?.upload) {
                const response = await window.MartooAPI.upload(uploadFile);
                
                if (response.success) {
                    if (this.options.onUploadComplete) {
                        this.options.onUploadComplete(response.data);
                    }
                    
                    showToast('Payment proof uploaded successfully!', 'success');
                    return response.data;
                } else {
                    throw new Error(response.error || 'Upload failed');
                }
            } else {
                // Mock upload for demo
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const mockResponse = {
                    url: 'https://res.cloudinary.com/demo/image/upload/payment_proof.jpg',
                    publicId: 'payment_proof_' + Date.now(),
                    filename: uploadFile.name
                };
                
                if (this.options.onUploadComplete) {
                    this.options.onUploadComplete(mockResponse);
                }
                
                showToast('Payment proof uploaded successfully! (Demo)', 'success');
                return mockResponse;
            }
        } catch (error) {
            console.error('Upload error:', error);
            
            if (this.options.onUploadError) {
                this.options.onUploadError(error);
            }
            
            showToast(error.message || 'Upload failed. Please try again.', 'error');
            return null;
        }
    },
    
    /**
     * Reset upload component
     */
    reset() {
        this.removeFile();
        this.currentFile = null;
    }
};

// ===================================================================
// 💳 PAYMENT FORM HANDLER
// ===================================================================

const PaymentForm = {
    /**
     * Initialize payment form
     */
    init(formId, options = {}) {
        this.form = document.getElementById(formId);
        if (!this.form) return null;
        
        this.options = {
            onSubmit: null,
            onSuccess: null,
            onError: null,
            enrollmentId: null,
            ...options
        };
        
        this.bindEvents();
        
        return this;
    },
    
    /**
     * Bind form events
     */
    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        // Payment method toggle
        const methodInputs = this.form.querySelectorAll('[name="paymentMethod"]');
        methodInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.togglePaymentDetails(input.value);
            });
        });
    },
    
    /**
     * Toggle payment details display
     */
    togglePaymentDetails(method) {
        const detailsContainers = this.form.querySelectorAll('.payment-details');
        detailsContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        const selectedContainer = this.form.querySelector(`.payment-details-${method}`);
        if (selectedContainer) {
            selectedContainer.style.display = 'block';
        }
        
        // Update submit button text
        const submitBtn = this.form.querySelector('[type="submit"]');
        if (submitBtn) {
            const methodConfig = PAYMENT_CONFIG.methods[method];
            submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> Confirm Payment via ${methodConfig?.name || method}`;
        }
    },
    
    /**
     * Handle form submission
     */
    async handleSubmit() {
        try {
            const formData = new FormData(this.form);
            
            // Get form values
            const paymentData = {
                enrollmentId: this.options.enrollmentId || formData.get('enrollmentId'),
                paymentMethod: formData.get('paymentMethod'),
                transactionRef: formData.get('transactionRef') || generateTransactionRef(),
                amount: parseFloat(formData.get('amount')),
                phoneNumber: formData.get('phoneNumber'),
                accountName: formData.get('accountName'),
                transactionDate: formData.get('transactionDate') || new Date().toISOString().split('T')[0],
                notes: formData.get('notes')
            };
            
            // Validate
            if (!paymentData.paymentMethod) {
                showToast('Please select a payment method.', 'error');
                return;
            }
            
            if (!paymentData.amount || paymentData.amount <= 0) {
                showToast('Please enter a valid amount.', 'error');
                return;
            }
            
            // Validate mobile money number
            if (['airtel', 'mtn'].includes(paymentData.paymentMethod)) {
                if (!paymentData.phoneNumber) {
                    showToast('Please enter your mobile money number.', 'error');
                    return;
                }
                
                if (!validateMobileMoneyNumber(paymentData.phoneNumber, paymentData.paymentMethod)) {
                    showToast(`Please enter a valid ${PAYMENT_CONFIG.methods[paymentData.paymentMethod].name} number.`, 'error');
                    return;
                }
            }
            
            // Callback
            if (this.options.onSubmit) {
                this.options.onSubmit(paymentData);
            }
            
            showToast('Processing payment confirmation...', 'info');
            
            // Submit to API
            await this.submitPayment(paymentData);
            
        } catch (error) {
            console.error('Payment form error:', error);
            
            if (this.options.onError) {
                this.options.onError(error);
            }
            
            showToast(error.message || 'Payment submission failed. Please try again.', 'error');
        }
    },
    
    /**
     * Submit payment to API
     */
    async submitPayment(paymentData) {
        try {
            // Use API if available
            if (window.MartooAPI?.enrollments) {
                // Check if we have payment proof
                const hasProof = !!PaymentProofUpload.currentFile;
                
                let proofUrl = null;
                
                // Upload proof if available
                if (hasProof) {
                    const uploadResult = await PaymentProofUpload.upload();
                    proofUrl = uploadResult?.url;
                }
                
                // Update enrollment with payment info
                if (paymentData.enrollmentId) {
                    const response = await window.MartooAPI.enrollments.updateStatus(
                        paymentData.enrollmentId,
                        hasProof ? PAYMENT_CONFIG.status.proof_submitted : PAYMENT_CONFIG.status.pending,
                        JSON.stringify({
                            paymentMethod: paymentData.paymentMethod,
                            transactionRef: paymentData.transactionRef,
                            amount: paymentData.amount,
                            proofUrl,
                            submittedAt: new Date().toISOString()
                        })
                    );
                    
                    if (response.success) {
                        if (this.options.onSuccess) {
                            this.options.onSuccess({
                                ...paymentData,
                                proofUrl,
                                status: hasProof ? PAYMENT_CONFIG.status.proof_submitted : PAYMENT_CONFIG.status.pending
                            });
                        }
                        
                        showToast('Payment submitted successfully! Our team will verify within 24-48 hours.', 'success');
                        this.form.reset();
                        PaymentProofUpload?.reset();
                    }
                }
            } else {
                // Mock success for demo
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                if (this.options.onSuccess) {
                    this.options.onSuccess(paymentData);
                }
                
                showToast('Payment submitted successfully! (Demo)', 'success');
                this.form.reset();
                PaymentProofUpload?.reset();
            }
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Set enrollment ID
     */
    setEnrollmentId(enrollmentId) {
        this.options.enrollmentId = enrollmentId;
        const input = this.form.querySelector('[name="enrollmentId"]');
        if (input) {
            input.value = enrollmentId;
        }
    },
    
    /**
     * Set amount
     */
    setAmount(amount) {
        const input = this.form.querySelector('[name="amount"]');
        if (input) {
            input.value = amount;
        }
    },
    
    /**
     * Reset form
     */
    reset() {
        this.form.reset();
        this.togglePaymentDetails('airtel');
        PaymentProofUpload?.reset();
    }
};

// ===================================================================
// 📋 PAYMENT HISTORY
// ===================================================================

const PaymentHistory = {
    /**
     * Load payment history
     */
    async loadPayments(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const {
            limit = 10,
            status = null,
            userId = null
        } = options;
        
        try {
            container.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin"></i> Loading payment history...</div>';
            
            let payments = [];
            
            // Fetch from API
            if (window.MartooAPI?.enrollments?.getAllEnrollments) {
                const response = await window.MartooAPI.enrollments.getAllEnrollments({ limit, status });
                if (response.success) {
                    payments = response.data.enrollments;
                }
            } else {
                // Mock data
                await new Promise(resolve => setTimeout(resolve, 800));
                payments = this.getMockPayments();
            }
            
            // Filter by user if needed
            if (userId) {
                payments = payments.filter(p => p.userId === userId);
            }
            
            // Filter by status if needed
            if (status) {
                payments = payments.filter(p => p.status === status);
            }
            
            this.renderPayments(container, payments);
            
        } catch (error) {
            console.error('Load payments error:', error);
            container.innerHTML = '<div class="text-center py-5 text-danger">Failed to load payment history.</div>';
        }
    },
    
    /**
     * Render payments table
     */
    renderPayments(container, payments) {
        if (!payments || payments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-credit-card" style="font-size: 48px; color: var(--neutral-400); margin-bottom: 16px;"></i>
                    <p style="color: var(--neutral-400);">No payment history found.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table payment-history-table">
                    <thead>
                        <tr>
                            <th>Transaction Ref</th>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th>Proof</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        payments.forEach(payment => {
            const status = payment.status || 'Pending Payment';
            const statusClass = status.toLowerCase().replace(' ', '-');
            const amount = payment.amount || 0;
            
            html += `
                <tr>
                    <td>
                        <strong>${payment.transactionRef || payment.id || '—'}</strong>
                    </td>
                    <td>${new Date(payment.createdAt || payment.date || Date.now()).toLocaleDateString('en-ZM')}</td>
                    <td>
                        <div>
                            <strong>${payment.course || payment.description || 'Course Enrollment'}</strong>
                            <small style="display: block; color: var(--neutral-400);">${payment.name || payment.customerName || ''}</small>
                        </div>
                    </td>
                    <td><strong style="color: var(--accent-green);">${formatCurrency(amount)}</strong></td>
                    <td>
                        <span style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-${payment.paymentMethod === 'airtel' ? 'mobile-alt' : payment.paymentMethod === 'mtn' ? 'mobile-alt' : payment.paymentMethod === 'bank' ? 'university' : 'money-bill-wave'}"></i>
                            ${PAYMENT_CONFIG.methods[payment.paymentMethod]?.name || payment.paymentMethod || '—'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge status-${statusClass}">
                            <i class="fas fa-${this.getStatusIcon(status)}"></i>
                            ${status}
                        </span>
                    </td>
                    <td>
                        ${payment.proofUrl ? `
                            <button class="action-btn" onclick="window.open('${payment.proofUrl}')" title="View Proof">
                                <i class="fas fa-receipt"></i>
                            </button>
                        ` : '—'}
                    </td>
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
     * Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            'Pending Payment': 'clock',
            'Payment Proof Submitted': 'check-circle',
            'Confirmed': 'check-double',
            'Cancelled': 'times-circle',
            'Refunded': 'undo-alt'
        };
        return icons[status] || 'clock';
    },
    
    /**
     * Get mock payments for demo
     */
    getMockPayments() {
        return [
            {
                id: 'ENR-001',
                transactionRef: 'MTW-A1B2C3',
                createdAt: '2026-02-10',
                name: 'John Mulenga',
                course: 'Advanced STATA Analysis',
                amount: 450,
                paymentMethod: 'airtel',
                status: 'Confirmed',
                proofUrl: '#'
            },
            {
                id: 'ENR-002',
                transactionRef: 'MTW-D4E5F6',
                createdAt: '2026-02-09',
                name: 'Mary Banda',
                course: 'GIS for Public Health',
                amount: 350,
                paymentMethod: 'mtn',
                status: 'Payment Proof Submitted',
                proofUrl: '#'
            },
            {
                id: 'ENR-003',
                transactionRef: 'MTW-G7H8I9',
                createdAt: '2026-02-08',
                name: 'Peter Phiri',
                course: 'Research Methodology',
                amount: 300,
                paymentMethod: 'bank',
                status: 'Pending Payment',
                proofUrl: null
            }
        ];
    }
};

// ===================================================================
// 🎯 PAYMENT MODAL
// ===================================================================

const PaymentModal = {
    /**
     * Show payment modal
     */
    show(options = {}) {
        const {
            title = 'Complete Payment',
            amount = null,
            enrollmentId = null,
            courseId = null,
            serviceId = null,
            onComplete = null
        } = options;
        
        // Create modal container
        let modal = document.getElementById('paymentModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'paymentModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        // Get payment details
        let paymentAmount = amount;
        let itemName = '';
        
        if (courseId) {
            const course = PriceCalculator.getCoursePrice(courseId);
            paymentAmount = course?.price || 0;
            itemName = course?.name || courseId;
        } else if (serviceId) {
            const service = PriceCalculator.getServicePrice(serviceId);
            paymentAmount = service?.price || 0;
            itemName = service?.name || serviceId;
        }
        
        // Generate transaction reference
        const transactionRef = generateTransactionRef();
        
        // Render modal
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="PaymentModal.hide()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <!-- Order Summary -->
                        <div style="background: var(--primary-deep); border-radius: var(--radius-lg); padding: 24px;">
                            <h4 style="margin-bottom: 20px;">Order Summary</h4>
                            <div style="margin-bottom: 20px;">
                                <strong style="display: block; margin-bottom: 8px;">Item:</strong>
                                <p>${itemName || 'Course Enrollment'}</p>
                            </div>
                            <div style="margin-bottom: 20px;">
                                <strong style="display: block; margin-bottom: 8px;">Amount:</strong>
                                <p style="font-size: 32px; font-weight: 800; color: var(--accent-green);">${formatCurrency(paymentAmount)}</p>
                            </div>
                            <div>
                                <strong style="display: block; margin-bottom: 8px;">Transaction Ref:</strong>
                                <p style="font-family: monospace; background: var(--primary-midnight); padding: 8px 12px; border-radius: var(--radius-sm);">${transactionRef}</p>
                            </div>
                        </div>
                        
                        <!-- Payment Form -->
                        <div>
                            <form id="paymentModalForm">
                                <input type="hidden" name="enrollmentId" value="${enrollmentId || ''}">
                                <input type="hidden" name="amount" value="${paymentAmount}">
                                <input type="hidden" name="transactionRef" value="${transactionRef}">
                                
                                <div style="margin-bottom: 24px;">
                                    <label style="display: block; margin-bottom: 12px; font-weight: 600;">Select Payment Method</label>
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-deep); border-radius: var(--radius-md); cursor: pointer;">
                                            <input type="radio" name="paymentMethod" value="airtel" checked>
                                            <i class="fas fa-mobile-alt" style="color: #E60000;"></i>
                                            <span>Airtel Money (0973495316)</span>
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-deep); border-radius: var(--radius-md); cursor: pointer;">
                                            <input type="radio" name="paymentMethod" value="mtn">
                                            <i class="fas fa-mobile-alt" style="color: #FFCC00;"></i>
                                            <span>MTN Mobile Money (0774766077)</span>
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-deep); border-radius: var(--radius-md); cursor: pointer;">
                                            <input type="radio" name="paymentMethod" value="bank">
                                            <i class="fas fa-university" style="color: #007BFF;"></i>
                                            <span>Bank Transfer</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <!-- Payment Details Container -->
                                <div id="paymentDetailsContainer"></div>
                                
                                <!-- Payment Proof Upload -->
                                <div style="margin-top: 24px;">
                                    <label style="display: block; margin-bottom: 12px; font-weight: 600;">Upload Payment Proof</label>
                                    <div id="paymentProofUpload"></div>
                                    <p style="font-size: 12px; color: var(--neutral-400); margin-top: 8px;">
                                        <i class="fas fa-info-circle"></i>
                                        Upload a screenshot or photo of your payment confirmation.
                                    </p>
                                </div>
                                
                                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 24px;">
                                    <i class="fas fa-check-circle"></i>
                                    Confirm Payment
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add payment details containers
        this.addPaymentDetails();
        
        // Initialize payment proof upload
        setTimeout(() => {
            PaymentProofUpload.init('paymentProofUpload', {
                autoUpload: false,
                onFileSelected: (file) => {
                    console.log('File selected:', file.name);
                }
            });
        }, 100);
        
        // Initialize payment form
        setTimeout(() => {
            PaymentForm.init('paymentModalForm', {
                enrollmentId,
                onSuccess: (data) => {
                    this.hide();
                    if (onComplete) {
                        onComplete(data);
                    }
                },
                onError: (error) => {
                    console.error('Payment error:', error);
                }
            });
        }, 100);
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Add payment details containers
     */
    addPaymentDetails() {
        const container = document.getElementById('paymentDetailsContainer');
        if (!container) return;
        
        // Airtel Money details
        container.innerHTML += `
            <div class="payment-details payment-details-airtel" style="display: block;">
                <div style="background: rgba(230, 0, 0, 0.05); border-left: 4px solid #E60000; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                    <strong style="display: block; margin-bottom: 8px;">Airtel Money Instructions:</strong>
                    <p style="margin-bottom: 8px;">1. Dial *444# or open Airtel Money app</p>
                    <p style="margin-bottom: 8px;">2. Select "Send Money"</p>
                    <p style="margin-bottom: 8px;">3. Enter number: <strong>097 349 5316</strong></p>
                    <p style="margin-bottom: 8px;">4. Enter amount: <strong id="airtelAmount">K0</strong></p>
                    <p>5. Use your name as reference</p>
                </div>
                <div class="form-group">
                    <i class="fas fa-mobile-alt"></i>
                    <input type="tel" name="phoneNumber" placeholder="Your Airtel Money Number" value="">
                </div>
            </div>
        `;
        
        // MTN Money details
        container.innerHTML += `
            <div class="payment-details payment-details-mtn" style="display: none;">
                <div style="background: rgba(255, 204, 0, 0.05); border-left: 4px solid #FFCC00; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                    <strong style="display: block; margin-bottom: 8px;">MTN Mobile Money Instructions:</strong>
                    <p style="margin-bottom: 8px;">1. Dial *165# or open MoMo app</p>
                    <p style="margin-bottom: 8px;">2. Select "Send Money"</p>
                    <p style="margin-bottom: 8px;">3. Enter number: <strong>077 476 6077</strong></p>
                    <p style="margin-bottom: 8px;">4. Enter amount: <strong id="mtnAmount">K0</strong></p>
                    <p>5. Use your name as reference</p>
                </div>
                <div class="form-group">
                    <i class="fas fa-mobile-alt"></i>
                    <input type="tel" name="phoneNumber" placeholder="Your MTN Mobile Number" value="">
                </div>
            </div>
        `;
        
        // Bank transfer details
        container.innerHTML += `
            <div class="payment-details payment-details-bank" style="display: none;">
                <div style="background: rgba(0, 123, 255, 0.05); border-left: 4px solid #007BFF; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                    <strong style="display: block; margin-bottom: 12px;">Bank Transfer Details:</strong>
                    <p style="margin-bottom: 8px;"><strong>Bank:</strong> ${PAYMENT_CONFIG.methods.bank.account.bank}</p>
                    <p style="margin-bottom: 8px;"><strong>Account Name:</strong> ${PAYMENT_CONFIG.methods.bank.account.accountName}</p>
                    <p style="margin-bottom: 8px;"><strong>Account Number:</strong> ${PAYMENT_CONFIG.methods.bank.account.accountNumber}</p>
                    <p style="margin-bottom: 8px;"><strong>Branch:</strong> ${PAYMENT_CONFIG.methods.bank.account.branch}</p>
                    <p style="margin-bottom: 8px;"><strong>SWIFT Code:</strong> ${PAYMENT_CONFIG.methods.bank.account.swift}</p>
                    <p style="margin-top: 12px;"><strong>Reference:</strong> Use your name and transaction reference</p>
                </div>
                <div class="form-group">
                    <i class="fas fa-user"></i>
                    <input type="text" name="accountName" placeholder="Your Account Name" value="">
                </div>
            </div>
        `;
        
        // Update amount displays
        const amount = document.querySelector('[name="amount"]')?.value || 0;
        const airtelAmount = document.getElementById('airtelAmount');
        const mtnAmount = document.getElementById('mtnAmount');
        
        if (airtelAmount) airtelAmount.textContent = formatCurrency(amount);
        if (mtnAmount) mtnAmount.textContent = formatCurrency(amount);
    },
    
    /**
     * Hide payment modal
     */
    hide() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Clean up
            setTimeout(() => {
                modal.innerHTML = '';
            }, 300);
        }
    }
};

// ===================================================================
// 📊 PAYMENT DASHBOARD
// ===================================================================

const PaymentDashboard = {
    /**
     * Load payment statistics
     */
    async loadStats(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        try {
            let stats = {
                totalRevenue: 24500,
                pendingPayments: 12,
                confirmedPayments: 67,
                averagePayment: 320
            };
            
            // Fetch from API if available
            if (window.MartooAPI?.admin?.getStats) {
                const response = await window.MartooAPI.admin.getStats();
                if (response.success) {
                    stats = response.data.stats;
                }
            }
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Total Revenue</h4>
                            <div class="stat-number">${formatCurrency(stats.totalRevenue || 0)}</div>
                            <div class="stat-trend positive">
                                <i class="fas fa-arrow-up"></i> +15%
                            </div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-credit-card"></i>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Pending Payments</h4>
                            <div class="stat-number">${stats.pendingPayments || 0}</div>
                            <div class="stat-trend">
                                <i class="fas fa-clock"></i> Awaiting
                            </div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Confirmed</h4>
                            <div class="stat-number">${stats.confirmedPayments || 0}</div>
                            <div class="stat-trend positive">
                                <i class="fas fa-check-circle"></i> Verified
                            </div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-check-double"></i>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-info">
                            <h4>Average Payment</h4>
                            <div class="stat-number">${formatCurrency(stats.averagePayment || 0)}</div>
                            <div class="stat-trend">
                                <i class="fas fa-chart-line"></i> Per transaction
                            </div>
                        </div>
                        <div class="stat-icon">
                            <i class="fas fa-calculator"></i>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Load payment stats error:', error);
        }
    },
    
    /**
     * Export payment report
     */
    async exportReport(format = 'csv') {
        try {
            showToast('Generating payment report...', 'info');
            
            // Fetch payment data
            let payments = [];
            
            if (window.MartooAPI?.admin?.exportData) {
                const response = await window.MartooAPI.admin.exportData('payments');
                if (response.success) {
                    // Handle download
                    window.location.href = response.data.url;
                    showToast('Report generated successfully!', 'success');
                    return;
                }
            }
            
            // Mock export for demo
            await new Promise(resolve => setTimeout(resolve, 1500));
            showToast('Report exported successfully! (Demo)', 'success');
            
        } catch (error) {
            console.error('Export report error:', error);
            showToast('Failed to generate report.', 'error');
        }
    }
};

// ===================================================================
// 📦 EXPORT PUBLIC API
// ===================================================================

const Payment = {
    // Core modules
    calculator: PriceCalculator,
    upload: PaymentProofUpload,
    form: PaymentForm,
    history: PaymentHistory,
    modal: PaymentModal,
    dashboard: PaymentDashboard,
    
    // Utilities
    utils: {
        formatCurrency,
        formatPhoneNumber,
        generateTransactionRef,
        validateMobileMoneyNumber,
        formatFileSize,
        debounce
    },
    
    // Configuration
    config: PAYMENT_CONFIG,
    
    // Version
    version: '2.0.0'
};

// ===================================================================
// 🌐 EXPORT TO GLOBAL SCOPE
// ===================================================================

// Make Payment module available globally
if (typeof window !== 'undefined') {
    window.MartooPayment = Payment;
    window.Payment = Payment;
    
    console.log('💳 Martoo Payment v2.0.0 initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Payment;
}

export default Payment;
