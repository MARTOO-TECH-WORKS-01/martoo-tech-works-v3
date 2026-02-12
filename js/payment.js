/**
 * ===================================================================
 * MARTOO TECH WORKS - PAYMENT MODULE
 * Version: 2.0.0
 * Backend: Node.js/Express on Vercel - YOUR ACTUAL BACKEND
 * Repository: mtechworks1-hub/martoo-tech-backend-Qgis
 * Features: Mobile Money (Airtel/MTN), Bank Transfer, Payment Proof Upload
 * ===================================================================
 */

'use strict';

// ===================================================================
// 🚀 IMMEDIATE SELF-EXECUTING FUNCTION - NO EXPORTS!
// ===================================================================

(function() {
    
    // ===================================================================
    // 🔧 PAYMENT CONFIGURATION - YOUR ACTUAL PAYMENT DETAILS
    // ===================================================================
    
    const CONFIG = {
        // Currency
        currency: 'ZMW',
        currencySymbol: 'K',
        
        // ✅ YOUR ACTUAL PAYMENT METHODS - AS SPECIFIED
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
        
        // ✅ COURSE PRICING - MATCHES YOUR ACADEMY
        courses: {
            'stata-beginner': { name: 'Introduction to STATA', price: 0 },
            'stata-advanced': { name: 'Advanced STATA Analysis', price: 450 },
            'gis-beginner': { name: 'QGIS Fundamentals', price: 0 },
            'gis-advanced': { name: 'Advanced GIS Mapping', price: 350 },
            'research-methods': { name: 'Research Methodology', price: 300 },
            'proposal-writing': { name: 'Proposal Writing Masterclass', price: 400 },
            'academic-writing': { name: 'Academic Writing Essentials', price: 0 },
            'data-viz': { name: 'Data Visualization for Research', price: 250 }
        },
        
        // ✅ SERVICE PRICING - MATCHES YOUR SERVICES PAGE
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
        
        // ✅ SUBSCRIPTION PRICING
        subscriptions: {
            'monthly': { name: 'Monthly All Access Pass', price: 149 },
            'annual': { name: 'Annual All Access Pass', price: 1299 }
        },
        
        // ✅ FILE UPLOAD - MATCHES YOUR BACKEND
        upload: {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf'
            ]
        },
        
        // ✅ ENROLLMENT STATUS - MATCHES YOUR BACKEND
        status: {
            pending: 'Pending Payment',
            proof_submitted: 'Payment Proof Submitted',
            confirmed: 'Confirmed',
            cancelled: 'Cancelled',
            refunded: 'Refunded'
        }
    };

    // ===================================================================
    // 🔧 UTILITY FUNCTIONS
    // ===================================================================
    
    /**
     * Format currency (ZMW)
     */
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return `${CONFIG.currencySymbol}0`;
        return `${CONFIG.currencySymbol}${Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
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
     * Generate transaction reference (MTW-XXXXXX format)
     */
    const generateTransactionRef = () => {
        const prefix = 'MTW';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    };

    /**
     * Validate Zambian mobile money number
     */
    const validateMobileMoneyNumber = (number, provider) => {
        const cleaned = number.replace(/\D/g, '');
        
        if (provider === 'airtel') {
            return /^(097|77)\d{7}$/.test(cleaned) || 
                   /^26097\d{7}$/.test(cleaned) || 
                   /^\+26097\d{7}$/.test(cleaned);
        }
        
        if (provider === 'mtn') {
            return /^(076|77)\d{7}$/.test(cleaned) || 
                   /^26076\d{7}$/.test(cleaned) || 
                   /^\+26076\d{7}$/.test(cleaned);
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

    // ===================================================================
    // 💰 PRICE CALCULATOR
    // ===================================================================
    
    const PriceCalculator = {
        /**
         * Get course price
         */
        getCoursePrice(courseId) {
            return CONFIG.courses[courseId] || null;
        },

        /**
         * Get service price
         */
        getServicePrice(serviceId) {
            return CONFIG.services[serviceId] || null;
        },

        /**
         * Get subscription price
         */
        getSubscriptionPrice(planId) {
            return CONFIG.subscriptions[planId] || null;
        },

        /**
         * Calculate total
         */
        calculateTotal(items) {
            let subtotal = 0;
            const details = [];
            
            items.forEach(item => {
                let price = 0;
                let name = '';
                
                if (item.type === 'course') {
                    const course = this.getCoursePrice(item.id);
                    price = course?.price || 0;
                    name = course?.name || item.id;
                } else if (item.type === 'service') {
                    const service = this.getServicePrice(item.id);
                    price = service?.price || 0;
                    name = service?.name || item.id;
                } else if (item.type === 'subscription') {
                    const sub = this.getSubscriptionPrice(item.id);
                    price = sub?.price || 0;
                    name = sub?.name || item.id;
                }
                
                subtotal += price * (item.quantity || 1);
                details.push({
                    ...item,
                    name,
                    price,
                    total: price * (item.quantity || 1)
                });
            });
            
            return {
                subtotal,
                total: subtotal,
                details,
                currency: CONFIG.currency
            };
        },

        /**
         * Generate invoice
         */
        generateInvoice(calculation) {
            return {
                transactionRef: generateTransactionRef(),
                date: new Date().toISOString(),
                items: calculation.details,
                subtotal: calculation.subtotal,
                total: calculation.total,
                currency: calculation.currency,
                status: 'pending'
            };
        }
    };

    // ===================================================================
    // 📤 PAYMENT PROOF UPLOAD - MATCHES YOUR BACKEND
    // ===================================================================
    
    const PaymentProofUpload = {
        currentFile: null,
        previewContainer: null,
        onUploadComplete: null,
        onUploadError: null,

        /**
         * Initialize upload component
         */
        init(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;
            
            this.onUploadComplete = options.onUploadComplete || null;
            this.onUploadError = options.onUploadError || null;
            
            this.render(container);
            this.bindEvents(container);
            
            return this;
        },

        /**
         * Render upload component
         */
        render(container) {
            container.innerHTML = `
                <div class="payment-proof-upload">
                    <div class="upload-area" id="uploadArea">
                        <div class="upload-icon">
                            <i class="fas fa-cloud-upload-alt"></i>
                        </div>
                        <h4>Upload Payment Proof</h4>
                        <p>Drag and drop or click to upload</p>
                        <p class="upload-hint">
                            <i class="fas fa-info-circle"></i>
                            Accepted: JPEG, PNG, PDF (Max ${formatFileSize(CONFIG.upload.maxSize)})
                        </p>
                        <input type="file" id="fileInput" accept="${CONFIG.upload.allowedTypes.join(',')}" style="display: none;">
                        <button class="btn btn-primary" id="selectFileBtn">
                            <i class="fas fa-search"></i>
                            Select File
                        </button>
                    </div>
                    <div class="upload-preview" id="uploadPreview" style="display: none;"></div>
                </div>
            `;
            
            this.previewContainer = container.querySelector('#uploadPreview');
        },

        /**
         * Bind events
         */
        bindEvents(container) {
            const uploadArea = container.querySelector('#uploadArea');
            const fileInput = container.querySelector('#fileInput');
            const selectFileBtn = container.querySelector('#selectFileBtn');
            
            selectFileBtn.addEventListener('click', () => fileInput.click());
            
            uploadArea.addEventListener('click', (e) => {
                if (e.target !== selectFileBtn && !selectFileBtn.contains(e.target)) {
                    fileInput.click();
                }
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
            
            // Drag and drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, (e) => e.preventDefault());
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
         * Handle file selection
         */
        async handleFileSelect(file) {
            if (!file) return;
            
            // Validate file size
            if (file.size > CONFIG.upload.maxSize) {
                alert(`File too large. Maximum size is ${formatFileSize(CONFIG.upload.maxSize)}.`);
                return;
            }
            
            // Validate file type
            if (!CONFIG.upload.allowedTypes.includes(file.type)) {
                alert('Invalid file type. Please upload an image or PDF.');
                return;
            }
            
            this.currentFile = file;
            this.showPreview(file);
        },

        /**
         * Show file preview
         */
        showPreview(file) {
            const uploadArea = document.querySelector('#uploadArea');
            if (!uploadArea || !this.previewContainer) return;
            
            uploadArea.style.display = 'none';
            this.previewContainer.style.display = 'block';
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.previewContainer.innerHTML = `
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
                                <button class="btn btn-sm btn-outline" onclick="window.Payment.upload.removeFile()">
                                    <i class="fas fa-times"></i>
                                    Remove
                                </button>
                            </div>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                this.previewContainer.innerHTML = `
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
                            <button class="btn btn-sm btn-outline" onclick="window.Payment.upload.removeFile()">
                                <i class="fas fa-times"></i>
                                Remove
                            </button>
                        </div>
                    </div>
                `;
            }
        },

        /**
         * Remove selected file
         */
        removeFile() {
            const uploadArea = document.querySelector('#uploadArea');
            const fileInput = document.querySelector('#fileInput');
            
            if (uploadArea) uploadArea.style.display = 'block';
            if (this.previewContainer) this.previewContainer.style.display = 'none';
            if (fileInput) fileInput.value = '';
            
            this.currentFile = null;
        },

        /**
         * Upload file to backend - POST /upload (Cloudinary)
         */
        async upload() {
            if (!this.currentFile) {
                throw new Error('No file selected');
            }
            
            try {
                if (!window.API) {
                    throw new Error('API module not loaded');
                }
                
                // ✅ REAL UPLOAD TO YOUR BACKEND - CLOUDINARY INTEGRATION
                const response = await window.API.upload(this.currentFile);
                
                if (response.success) {
                    if (this.onUploadComplete) {
                        this.onUploadComplete(response.data);
                    }
                    return response.data;
                } else {
                    throw new Error(response.error || 'Upload failed');
                }
            } catch (error) {
                console.error('Upload error:', error);
                if (this.onUploadError) {
                    this.onUploadError(error);
                }
                throw error;
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
        init(formId, enrollmentId = null) {
            this.form = document.getElementById(formId);
            if (!this.form) return null;
            
            this.enrollmentId = enrollmentId;
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
            
            const methodInputs = this.form.querySelectorAll('[name="paymentMethod"]');
            methodInputs.forEach(input => {
                input.addEventListener('change', () => {
                    this.togglePaymentDetails(input.value);
                });
            });
        },

        /**
         * Toggle payment details
         */
        togglePaymentDetails(method) {
            const containers = this.form.querySelectorAll('.payment-details');
            containers.forEach(c => c.style.display = 'none');
            
            const selected = this.form.querySelector(`.payment-details-${method}`);
            if (selected) selected.style.display = 'block';
        },

        /**
         * Handle form submission
         */
        async handleSubmit() {
            try {
                const formData = new FormData(this.form);
                
                const paymentData = {
                    enrollmentId: this.enrollmentId || formData.get('enrollmentId'),
                    paymentMethod: formData.get('paymentMethod'),
                    transactionRef: formData.get('transactionRef') || generateTransactionRef(),
                    amount: parseFloat(formData.get('amount')),
                    phoneNumber: formData.get('phoneNumber'),
                    accountName: formData.get('accountName'),
                    notes: formData.get('notes')
                };
                
                // Validate
                if (!paymentData.paymentMethod) {
                    alert('Please select a payment method.');
                    return;
                }
                
                if (!paymentData.amount || paymentData.amount <= 0) {
                    alert('Please enter a valid amount.');
                    return;
                }
                
                // Validate mobile money number
                if (['airtel', 'mtn'].includes(paymentData.paymentMethod)) {
                    if (!paymentData.phoneNumber) {
                        alert('Please enter your mobile money number.');
                        return;
                    }
                    
                    if (!validateMobileMoneyNumber(paymentData.phoneNumber, paymentData.paymentMethod)) {
                        alert(`Please enter a valid ${CONFIG.methods[paymentData.paymentMethod].name} number.`);
                        return;
                    }
                }
                
                // Check if we have payment proof
                if (!PaymentProofUpload.currentFile) {
                    alert('Please upload payment proof.');
                    return;
                }
                
                // ✅ STEP 1: Upload payment proof to Cloudinary
                const uploadResult = await PaymentProofUpload.upload();
                
                // ✅ STEP 2: Update enrollment with proof URL - POST /enrollments/:id/proof
                if (paymentData.enrollmentId && window.API) {
                    const response = await window.API.enrollments.uploadPaymentProof(
                        paymentData.enrollmentId,
                        PaymentProofUpload.currentFile
                    );
                    
                    if (response.success) {
                        alert('✅ Payment submitted successfully! Our team will verify within 24-48 hours.');
                        this.form.reset();
                        PaymentProofUpload.reset();
                        
                        // Redirect to dashboard
                        setTimeout(() => {
                            window.location.href = './user_dashboard.html';
                        }, 2000);
                    } else {
                        alert(response.error || 'Payment submission failed. Please try again.');
                    }
                } else {
                    // Demo mode - no enrollment ID
                    alert('✅ Payment submitted successfully! (Demo)');
                    this.form.reset();
                    PaymentProofUpload.reset();
                }
                
            } catch (error) {
                console.error('Payment submission error:', error);
                alert(error.message || 'Payment submission failed. Please try again.');
            }
        },

        /**
         * Set enrollment ID
         */
        setEnrollmentId(enrollmentId) {
            this.enrollmentId = enrollmentId;
            const input = this.form.querySelector('[name="enrollmentId"]');
            if (input) input.value = enrollmentId;
        },

        /**
         * Set amount
         */
        setAmount(amount) {
            const input = this.form.querySelector('[name="amount"]');
            if (input) input.value = amount;
        },

        /**
         * Reset form
         */
        reset() {
            this.form.reset();
            PaymentProofUpload.reset();
        }
    };

    // ===================================================================
    // 💳 PAYMENT MODAL
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
            
            const transactionRef = generateTransactionRef();
            
            modal.innerHTML = `
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="window.Payment.modal.hide()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                            <!-- Order Summary -->
                            <div style="background: var(--primary-deep); border-radius: var(--radius-lg); padding: 24px;">
                                <h4 style="margin-bottom: 20px;">Order Summary</h4>
                                <div style="margin-bottom: 20px;">
                                    <strong>Item:</strong>
                                    <p>${itemName || 'Course Enrollment'}</p>
                                </div>
                                <div style="margin-bottom: 20px;">
                                    <strong>Amount:</strong>
                                    <p style="font-size: 32px; font-weight: 800; color: var(--accent-green);">${formatCurrency(paymentAmount)}</p>
                                </div>
                                <div>
                                    <strong>Transaction Ref:</strong>
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
                                                <span>Airtel Money (097 349 5316)</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-deep); border-radius: var(--radius-md); cursor: pointer;">
                                                <input type="radio" name="paymentMethod" value="mtn">
                                                <i class="fas fa-mobile-alt" style="color: #FFCC00;"></i>
                                                <span>MTN Mobile Money (077 476 6077)</span>
                                            </label>
                                            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-deep); border-radius: var(--radius-md); cursor: pointer;">
                                                <input type="radio" name="paymentMethod" value="bank">
                                                <i class="fas fa-university" style="color: #007BFF;"></i>
                                                <span>Bank Transfer</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div id="paymentDetailsContainer"></div>
                                    
                                    <div style="margin-top: 24px;">
                                        <label style="display: block; margin-bottom: 12px; font-weight: 600;">Upload Payment Proof</label>
                                        <div id="paymentProofUpload"></div>
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
            
            // Add payment details
            this.addPaymentDetails(modal, paymentAmount);
            
            // Initialize upload
            setTimeout(() => {
                PaymentProofUpload.init('paymentProofUpload', {
                    onUploadComplete: (data) => console.log('Upload complete:', data)
                });
            }, 100);
            
            // Initialize form
            setTimeout(() => {
                PaymentForm.init('paymentModalForm', enrollmentId);
            }, 100);
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        /**
         * Add payment details
         */
        addPaymentDetails(modal, amount) {
            const container = modal.querySelector('#paymentDetailsContainer');
            if (!container) return;
            
            // Airtel Money
            container.innerHTML = `
                <div class="payment-details payment-details-airtel" style="display: block;">
                    <div style="background: rgba(230, 0, 0, 0.05); border-left: 4px solid #E60000; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                        <strong>Airtel Money Instructions:</strong>
                        <p style="margin-top: 8px;">1. Dial *444# or open Airtel Money app</p>
                        <p>2. Select "Send Money"</p>
                        <p>3. Enter number: <strong>097 349 5316</strong></p>
                        <p>4. Enter amount: <strong>${formatCurrency(amount)}</strong></p>
                        <p>5. Use your name as reference</p>
                    </div>
                    <div class="form-group">
                        <i class="fas fa-mobile-alt"></i>
                        <input type="tel" name="phoneNumber" placeholder="Your Airtel Money Number" value="">
                    </div>
                </div>
                
                <div class="payment-details payment-details-mtn" style="display: none;">
                    <div style="background: rgba(255, 204, 0, 0.05); border-left: 4px solid #FFCC00; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                        <strong>MTN Mobile Money Instructions:</strong>
                        <p style="margin-top: 8px;">1. Dial *165# or open MoMo app</p>
                        <p>2. Select "Send Money"</p>
                        <p>3. Enter number: <strong>077 476 6077</strong></p>
                        <p>4. Enter amount: <strong>${formatCurrency(amount)}</strong></p>
                        <p>5. Use your name as reference</p>
                    </div>
                    <div class="form-group">
                        <i class="fas fa-mobile-alt"></i>
                        <input type="tel" name="phoneNumber" placeholder="Your MTN Mobile Number" value="">
                    </div>
                </div>
                
                <div class="payment-details payment-details-bank" style="display: none;">
                    <div style="background: rgba(0, 123, 255, 0.05); border-left: 4px solid #007BFF; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                        <strong>Bank Transfer Details:</strong>
                        <p style="margin-top: 8px;"><strong>Bank:</strong> ${CONFIG.methods.bank.account.bank}</p>
                        <p><strong>Account Name:</strong> ${CONFIG.methods.bank.account.accountName}</p>
                        <p><strong>Account Number:</strong> ${CONFIG.methods.bank.account.accountNumber}</p>
                        <p><strong>Branch:</strong> ${CONFIG.methods.bank.account.branch}</p>
                        <p><strong>SWIFT:</strong> ${CONFIG.methods.bank.account.swift}</p>
                        <p style="margin-top: 12px;"><strong>Reference:</strong> Use your name</p>
                    </div>
                    <div class="form-group">
                        <i class="fas fa-user"></i>
                        <input type="text" name="accountName" placeholder="Your Account Name" value="">
                    </div>
                </div>
            `;
        },

        /**
         * Hide payment modal
         */
        hide() {
            const modal = document.getElementById('paymentModal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
                setTimeout(() => modal.remove(), 300);
            }
        }
    };

    // ===================================================================
    // 📦 EXPORT PUBLIC API
    // ===================================================================
    
    window.Payment = {
        // Core
        config: CONFIG,
        
        // Modules
        calculator: PriceCalculator,
        upload: PaymentProofUpload,
        form: PaymentForm,
        modal: PaymentModal,
        
        // Utilities
        utils: {
            formatCurrency,
            formatPhoneNumber,
            generateTransactionRef,
            validateMobileMoneyNumber,
            formatFileSize
        },
        
        // Version
        version: '2.0.0'
    };

    console.log('✅ Payment module loaded');

})();
