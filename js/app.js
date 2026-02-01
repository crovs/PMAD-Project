/**
 * Main App Logic
 * Handles app initialization, navigation, and coordination between modules
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    await App.init();
});

const App = {
    currentView: 'feed-view',
    memories: [],
    filteredMemories: [],
    currentEditId: null,
    searchQuery: '',
    sortOrder: 'newest',

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 GeoSnap initializing...');

        // Initialize storage
        try {
            await Storage.init();
            console.log('✅ Storage initialized');
        } catch (error) {
            console.error('❌ Storage initialization failed:', error);
        }

        // Initialize UI module
        UI.init();

        // Initialize camera module
        Camera.init();

        // Set up navigation
        this.setupNavigation();

        // Set up camera view handlers
        this.setupCameraView();

        // Set up upload handlers
        this.setupUploadHandlers();

        // Set up search and filter
        this.setupSearchAndFilter();

        // Set up export
        this.setupExport();

        // Set up offline detection
        this.setupOfflineDetection();

        // Register Service Worker
        this.registerServiceWorker();

        // Load initial data
        await this.loadMemories();
        this.renderFeed();

        console.log('✅ GeoSnap ready!');
    },

    /**
     * Set up view navigation
     */
    setupNavigation() {
        // Desktop sidebar navigation
        document.querySelectorAll('.nav-item').forEach(button => {
            button.addEventListener('click', () => {
                const targetView = button.dataset.view;
                this.switchView(targetView);

                // Update active state
                document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Mobile bottom navigation
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.addEventListener('click', () => {
                const targetView = button.dataset.view;
                this.switchView(targetView);

                // Update active state
                document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    },

    /**
     * Switch between views
     */
    switchView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;

            // Update header title
            const titles = {
                'feed-view': 'My Memories',
                'camera-view': 'Take Photo',
                'map-view': 'Map View'
            };
            document.getElementById('view-title').textContent = titles[viewId] || 'GeoSnap';

            // Handle view-specific logic
            if (viewId === 'camera-view') {
                Camera.start();
            } else if (viewId === 'map-view') {
                if (!MapView.isInitialized) {
                    MapView.init();
                }
                MapView.loadMemories(this.filteredMemories.length > 0 ? this.filteredMemories : this.memories);
                MapView.refresh();
            } else if (viewId === 'feed-view') {
                Camera.stop();
            }
        }
    },

    /**
     * Set up camera view handlers
     */
    setupCameraView() {
        const captureBtn = document.getElementById('capture-btn');
        const fileInput = document.getElementById('file-input');

        if (captureBtn) {
            captureBtn.addEventListener('click', async () => {
                await this.capturePhoto();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    await this.handleFileUpload(file);
                }
            });
        }
    },

    /**
     * Set up upload modal handlers
     */
    setupUploadHandlers() {
        // Open upload modal
        document.getElementById('upload-btn').addEventListener('click', () => {
            UI.openModal('upload');
        });

        document.getElementById('mobile-upload-btn').addEventListener('click', () => {
            UI.openModal('upload');
        });

        // Use current location button
        document.getElementById('use-current-location').addEventListener('click', async () => {
            try {
                UI.showToast('success', 'Getting your location...');
                const location = await GeoLocation.getCurrentPosition();
                document.getElementById('photo-location').value = location.locationName;
                UI.pendingUpload.location = location;
            } catch (error) {
                UI.showToast('error', 'Could not get location: ' + error.message);
            }
        });

        // Pick on map button
        document.getElementById('pick-on-map').addEventListener('click', () => {
            UI.openModal('location');
            UI.initLocationPicker((location) => {
                document.getElementById('photo-location').value = location.locationName;
                UI.pendingUpload.location = location;
            });
        });

        // Confirm location picker
        document.getElementById('confirm-location').addEventListener('click', () => {
            if (UI.selectedLocation && UI.locationCallback) {
                UI.locationCallback(UI.selectedLocation);
                UI.closeModal();
                setTimeout(() => UI.openModal('upload'), 100);
            }
        });

        document.getElementById('cancel-location').addEventListener('click', () => {
            UI.closeModal();
            setTimeout(() => UI.openModal('upload'), 100);
        });

        // Save upload button
        document.getElementById('save-upload').addEventListener('click', async () => {
            await this.saveUpload();
        });

        // Cancel upload button
        document.getElementById('cancel-upload').addEventListener('click', () => {
            UI.closeModal();
        });
    },

    /**
     * Save uploaded photo
     */
    async saveUpload() {
        if (!UI.pendingUpload) return;

        const locationInput = document.getElementById('photo-location').value.trim();
        const notes = document.getElementById('photo-notes').value.trim();

        // Create memory object
        const memory = {
            photo: UI.pendingUpload.photo,
            location: UI.pendingUpload.location || (locationInput ? { locationName: locationInput } : null),
            notes: notes || null,
            timestamp: UI.pendingUpload.timestamp
        };

        try {
            await Storage.saveMemory(memory);
            UI.showToast('success', 'Photo saved successfully! 📸');
            UI.closeModal();

            // Reload and display
            await this.loadMemories();
            this.renderFeed();

            // Switch to feed view
            this.switchView('feed-view');
            document.querySelectorAll('.nav-item, .nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === 'feed-view');
            });
        } catch (error) {
            console.error('Save error:', error);
            UI.showToast('error', 'Failed to save photo');
        }
    },

    /**
     * Capture photo from camera
     */
    async capturePhoto() {
        try {
            Camera.updateStatus('Capturing...');

            const photoData = await Camera.capture();

            Camera.updateStatus('Getting location...');
            let locationData = null;

            try {
                locationData = await GeoLocation.getCurrentPosition();
            } catch (error) {
                console.warn('Location unavailable:', error);
                Camera.updateStatus('⚠️ Photo saved without location');
            }

            const memory = {
                photo: photoData,
                location: locationData,
                timestamp: Date.now()
            };

            await Storage.saveMemory(memory);

            Camera.updateStatus('✅ Memory saved!');

            await this.loadMemories();
            this.renderFeed();

            setTimeout(() => {
                this.switchView('feed-view');
                Camera.stop();

                document.querySelectorAll('.nav-item, .nav-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === 'feed-view');
                });
            }, 1000);

        } catch (error) {
            console.error('Capture error:', error);
            Camera.updateStatus('❌ Capture failed');
        }
    },

    /**
     * Handle file upload fallback
     */
    async handleFileUpload(file) {
        try {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const photoData = e.target.result;

                Camera.updateStatus('Getting location...');

                let locationData = null;
                try {
                    locationData = await GeoLocation.getCurrentPosition();
                } catch (error) {
                    console.warn('Location unavailable:', error);
                }

                const memory = {
                    photo: photoData,
                    location: locationData,
                    timestamp: Date.now()
                };

                await Storage.saveMemory(memory);

                Camera.updateStatus('✅ Photo saved!');

                await this.loadMemories();
                this.renderFeed();

                setTimeout(() => {
                    this.switchView('feed-view');
                    document.querySelectorAll('.nav-item, .nav-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.view === 'feed-view');
                    });
                }, 1000);
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('File upload error:', error);
            Camera.updateStatus('❌ Upload failed');
        }
    },

    /**
     * Load all memories from storage
     */
    async loadMemories() {
        try {
            this.memories = await Storage.getAllMemories();
            this.filteredMemories = [...this.memories];
            console.log(`📚 Loaded ${this.memories.length} memories`);
        } catch (error) {
            console.error('Error loading memories:', error);
            this.memories = [];
            this.filteredMemories = [];
        }
    },

    /**
     * Render feed view
     */
    renderFeed() {
        const grid = document.getElementById('memories-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const memoriesToShow = this.filteredMemories.length > 0 ? this.filteredMemories : this.memories;

        if (memoriesToShow.length === 0) {
            if (this.searchQuery) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3>No results found</h3>
                        <p>Try a different search term</p>
                    </div>
                `;
            } else {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📸</div>
                        <h3>No memories yet</h3>
                        <p>Start capturing your moments by taking a photo or uploading from your gallery!</p>
                        <button class="btn-primary" onclick="document.getElementById('upload-btn').click()">
                            Upload Your First Photo
                        </button>
                    </div>
                `;
            }
            return;
        }

        memoriesToShow.forEach(memory => {
            const card = this.createMemoryCard(memory);
            grid.appendChild(card);
        });
    },

    /**
     * Create memory card element
     */
    createMemoryCard(memory) {
        const card = document.createElement('div');
        card.className = 'memory-card';

        const date = new Date(memory.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const locationName = memory.location?.locationName || 'Location unavailable';
        // Only show coordinates if we have actual GPS data
        const coords = (memory.location && memory.location.latitude !== undefined && memory.location.longitude !== undefined)
            ? `${memory.location.latitude.toFixed(4)}, ${memory.location.longitude.toFixed(4)}`
            : '';
        const notes = memory.notes || '';

        card.innerHTML = `
            <img src="${memory.photo}" alt="Memory photo">
            <div class="memory-info">
                <div class="memory-location">📍 ${locationName}</div>
                <div class="memory-date">${date}</div>
                ${notes ? `<div class="memory-notes">${notes}</div>` : ''}
                ${coords ? `<div class="memory-coords">${coords}</div>` : ''}
            </div>
        `;

        // Click to edit
        card.addEventListener('click', () => {
            this.openEditModal(memory);
        });

        return card;
    },

    /**
     * Open edit modal
     */
    openEditModal(memory) {
        this.currentEditId = memory.id;

        document.getElementById('edit-image').src = memory.photo;
        document.getElementById('edit-location').value = memory.location?.locationName || '';
        document.getElementById('edit-notes').value = memory.notes || '';

        UI.openModal('edit');
    },

    /**
     * Setup search and filter
     */
    setupSearchAndFilter() {
        const searchInput = document.getElementById('search-input');
        const sortSelect = document.getElementById('sort-select');

        // Search
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Sort
        sortSelect.addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.applyFilters();
        });

        // Save edit
        document.getElementById('save-edit').addEventListener('click', async () => {
            await this.saveEdit();
        });

        // Delete photo
        document.getElementById('delete-photo').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this memory? This cannot be undone.')) {
                await this.deletePhoto();
            }
        });
    },

    /**
     * Apply search and filter
     */
    applyFilters() {
        let filtered = [...this.memories];

        // Search filter
        if (this.searchQuery) {
            filtered = filtered.filter(memory => {
                const location = memory.location?.locationName?.toLowerCase() || '';
                const notes = memory.notes?.toLowerCase() || '';
                return location.includes(this.searchQuery) || notes.includes(this.searchQuery);
            });
        }

        // Sort
        if (this.sortOrder === 'newest') {
            filtered.sort((a, b) => b.timestamp - a.timestamp);
        } else if (this.sortOrder === 'oldest') {
            filtered.sort((a, b) => a.timestamp - b.timestamp);
        } else if (this.sortOrder === 'location') {
            filtered.sort((a, b) => {
                const locA = a.location?.locationName || '';
                const locB = b.location?.locationName || '';
                return locA.localeCompare(locB);
            });
        }

        this.filteredMemories = filtered;
        this.renderFeed();
    },

    /**
     * Save edited memory
     */
    async saveEdit() {
        if (!this.currentEditId) return;

        try {
            const memory = await Storage.getMemory(this.currentEditId);

            const newLocation = document.getElementById('edit-location').value.trim();
            const newNotes = document.getElementById('edit-notes').value.trim();

            memory.location = memory.location || {};
            memory.location.locationName = newLocation;
            memory.notes = newNotes;

            await Storage.updateMemory(memory);

            UI.showToast('success', 'Changes saved! ✅');
            UI.closeModal();

            await this.loadMemories();
            this.applyFilters();
        } catch (error) {
            console.error('Edit error:', error);
            UI.showToast('error', 'Failed to save changes');
        }
    },

    /**
     * Delete photo
     */
    async deletePhoto() {
        if (!this.currentEditId) return;

        try {
            await Storage.deleteMemory(this.currentEditId);

            UI.showToast('success', 'Memory deleted');
            UI.closeModal();

            await this.loadMemories();
            this.applyFilters();
        } catch (error) {
            console.error('Delete error:', error);
            UI.showToast('error', 'Failed to delete memory');
        }
    },

    /**
     * Setup export functionality
     */
    setupExport() {
        document.getElementById('export-btn').addEventListener('click', async () => {
            try {
                const jsonData = await Storage.exportData();

                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `geosnap-export-${Date.now()}.json`;
                a.click();

                URL.revokeObjectURL(url);

                UI.showToast('success', 'Data exported successfully! 💾');
            } catch (error) {
                console.error('Export error:', error);
                UI.showToast('error', 'Failed to export data');
            }
        });
    },

    /**
     * Set up offline detection
     */
    setupOfflineDetection() {
        const offlineIndicator = document.getElementById('offline-indicator');

        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                offlineIndicator.classList.add('hidden');
            } else {
                offlineIndicator.classList.remove('hidden');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        updateOnlineStatus();
    },

    /**
     * Register Service Worker for PWA functionality
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration.scope);
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }
};
