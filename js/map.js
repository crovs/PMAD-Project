/**
 * Map Module
 * Handles interactive map display with Leaflet.js
 */

const MapView = {
    map: null,
    markers: [],
    isInitialized: false,

    /**
     * Initialize the map
     */
    init() {
        if (this.isInitialized) return;

        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        // Create map centered on Europe (will adjust to markers later)
        this.map = L.map('map-container').setView([48.8566, 2.3522], 3);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        this.isInitialized = true;
    },

    /**
     * Load all memories onto the map
     * @param {Array} memories - Array of memory objects
     */
    async loadMemories(memories) {
        if (!this.isInitialized) this.init();

        // Clear existing markers
        this.clearMarkers();

        if (!memories || memories.length === 0) {
            this.updateStatus('No geotagged photos yet');
            return;
        }

        const markerBounds = [];

        // Add markers for each memory with location
        memories.forEach(memory => {
            if (memory.location && memory.location.latitude && memory.location.longitude) {
                const { latitude, longitude } = memory.location;

                // Create marker
                const marker = L.marker([latitude, longitude]).addTo(this.map);

                // Create popup content
                const popupContent = this.createPopupContent(memory);
                marker.bindPopup(popupContent);

                this.markers.push(marker);
                markerBounds.push([latitude, longitude]);
            }
        });

        // Fit map to show all markers
        if (markerBounds.length > 0) {
            this.map.fitBounds(markerBounds, { padding: [50, 50] });
            this.updateStatus(`Showing ${markerBounds.length} location${markerBounds.length > 1 ? 's' : ''}`);
        } else {
            this.updateStatus('No geotagged photos yet');
        }
    },

    /**
     * Create popup content HTML for a memory
     * @param {Object} memory - Memory object
     * @returns {string} HTML string
     */
    createPopupContent(memory) {
        const date = new Date(memory.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="map-popup-content">
                <img src="${memory.photo}" alt="Memory photo">
                <div class="map-popup-location">📍 ${memory.location.locationName || 'Unknown Location'}</div>
                <div class="map-popup-date">${date}</div>
            </div>
        `;
    },

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    },

    /**
     * Update map status message
     */
    updateStatus(message) {
        const statusElement = document.getElementById('map-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.display = message ? 'block' : 'none';

            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (statusElement.textContent === message) {
                    statusElement.style.display = 'none';
                }
            }, 3000);
        }
    },

    /**
     * Refresh map size (call after showing/hiding)
     */
    refresh() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
};
