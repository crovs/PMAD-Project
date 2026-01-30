/**
 * Geolocation Module
 * Handles device geolocation and reverse geocoding
 */

const GeoLocation = {
    /**
     * Get current position
     * @returns {Object} Position object with coords and location name
     */
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    // Try to get location name via reverse geocoding
                    let locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                    try {
                        const name = await this.reverseGeocode(latitude, longitude);
                        if (name) {
                            locationName = name;
                        }
                    } catch (error) {
                        console.log('Reverse geocoding failed, using coordinates:', error);
                    }

                    resolve({
                        latitude,
                        longitude,
                        locationName,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    let errorMessage = 'Unable to retrieve your location';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out';
                            break;
                    }

                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    },

    /**
     * Reverse geocode coordinates to location name
     * Uses Nominatim (OpenStreetMap) API - free and no API key required
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {string} Location name
     */
    async reverseGeocode(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'GeoSnap-PWA'
                }
            });

            if (!response.ok) {
                throw new Error('Geocoding request failed');
            }

            const data = await response.json();

            // Extract meaningful location name
            const address = data.address;
            let locationName = '';

            if (address.city || address.town || address.village) {
                locationName = address.city || address.town || address.village;

                if (address.country) {
                    locationName += `, ${address.country}`;
                }
            } else if (address.country) {
                locationName = address.country;
            } else {
                locationName = data.display_name?.split(',').slice(0, 2).join(',') || null;
            }

            return locationName;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return null;
        }
    },

    /**
     * Request location permission
     */
    async requestPermission() {
        try {
            const position = await this.getCurrentPosition();
            return true;
        } catch (error) {
            console.error('Location permission error:', error);
            return false;
        }
    }
};
