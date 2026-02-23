'use client'

// ============================================
// Skin Context — React Provider + useSkin Hook
// ============================================

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react'
import type { SkinData } from './types'
import {
    initializeSkinEngine,
    processZipFile,
    installSkin,
    uninstallSkin,
    setActiveSkin,
    applySkinToDOM,
} from './SkinEngine'

interface SkinContextType {
    /** All available skins (built-in + installed) */
    skins: SkinData[]
    /** Currently active skin ID */
    activeSkinId: string | null
    /** Loading state */
    isLoading: boolean
    /** Error message */
    error: string | null
    /** Apply a skin by ID */
    applySkin: (id: string) => Promise<void>
    /** Reset to default (no skin) */
    resetSkin: () => Promise<void>
    /** Upload and install a skin from zip file */
    uploadSkin: (file: File) => Promise<{ warnings: string[] }>
    /** Remove an installed skin */
    removeSkin: (id: string) => Promise<void>
    /** Whether skin manager modal is open */
    isManagerOpen: boolean
    /** Open skin manager modal */
    openManager: () => void
    /** Close skin manager modal */
    closeManager: () => void
}

const SkinContext = createContext<SkinContextType>({
    skins: [],
    activeSkinId: null,
    isLoading: true,
    error: null,
    applySkin: async () => { },
    resetSkin: async () => { },
    uploadSkin: async () => ({ warnings: [] }),
    removeSkin: async () => { },
    isManagerOpen: false,
    openManager: () => { },
    closeManager: () => { },
})

export function SkinProvider({ children }: { children: ReactNode }) {
    const [skins, setSkins] = useState<SkinData[]>([])
    const [activeSkinId, setActiveSkinId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isManagerOpen, setIsManagerOpen] = useState(false)

    // Initialize on mount
    useEffect(() => {
        const init = async () => {
            try {
                const { skins: loadedSkins, activeId } = await initializeSkinEngine()
                setSkins(loadedSkins)
                setActiveSkinId(activeId)
            } catch (e) {
                console.error('Failed to initialize skin engine:', e)
                setError('Gagal memuat skin engine')
            } finally {
                setIsLoading(false)
            }
        }
        init()
    }, [])

    const applySkin = useCallback(async (id: string) => {
        try {
            setError(null)
            await setActiveSkin(id)
            setActiveSkinId(id)

            // Also apply to DOM immediately
            const skin = skins.find(s => s.id === id)
            if (skin) {
                applySkinToDOM(skin)
            }
        } catch (e) {
            setError('Gagal menerapkan skin')
            console.error('Apply skin error:', e)
        }
    }, [skins])

    const resetSkin = useCallback(async () => {
        try {
            setError(null)
            await setActiveSkin(null)
            setActiveSkinId(null)
        } catch (e) {
            setError('Gagal reset skin')
        }
    }, [])

    const uploadSkin = useCallback(async (file: File): Promise<{ warnings: string[] }> => {
        try {
            setError(null)
            const { skin, warnings } = await processZipFile(file)
            await installSkin(skin)
            setSkins(prev => [...prev, skin])
            return { warnings }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Gagal mengupload skin'
            setError(msg)
            throw e
        }
    }, [])

    const removeSkin = useCallback(async (id: string) => {
        try {
            setError(null)
            await uninstallSkin(id)
            setSkins(prev => prev.filter(s => s.id !== id))
            if (activeSkinId === id) {
                setActiveSkinId(null)
            }
        } catch (e) {
            setError('Gagal menghapus skin')
        }
    }, [activeSkinId])

    const openManager = useCallback(() => setIsManagerOpen(true), [])
    const closeManager = useCallback(() => setIsManagerOpen(false), [])

    return (
        <SkinContext.Provider
            value={{
                skins,
                activeSkinId,
                isLoading,
                error,
                applySkin,
                resetSkin,
                uploadSkin,
                removeSkin,
                isManagerOpen,
                openManager,
                closeManager,
            }}
        >
            {children}
        </SkinContext.Provider>
    )
}

export const useSkin = () => useContext(SkinContext)
