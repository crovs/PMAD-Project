/**
 * Camera Module
 * Handles device camera access and photo capture
 */

const Camera = {
    stream: null,
    videoElement: null,
    canvasElement: null,
    isActive: false,

    /**
     * Initialize camera elements
     */
    init() {
        this.videoElement = document.getElementById('camera-preview');
        this.canvasElement = document.getElementById('camera-canvas');
    },

    /**
     * Start camera stream
     */
    async start() {
        if (this.isActive) return;

        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            if (!this.videoElement) this.init();

            // Attach stream to video element
            this.videoElement.srcObject = this.stream;
            this.isActive = true;

            this.updateStatus('Camera ready');
            return true;
        } catch (error) {
            console.error('Camera access error:', error);
            this.handleCameraError(error);
            return false;
        }
    },

    /**
     * Stop camera stream
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.isActive = false;

            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
        }
    },

    /**
     * Capture photo from video stream
     * @returns {string} Base64 encoded image
     */
    async capture() {
        if (!this.isActive || !this.videoElement || !this.canvasElement) {
            throw new Error('Camera is not active');
        }

        // Set canvas dimensions to match video
        const videoWidth = this.videoElement.videoWidth;
        const videoHeight = this.videoElement.videoHeight;

        this.canvasElement.width = videoWidth;
        this.canvasElement.height = videoHeight;

        // Draw current video frame to canvas
        const context = this.canvasElement.getContext('2d');
        context.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);

        // Convert canvas to base64 image
        const imageData = this.canvasElement.toDataURL('image/jpeg', 0.8);

        return imageData;
    },

    /**
     * Handle camera errors
     */
    handleCameraError(error) {
        let message = 'Camera access failed';

        if (error.name === 'NotAllowedError') {
            message = 'Camera permission denied. Please enable camera access in settings.';
        } else if (error.name === 'NotFoundError') {
            message = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            message = 'Camera is already in use by another application.';
        }

        this.updateStatus(message);

        // Show file input as fallback
        this.showFileInputFallback();
    },

    /**
     * Show file input as fallback when camera is unavailable
     */
    showFileInputFallback() {
        const fileInput = document.getElementById('file-input');
        const captureBtn = document.getElementById('capture-btn');

        if (fileInput && captureBtn) {
            // Change capture button to trigger file input
            captureBtn.onclick = () => fileInput.click();
            this.updateStatus('Tap to select a photo from your device');
        }
    },

    /**
     * Update camera status message
     */
    updateStatus(message) {
        const statusElement = document.getElementById('camera-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.display = message ? 'block' : 'none';
        }
    },

    /**
     * Request camera permission
     */
    async requestPermission() {
        try {
            await this.start();
            this.stop();
            return true;
        } catch (error) {
            return false;
        }
    }
};
