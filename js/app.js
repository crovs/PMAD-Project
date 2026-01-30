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

        // Initialize camera module
        Camera.init();

        // Set up navigation
        this.setupNavigation();

        // Set up camera view handlers
        this.setupCameraView();

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
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetView = button.dataset.view;
                this.switchView(targetView);

                // Update active nav button
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Back button in camera view
        const backBtn = document.getElementById('back-from-camera');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.switchView('feed-view');
                Camera.stop();

                // Update nav buttons
                navButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === 'feed-view');
                });
            });
        }
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

            // Handle view-specific logic
            if (viewId === 'camera-view') {
                Camera.start();
            } else if (viewId === 'map-view') {
                if (!MapView.isInitialized) {
                    MapView.init();
                }
                MapView.loadMemories(this.memories);
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

        // Capture button handler
        if (captureBtn) {
            captureBtn.addEventListener('click', async () => {
                await this.capturePhoto();
            });
        }

        // File input fallback handler
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
     * Capture photo from camera
     */
    async capturePhoto() {
        try {
            Camera.updateStatus('Capturing...');

            // Capture photo
            const photoData = await Camera.capture();

            // Get location
            Camera.updateStatus('Getting location...');
            let locationData = null;

            try {
                locationData = await GeoLocation.getCurrentPosition();
            } catch (error) {
                console.warn('Location unavailable:', error);
                Camera.updateStatus('⚠️ Photo saved without location');
            }

            // Create memory object
            const memory = {
                photo: photoData,
                location: locationData,
                timestamp: Date.now()
            };

            // Save to storage
            await Storage.saveMemory(memory);

            Camera.updateStatus('✅ Memory saved!');

            // Reload memories
            await this.loadMemories();
            this.renderFeed();

            // Switch back to feed view
            setTimeout(() => {
                this.switchView('feed-view');
                Camera.stop();

                // Update nav
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === 'feed-view');
                });
            }, 1000);

        } catch (error) {
            console.error('Capture error:', error);
            Camera.updateStatus('❌ Capture failed');
        }
    },

    /**
     * Handle file upload (fallback for devices without camera)
     */
    async handleFileUpload(file) {
        try {
            // Read file as base64
            const reader = new FileReader();

            reader.onload = async (e) => {
                const photoData = e.target.result;

                Camera.updateStatus('Getting location...');

                // Get location
                let locationData = null;
                try {
                    locationData = await GeoLocation.getCurrentPosition();
                } catch (error) {
                    console.warn('Location unavailable:', error);
                }

                // Create memory object
                const memory = {
                    photo: photoData,
                    location: locationData,
                    timestamp: Date.now()
                };

                // Save to storage
                await Storage.saveMemory(memory);

                Camera.updateStatus('✅ Photo saved!');

                // Reload and switch view
                await this.loadMemories();
                this.renderFeed();

                setTimeout(() => {
                    this.switchView('feed-view');
                    document.querySelectorAll('.nav-btn').forEach(btn => {
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
            console.log(`📚 Loaded ${this.memories.length} memories`);
        } catch (error) {
            console.error('Error loading memories:', error);
            this.memories = [];
        }
    },

    /**
     * Render feed view
     */
    renderFeed() {
        const grid = document.getElementById('memories-grid');
        if (!grid) return;

        // Clear existing content
        grid.innerHTML = '';

        if (this.memories.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>No memories yet</p>
                    <p class="empty-hint">Tap the camera button to capture your first moment!</p>
                </div>
            `;
            return;
        }

        // Create memory cards
        this.memories.forEach(memory => {
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
        const coords = memory.location
            ? `${memory.location.latitude.toFixed(4)}, ${memory.location.longitude.toFixed(4)}`
            : '';

        card.innerHTML = `
            <img src="${memory.photo}" alt="Memory photo">
            <div class="memory-info">
                <div class="memory-location">📍 ${locationName}</div>
                <div class="memory-date">${date}</div>
                ${coords ? `<div class="memory-coords">${coords}</div>` : ''}
            </div>
        `;

        return card;
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

        // Check initial status
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
