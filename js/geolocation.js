/**
 * ============================================================================
 * GEOLOCATION MODULE - GPS Location Services
 * ============================================================================
 * 
 * What is Geolocation API?
 * - Built-in browser API that accesses device's GPS
 * - Works on phones, tablets, and laptops
 * - Provides accurate coordinates (latitude, longitude)
 * - Requires user permission for privacy
 * 
 * What is Reverse Geocoding?
 * - Converting coordinates (40.7128, -74.0060) into readable address
 * - Example: "New York, USA" instead of numbers
 * - We use OpenStreetMap's free Nominatim API for this
 * 
 * This is ONE OF TWO native device features for PMAD requirement!
 * (The other is Camera API)
 */

const GeoLocation = {
    requesting: false,  // Flag to prevent simultaneous requests

    // ========================================================================
    // GET CURRENT POSITION - Main function to get user's location
    // ========================================================================
    /**
     * Gets the user's current GPS location and converts it to a readable address
     * 
     * Flow:
     * 1. Ask browser for GPS permission
     * 2. Get latitude and longitude coordinates
     * 3. Try to convert coordinates to city/country name
     * 4. Return both coordinates and readable name
     * 
     * @returns {Promise<Object>} Location object
     * @example
     * {
     *   latitude: 40.7128,
     *   longitude: -74.0060,
     *   locationName: "New York, USA",
     *   accuracy: 10 (meters)
     * }
     */
    async getCurrentPosition() {
        // Prevent duplicate simultaneous requests
        if (this.requesting) {
            console.log('⚠️ Location request already in progress, please wait...');
            throw new Error('Location request already in progress');
        }

        this.requesting = true;

        try {
            // ===== Check if browser supports Geolocation =====
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by your browser');
            }

            console.log('📍 Requesting location permission...');

            return await new Promise((resolve, reject) => {
                let resolved = false;  // Flag to prevent duplicate resolve/reject

                // ===== Request GPS position from browser =====
                // This triggers a permission prompt: "Allow GeoSnap to access your location?"
                navigator.geolocation.getCurrentPosition(
                    // ===== SUCCESS CALLBACK - Got the coordinates! =====
                    async (position) => {
                        if (resolved) return;  // Prevent duplicate callbacks (browser quirk)
                        resolved = true;

                        // Extract coordinates from the position object
                        const { latitude, longitude } = position.coords;

                        console.log(`✅ GPS coordinates: ${latitude}, ${longitude}`);

                        // Start with coordinates as fallback (in case geocoding fails)
                        let locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                        // ===== Try to get human-readable address =====
                        try {
                            console.log('🌍 Converting coordinates to address...');
                            const name = await this.reverseGeocode(latitude, longitude);

                            if (name) {
                                locationName = name;  // Use readable name if successful
                                console.log(`✅ Location: ${locationName}`);
                            }
                        } catch (error) {
                            // Reverse geocoding failed (maybe offline or API error)
                            // That's okay, we'll just use coordinates
                            console.log('⚠️ Reverse geocoding failed, using coordinates:', error);
                        }

                        // Return the complete location data
                        resolve({
                            latitude,
                            longitude,
                            locationName,
                            accuracy: position.coords.accuracy  // How accurate the GPS reading is (in meters)
                        });
                    },

                    // ===== ERROR CALLBACK - Something went wrong =====
                    (error) => {
                        if (resolved) {
                            // Ignore errors if we already got success (browser quirk - sometimes both callbacks fire)
                            console.log('ℹ️ Ignoring error after successful location retrieval');
                            return;
                        }
                        resolved = true;

                        let errorMessage = 'Unable to retrieve your location';

                        // Provide specific error messages based on error type
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                // User clicked "Don't Allow"
                                errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                                console.error('❌ User denied location permission');
                                break;

                            case error.POSITION_UNAVAILABLE:
                                // GPS hardware issue or no signal
                                errorMessage = 'Location information unavailable. Are you indoors or in an area with poor GPS signal?';
                                console.error('❌ Position unavailable');
                                break;

                            case error.TIMEOUT:
                                // Took too long to get GPS fix
                                errorMessage = 'Location request timed out. Try again?';
                                console.error('❌ Location request timeout');
                                break;

                            default:
                                console.error('❌ Unknown location error:', error);
                        }

                        this.requesting = false;  // Reset flag on error
                        reject(new Error(errorMessage));
                    },

                    // ===== POSITION OPTIONS - Configuration for GPS =====
                    {
                        enableHighAccuracy: true,  // Use GPS (not just WiFi/cell tower triangulation)
                        // More accurate but uses more battery
                        timeout: 10000,            // Wait max 10 seconds for GPS fix
                        maximumAge: 0              // Don't use cached location, get fresh coordinates
                        // Set to 0 to ensure always getting current location
                    }
                );
            });
        } finally {
            // Always reset the flag when done
            this.requesting = false;
        }
    },

    // ========================================================================
    // REVERSE GEOCODING - Convert coordinates to readable address
    // ========================================================================
    /**
     * Converts GPS coordinates to a human-readable address
     * Uses OpenStreetMap's Nominatim API (free, no API key needed!)
     * 
     * @param {number} latitude - GPS latitude (-90 to 90)
     * @param {number} longitude - GPS longitude (-180 to 180)
     * @returns {Promise<string>} Readable location name
     * @example
     * reverseGeocode(40.7128, -74.0060) => "New York, United States"
     */
    async reverseGeocode(latitude, longitude) {
        try {
            // Build the API URL with our coordinates
            // format=json means we want JSON response
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

            console.log('🌐 Calling geocoding API...');

            // Make the API request
            // Note: This requires internet connection!
            const response = await fetch(url, {
                headers: {
                    // Nominatim requires a User-Agent header (good practice anyway)
                    'User-Agent': 'GeoSnap PWA'
                }
            });

            // Check if request was successful
            if (!response.ok) {
                throw new Error(`Geocoding API error: ${response.status}`);
            }

            // Parse the JSON response
            const data = await response.json();

            // ===== Extract human-readable location from response =====
            // API returns detailed address components, we pick the most relevant ones

            if (!data.address) {
                console.warn('⚠️ No address data in geocoding response');
                return null;
            }

            const address = data.address;

            // Try to build a nice location string
            // Priority: City > State > Country
            const city = address.city || address.town || address.village || address.municipality;
            const state = address.state || address.region;
            const country = address.country;

            // Build location string based on what we have
            let locationName = '';

            if (city) {
                locationName = city;
                if (country && country !== city) {
                    locationName += `, ${country}`;
                }
            } else if (state) {
                locationName = state;
                if (country) {
                    locationName += `, ${country}`;
                }
            } else if (country) {
                locationName = country;
            }

            return locationName || null;

        } catch (error) {
            // Reverse geocoding failed (offline, API down, etc.)
            console.error('❌ Reverse geocoding error:', error);
            return null;  // Return null, caller will use coordinates as fallback
        }
    },

    // ========================================================================
    // CHECK PERMISSION STATUS - See if we have location permission
    // ========================================================================
    /**
     * Checks if the app has permission to use geolocation
     * Note: Not all browsers support the Permissions API
     * 
     * @returns {Promise<string>} Permission state: 'granted', 'denied', or 'prompt'
     */
    async checkPermission() {
        try {
            // Check if browser supports Permissions API
            if (!navigator.permissions) {
                return 'unknown';
            }

            // Query the geolocation permission status
            const result = await navigator.permissions.query({ name: 'geolocation' });

            console.log(`📍 Location permission status: ${result.state}`);

            // Possible states:
            // - 'granted': User has allowed location access
            // - 'denied': User has blocked location access
            // - 'prompt': User hasn't decided yet (will be asked on next request)

            return result.state;

        } catch (error) {
            console.log('ℹ️ Permission API not supported');
            return 'unknown';
        }
    },

    // ========================================================================
    // WATCH POSITION - Continuously track user's location (future feature)
    // ========================================================================
    /**
     * Starts watching the user's position and calls a callback whenever it changes
     * Useful for: Live location tracking, creating a route/path
     * Not implemented yet, but here's how you would do it:
     * 
     * @param {Function} callback - Called with new position each time location changes
     * @returns {number} Watch ID (use to stop watching later)
     */
    watchPosition(callback) {
        // This would continuously track position
        // Useful if you wanted to draw a path of where the user has been

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                // New position available!
                callback({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                });
            },
            (error) => {
                console.error('Watch position error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        return watchId;  // Save this to stop watching later
    },

    /**
     * Stops watching position
     * @param {number} watchId - The ID returned from watchPosition()
     */
    clearWatch(watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
};

// ============================================================================
// FOR PRESENTATION - KEY POINTS
// ============================================================================
/**
 * EXPLAIN TO YOUR TEACHER:
 * 
 * 1. Native Device Feature #2 (PMAD requirement!)
 *    - Uses browser's Geolocation API
 *    - Accesses device GPS hardware
 *    - Works on phones, tablets, laptops
 * 
 * 2. How it works:
 *    - Browser asks user for permission
 *    - Gets GPS coordinates (latitude, longitude)
 *    - Converts coordinates to readable address using API
 * 
 * 3. Privacy & Security:
 *    - Requires explicit user permission
 *    - Only works on HTTPS (Netlify provides this)
 *    - User can deny or revoke permission anytime
 * 
 * 4. Reverse Geocoding:
 *    - Turns "40.7128, -74.0060" into "New York, USA"
 *    - Uses free OpenStreetMap Nominatim API
 *    - Needs internet, but we handle offline gracefully
 * 
 * 5. Accuracy:
 *    - enableHighAccuracy: true = uses GPS (10-20m accuracy)
 *    - If GPS unavailable, falls back to WiFi/cell towers (50-500m)
 *    - Best accuracy outdoors with clear sky view
 * 
 * DEMO TIPS:
 * - Show permission dialog when accessing location
 * - Explain it works offline (coordinates) but needs online for address
 * - Point out accuracy varies (better outdoors)
 */
