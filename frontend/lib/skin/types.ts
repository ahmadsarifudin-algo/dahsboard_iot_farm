// ============================================
// Skin System — TypeScript Types
// ============================================

/** Skin manifest (skin.json) */
export interface SkinManifest {
    name: string
    version?: string
    author?: string
    description?: string
    preview?: string
    files: {
        css: string
        layout?: string
        widgets?: Record<string, string>
    }
    config?: SkinConfig
}

/** Skin configuration options */
export interface SkinConfig {
    sidebarPosition?: 'left' | 'right'
    headerStyle?: 'solid' | 'transparent' | 'gradient'
    cardStyle?: 'default' | 'glass' | 'flat' | 'bordered'
    previewColors?: string[]
    [key: string]: unknown
}

/** Complete skin data (stored in IndexedDB) */
export interface SkinData {
    id: string
    manifest: SkinManifest
    css: string
    templates: Record<string, string>
    assets: Record<string, string> // filename -> blob URL or data URI
    installedAt: number
    isBuiltIn: boolean
}

/** Validation result */
export interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

/** Skin engine state */
export interface SkinState {
    activeSkinId: string | null
    skins: SkinData[]
    isLoading: boolean
    error: string | null
}

/** Built-in skin definition (lightweight, no zip needed) */
export interface BuiltInSkin {
    id: string
    manifest: SkinManifest
    css: string
}
