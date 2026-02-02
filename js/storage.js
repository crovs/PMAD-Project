/**
 * ============================================================================
 * STORAGE MODULE - IndexedDB Database Management
 * ============================================================================
 * 
 * What is IndexedDB?
 * - A built-in browser database (like a mini SQL database in the browser)
 * - Stores data permanently (even after closing browser)
 * - Much more powerful than localStorage (can store images, large data)
 * - Works offline!
 * 
 * Why use IndexedDB instead of localStorage?
 * - localStorage: Only stores small text (max ~5MB)
 * - IndexedDB: Can store GBs of data including images!
 * - Perfect for storing photos with their metadata
 * 
 * My Database Structure:
 * Database: "GeoSnapDB"
 *   └─ Object Store: "memories" (like a table in SQL)
 *       ├─ id (primary key, auto-incremented)
 *       ├─ photo (base64 image data)
 *       ├─ location { latitude, longitude, locationName }
 *       ├─ timestamp (when photo was taken)
 *       └─ notes (optional description)
 */

const Storage = {
    dbName: 'GeoSnapDB',        // Database name
    dbVersion: 1,               // Database version (increment this to trigger upgrades)
    storeName: 'memories',      // Object store name (like a table)
    db: null,                   // Will hold the database connection

    // ========================================================================
    // INIT - Initialize the database connection
    // ========================================================================
    /**
     * Opens the IndexedDB database and creates the object store if needed
     * This runs once when the app first starts
     * 
     * @returns {Promise} Resolves when database is ready
     */
    async init() {
        return new Promise((resolve, reject) => {
            // Request to open database (creates it if doesn't exist)
            const request = indexedDB.open(this.dbName, this.dbVersion);

            // ===== Error handling =====
            request.onerror = () => {
                console.error('❌ Database failed to open');
                reject(request.error);
            };

            // ===== Success - database opened =====
            request.onsuccess = () => {
                this.db = request.result;  // Save the database connection
                console.log('✅ Database opened successfully');
                resolve(this.db);
            };

            // ===== Upgrade needed - first time or version changed =====
            // This is where we create the database structure
            request.onupgradeneeded = (event) => {
                console.log('🔧 Creating database structure...');

                const db = event.target.result;

                // Check if 'memories' object store exists
                if (!db.objectStoreNames.contains(this.storeName)) {
                    // Create the object store (like CREATE TABLE in SQL)
                    const objectStore = db.createObjectStore(this.storeName, {
                        keyPath: 'id',           // Primary key field
                        autoIncrement: true      // Auto-generate IDs (1, 2, 3, ...)
                    });

                    // Create indexes for faster searching (like INDEX in SQL)
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('location', 'location', { unique: false });

                    console.log('✅ Database structure created');
                }
            };
        });
    },

    // ========================================================================
    // SAVE MEMORY - Store a new photo with its data
    // ========================================================================
    /**
     * Saves a memory object to the database
     * 
     * @param {Object} memory - Object containing photo, location, timestamp, notes
     * @example
     * {
     *   photo: "data:image/jpeg;base64,...",
     *   location: { latitude: 40.7128, longitude: -74.0060, locationName: "New York" },
     *   timestamp: 1234567890,
     *   notes: "Great day in NYC!"
     * }
     * 
     * @returns {Promise<number>} The ID of the saved memory
     */
    async saveMemory(memory) {
        if (!this.db) await this.init();  // Make sure database is initialized

        return new Promise((resolve, reject) => {
            // Start a "readwrite" transaction (like BEGIN TRANSACTION in SQL)
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            // Add the memory to the database (like INSERT in SQL)
            const request = objectStore.add(memory);

            // Handle success
            request.onsuccess = () => {
                console.log('✅ Memory saved with ID:', request.result);
                resolve(request.result);  // Returns the auto-generated ID
            };

            // Handle errors
            request.onerror = () => {
                console.error('❌ Failed to save memory');
                reject(request.error);
            };
        });
    },

    // ========================================================================
    // GET ALL MEMORIES - Retrieve all photos from database
    // ========================================================================
    /**
     * Gets all memories from the database, sorted by newest first
     * 
     * @returns {Promise<Array>} Array of memory objects
     */
    async getAllMemories() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            // Start a "readonly" transaction (we're only reading, not changing data)
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);

            // Get all records (like SELECT * FROM memories in SQL)
            const request = objectStore.getAll();

            request.onsuccess = () => {
                // Sort by timestamp, newest first (most recent photos on top)
                const memories = request.result.sort((a, b) => b.timestamp - a.timestamp);
                console.log(`📚 Loaded ${memories.length} memories from database`);
                resolve(memories);
            };

            request.onerror = () => {
                console.error('❌ Failed to load memories');
                reject(request.error);
            };
        });
    },

    // ========================================================================
    // GET SINGLE MEMORY - Retrieve one specific photo by ID
    // ========================================================================
    /**
     * Gets a single memory by its ID
     * 
     * @param {number} id - The memory ID
     * @returns {Promise<Object>} The memory object
     */
    async getMemory(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);

            // Get specific record (like SELECT * FROM memories WHERE id = ?)
            const request = objectStore.get(id);

            request.onsuccess = () => {
                if (request.result) {
                    console.log('✅ Memory found:', id);
                } else {
                    console.warn('⚠️ Memory not found:', id);
                }
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('❌ Failed to get memory');
                reject(request.error);
            };
        });
    },

    // ========================================================================
    // UPDATE MEMORY - Edit an existing photo's details
    // ========================================================================
    /**
     * Updates an existing memory
     * Used when user edits location or notes
     * 
     * @param {Object} memory - Memory object with id property
     * @returns {Promise<number>} The ID of the updated memory
     */
    async updateMemory(memory) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            // Update the record (like UPDATE memories SET ... WHERE id = ?)
            const request = objectStore.put(memory);

            request.onsuccess = () => {
                console.log('✅ Memory updated:', request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('❌ Failed to update memory');
                reject(request.error);
            };
        });
    },

    // ========================================================================
    // DELETE MEMORY - Remove a photo from database
    // ========================================================================
    /**
     * Deletes a memory from the database
     * 
     * @param {number} id - The memory ID to delete
     * @returns {Promise<void>}
     */
    async deleteMemory(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            // Delete the record (like DELETE FROM memories WHERE id = ?)
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('✅ Memory deleted:', id);
                resolve();
            };

            request.onerror = () => {
                console.error('❌ Failed to delete memory');
                reject(request.error);
            };
        });
    },

    // ========================================================================
    // EXPORT DATA - Create JSON backup of all memories
    // ========================================================================
    /**
     * Exports all memories as JSON for backup or migration
     * User can download this file to save their data
     * 
     * @returns {Promise<string>} JSON string of all data
     */
    async exportData() {
        const memories = await this.getAllMemories();

        // Create a nice structured export with metadata
        const data = {
            exportDate: new Date().toISOString(),  // When this export was created
            appName: 'GeoSnap',
            version: '1.0',
            totalMemories: memories.length,
            memories: memories
        };

        // Convert to pretty-printed JSON (2 spaces indentation)
        return JSON.stringify(data, null, 2);
    },

    // ========================================================================
    // CLEAR ALL - Delete all memories (use with caution!)
    // ========================================================================
    /**
     * Deletes ALL memories from the database
     * ⚠️ This is permanent and cannot be undone!
     * 
     * @returns {Promise<void>}
     */
    async clearAll() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            // Clear all records (like TRUNCATE TABLE in SQL)
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('✅ All memories cleared');
                resolve();
            };

            request.onerror = () => {
                console.error('❌ Failed to clear memories');
                reject(request.error);
            };
        });
    }
};

// ============================================================================
// FOR PRESENTATION - KEY POINTS
// ============================================================================
/**
 * 
 * 1. Why IndexedDB?
 *    - Stores photos permanently in browser (even after closing)
 *    - Can handle large data (unlike localStorage)
 *    - Works offline - no server needed!
 *    - Total privacy - data never leaves user's device
 * 
 * 2. Database Structure:
 *    - One database called "GeoSnapDB"
 *    - One object store called "memories" (like a table)
 *    - Each memory has: id, photo, location, timestamp, notes
 * 
 * 3. Main Operations (CRUD):
 *    - CREATE: saveMemory() - add new photo
 *    - READ: getAllMemories() - load photos for feed
 *    - UPDATE: updateMemory() - edit location/notes
 *    - DELETE: deleteMemory() - remove photo
 * 
 * 4. Why it's important :
 *    - Enables offline functionality (requirement!)
 *    - Persistent storage (data doesn't disappear)
 *    - Privacy-first (no cloud dependency)
 */
