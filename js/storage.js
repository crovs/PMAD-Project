/**
 * Storage Module
 * Handles IndexedDB operations for storing photos and memory data
 */

const Storage = {
    dbName: 'GeoSnapDB',
    dbVersion: 1,
    storeName: 'memories',
    db: null,

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            // Create object store on first run or version upgrade
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Create indexes for querying
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('location', 'location', { unique: false });
                }
            };
        });
    },

    /**
     * Save a memory to the database
     * @param {Object} memory - Memory object with photo, location, timestamp
     */
    async saveMemory(memory) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.add(memory);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all memories from the database
     * @returns {Array} Array of memory objects
     */
    async getAllMemories() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                // Sort by timestamp (newest first)
                const memories = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(memories);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get a single memory by ID
     * @param {number} id - Memory ID
     */
    async getMemory(id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete a memory by ID
     * @param {number} id - Memory ID
     */
    async deleteMemory(id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all memories
     */
    async clearAll() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
