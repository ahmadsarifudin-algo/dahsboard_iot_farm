// ============================================
// Skin Storage — IndexedDB Persistence
// ============================================

import type { SkinData } from './types'

const DB_NAME = 'iot-skin-store'
const DB_VERSION = 1
const STORE_NAME = 'skins'
const PREFS_STORE = 'preferences'

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('IndexedDB not available in SSR'))
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains(PREFS_STORE)) {
                db.createObjectStore(PREFS_STORE, { keyPath: 'key' })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Save a skin to IndexedDB
 */
export async function saveSkin(skin: SkinData): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(skin)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

/**
 * Get a skin by ID
 */
export async function getSkin(id: string): Promise<SkinData | undefined> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result || undefined)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Get all installed skins
 */
export async function getAllSkins(): Promise<SkinData[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
    })
}

/**
 * Delete a skin
 */
export async function deleteSkin(id: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

/**
 * Save active skin preference
 */
export async function saveActiveSkinId(skinId: string | null): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PREFS_STORE, 'readwrite')
        const store = tx.objectStore(PREFS_STORE)
        const request = store.put({ key: 'activeSkinId', value: skinId })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

/**
 * Get active skin preference
 */
export async function getActiveSkinId(): Promise<string | null> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PREFS_STORE, 'readonly')
        const store = tx.objectStore(PREFS_STORE)
        const request = store.get('activeSkinId')
        request.onsuccess = () => resolve(request.result?.value || null)
        request.onerror = () => reject(request.error)
    })
}
