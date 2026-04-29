// IndexedDB wrapper for offline storage and sync queue

const DB_NAME = 'fitness_buddy';
const DB_VERSION = 1;
let _db = null;

function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = e => {
            const db = e.target.result;
            ['workouts', 'habits', 'meals', 'users', 'habitlogs'].forEach(name => {
                if (!db.objectStoreNames.contains(name)) {
                    db.createObjectStore(name, { keyPath: 'id' });
                }
            });
            if (!db.objectStoreNames.contains('pending_sync')) {
                const store = db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
                store.createIndex('resource', 'resource', { unique: false });
            }
        };

        req.onsuccess = e => { _db = e.target.result; resolve(_db); };
        req.onerror = () => reject(req.error);
    });
}

function tx(storeName, mode = 'readonly') {
    return openDB().then(db => {
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    });
}

function promisifyRequest(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Get all records from a store
async function localGetAll(storeName) {
    const store = await tx(storeName);
    return promisifyRequest(store.getAll());
}

// Replace all records in a store
async function localSaveAll(storeName, items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
        items.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// Put a single record
async function localPut(storeName, item) {
    const store = await tx(storeName, 'readwrite');
    return promisifyRequest(store.put(item));
}

// Delete a single record
async function localDelete(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    return promisifyRequest(store.delete(id));
}

// Add a pending sync operation
async function addPending(operation) {
    // operation = { resource, method, url, body, localId }
    const store = await tx('pending_sync', 'readwrite');
    return promisifyRequest(store.add({ ...operation, timestamp: Date.now() }));
}

// Get all pending operations
async function getPending() {
    const store = await tx('pending_sync');
    return promisifyRequest(store.getAll());
}

// Remove a pending operation by its auto-generated id
async function removePending(id) {
    const store = await tx('pending_sync', 'readwrite');
    return promisifyRequest(store.delete(id));
}

// Clear all pending operations
async function clearAllPending() {
    const store = await tx('pending_sync', 'readwrite');
    return promisifyRequest(store.clear());
}
