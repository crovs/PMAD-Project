/**
 * UI Module
 * Handles modals, toasts, and UI interactions
 */

const UI = {
    // Modal management
    modals: {},
    currentModal: null,

    // Location picker state
    locationPickerMap: null,
    selectedLocation: null,
    locationCallback: null,

    /**
     * Initialize UI module
     */
    init() {
        this.setupModals();
        this.setupDropZone();
        this.setupToasts();
    },

    /**
     * Setup modal handlers
     */
    setupModals() {
        // Get all modals
        this.modals = {
            upload: document.getElementById('upload-modal'),
            edit: document.getElementById('edit-modal'),
            location: document.getElementById('location-modal')
        };

        // Setup close buttons
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target === element) {
                    this.closeModal();
                }
            });
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal();
            }
        });
    },

    /**
     * Open a modal
     */
    openModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.classList.add('active');
            this.currentModal = modalId;
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Close current modal
     */
    closeModal() {
        if (this.currentModal) {
            const modal = this.modals[this.currentModal];
            if (modal) {
                modal.classList.remove('active');
            }
            this.currentModal = null;
            document.body.style.overflow = '';

            // Reset upload modal
            if (this.currentModal === 'upload') {
                this.resetUploadModal();
            }
        }
    },

    /**
     * Setup drag and drop zone
     */
    setupDropZone() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('upload-file-input');
        const selectBtn = document.getElementById('select-file-btn');

        if (!dropZone || !fileInput || !selectBtn) return;

        // Click to select file
        selectBtn.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('click', (e) => {
            if (e.target === dropZone || e.target.closest('.drop-zone-content')) {
                fileInput.click();
            }
        });

        // Drag and drop handlers
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });
    },

    /**
     * Handle file selection
     */
    handleFileSelection(file) {
        if (!file.type.startsWith('image/')) {
            this.showToast('error', 'Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('drop-zone').classList.add('hidden');
            document.getElementById('upload-preview').classList.remove('hidden');
            document.getElementById('preview-image').src = e.target.result;

            // Store the image data
            this.pendingUpload = {
                photo: e.target.result,
                timestamp: Date.now()
            };
        };
        reader.readAsDataURL(file);
    },

    /**
     * Reset upload modal
     */
    resetUploadModal() {
        document.getElementById('drop-zone').classList.remove('hidden');
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('photo-location').value = '';
        document.getElementById('photo-notes').value = '';
        document.getElementById('upload-file-input').value = '';
        this.pendingUpload = null;
    },

    /**
     * Initialize location picker map
     */
    initLocationPicker(callback) {
        this.locationCallback = callback;

        if (!this.locationPickerMap) {
            this.locationPickerMap = L.map('location-map').setView([48.8566, 2.3522], 3);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.locationPickerMap);

            // Add marker on click
            this.locationPickerMap.on('click', (e) => {
                const { lat, lng } = e.latlng;
                this.setLocationMarker(lat, lng);
            });
        }

        // Refresh map size
        setTimeout(() => {
            this.locationPickerMap.invalidateSize();
        }, 100);
    },

    /**
     * Set location marker on picker map
     */
    setLocationMarker(lat, lng) {
        // Remove existing marker
        if (this.locationMarker) {
            this.locationPickerMap.removeLayer(this.locationMarker);
        }

        // Add new marker
        this.locationMarker = L.marker([lat, lng]).addTo(this.locationPickerMap);
        this.selectedLocation = { latitude: lat, longitude: lng };

        // Try to get location name
        this.geocodeLocation(lat, lng);
    },

    /**
     * Geocode location
     */
    async geocodeLocation(lat, lng) {
        try {
            const locationName = await GeoLocation.reverseGeocode(lat, lng);
            this.selectedLocation.locationName = locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            this.selectedLocation.locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    },

    /**
     * Setup toast notifications
     */
    setupToasts() {
        // Toast container already in HTML
    },

    /**
     * Show toast notification
     */
    showToast(type, message, duration = 3000) {
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? '✅' : '❌';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duration);
    },

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        // Could add a loading overlay here
        console.log('Loading:', message);
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        console.log('Loading complete');
    }
};
