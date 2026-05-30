// Minimal IndexedDB wrapper. Shared by the local stores, command bus, and
// offline sync queue.
//
// The database name is namespaced per logged-in user (fitnessbuddy_u_<id>), so
// every account gets a fully isolated local cache + sync queue. Switching users
// transparently reopens the right database.
import { getState } from './authStore'

const DB_PREFIX = 'fitnessbuddy'
const DB_VERSION = 3

const STORES = ['workouts', 'nutrition', 'habits', 'habitLogs', 'goals', 'syncQueue'] as const
export type StoreName = (typeof STORES)[number]

function currentDbName(): string {
  const uid = getState().user?.id
  return uid ? `${DB_PREFIX}_u_${uid}` : `${DB_PREFIX}_anon`
}

let _db: IDBDatabase | null = null
let _dbName: string | null = null

export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IDB unavailable'))
  const name = currentDbName()
  if (_db && _dbName === name) return Promise.resolve(_db)
  if (_db && _dbName !== name) { try { _db.close() } catch { /* ignore */ } _db = null }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      const tx = (e.target as IDBOpenDBRequest).transaction!

      // workouts
      const wo = db.objectStoreNames.contains('workouts')
        ? tx.objectStore('workouts')
        : db.createObjectStore('workouts', { keyPath: 'id' })
      if (!wo.indexNames.contains('by_date')) wo.createIndex('by_date', 'date')
      if (!wo.indexNames.contains('by_user')) wo.createIndex('by_user', 'user_id')

      // nutrition
      const nu = db.objectStoreNames.contains('nutrition')
        ? tx.objectStore('nutrition')
        : db.createObjectStore('nutrition', { keyPath: 'id' })
      if (!nu.indexNames.contains('by_date')) nu.createIndex('by_date', 'date')
      if (!nu.indexNames.contains('by_user')) nu.createIndex('by_user', 'user_id')

      // habitLogs
      const hl = db.objectStoreNames.contains('habitLogs')
        ? tx.objectStore('habitLogs')
        : db.createObjectStore('habitLogs', { keyPath: 'id' })
      if (!hl.indexNames.contains('by_date'))  hl.createIndex('by_date', 'date')
      if (!hl.indexNames.contains('by_habit')) hl.createIndex('by_habit', 'habit_id')

      // habits
      if (!db.objectStoreNames.contains('habits'))
        db.createObjectStore('habits', { keyPath: 'id' })

      // goals
      if (!db.objectStoreNames.contains('goals'))
        db.createObjectStore('goals', { keyPath: 'id' })

      // syncQueue
      if (!db.objectStoreNames.contains('syncQueue'))
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
    }

    req.onsuccess = () => { _db = req.result; _dbName = name; resolve(_db) }
    req.onerror  = () => reject(req.error)
  })
}

// Pridobi vse zapise iz store-a
export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// Pridobi zapise po indeksu (npr. by_date, by_habit)
export async function getByIndex<T>(
  store: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly')
    const idx = tx.objectStore(store).index(indexName)
    const req = idx.getAll(value)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// Dodaj / posodobi zapis
export async function put<T>(store: StoreName, item: T): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(item)
    tx.oncomplete = () => resolve(item)
    tx.onerror    = () => reject(tx.error)
  })
}

// Zbriši zapis
export async function del(store: StoreName, id: IDBValidKey): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

// Empty a store (used when re-hydrating a user's cache from the server).
export async function clear(store: StoreName): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).clear()
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export const remove = del
export const uid = () => crypto.randomUUID()
