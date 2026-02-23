// ============================================
// Skin Engine — Core Orchestrator
// ============================================

import JSZip from 'jszip'
import type { SkinData, SkinManifest, BuiltInSkin, ValidationResult } from './types'
import {
    validateManifest,
    validateFile,
    validateTotalSize,
    sanitizeHTML,
    sanitizeCSS,
} from './SkinValidator'
import {
    saveSkin,
    getSkin,
    getAllSkins,
    deleteSkin as deleteFromStorage,
    saveActiveSkinId,
    getActiveSkinId,
} from './SkinStorage'

// ============================================
// BUILT-IN SKINS
// ============================================

const BUILT_IN_SKINS: BuiltInSkin[] = [
    {
        id: 'builtin-dark-neon',
        manifest: {
            name: 'Dark Neon',
            version: '1.0.0',
            author: 'IoTHub',
            description: 'Default dark theme with neon blue accents',
            files: { css: 'theme.css' },
            config: { previewColors: ['#0d1321', '#151c2c', '#0ea5e9', '#22c55e'] },
        },
        css: `
:root {
  --background: #0d1321;
  --foreground: #f1f5f9;
  --card: #151c2c;
  --card-hover: #1a2234;
  --border: #1e293b;
  --muted: #64748b;
  --accent: #0ea5e9;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --surface-1: #111827;
  --surface-2: #1a2234;
  --surface-3: #151c2c;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --skin-glow: 0 0 20px rgba(14, 165, 233, 0.15);
}`,
    },
    {
        id: 'builtin-light-clean',
        manifest: {
            name: 'Light Clean',
            version: '1.0.0',
            author: 'IoTHub',
            description: 'Clean light theme for daytime use',
            files: { css: 'theme.css' },
            config: { previewColors: ['#f8fafc', '#ffffff', '#0ea5e9', '#10b981'] },
        },
        css: `
:root {
  --background: #f0f4f8;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-hover: #f1f5f9;
  --border: #e2e8f0;
  --muted: #94a3b8;
  --accent: #0ea5e9;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --surface-1: #f1f5f9;
  --surface-2: #e2e8f0;
  --surface-3: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --skin-glow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Override dark classes for light skin */
.bg-dark-500, .bg-dark-400 { background-color: var(--background) !important; }
.bg-dark-300 { background-color: var(--card) !important; }
.bg-dark-200 { background-color: var(--card-hover) !important; }
.border-dark-100 { border-color: var(--border) !important; }
.text-white { color: var(--text-primary) !important; }
.text-gray-400, .text-gray-300 { color: var(--text-secondary) !important; }
.text-gray-500, .text-gray-600 { color: var(--text-muted) !important; }

input, select, .input {
  background-color: var(--card-hover) !important;
  border-color: var(--border) !important;
  color: var(--text-primary) !important;
}
.card {
  background-color: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}`,
    },
    {
        id: 'builtin-cyberpunk',
        manifest: {
            name: 'Cyberpunk',
            version: '1.0.0',
            author: 'IoTHub',
            description: 'Neon pink & cyan cyberpunk theme',
            files: { css: 'theme.css' },
            config: { previewColors: ['#0a0a1a', '#12122a', '#ff2d95', '#00f0ff'] },
        },
        css: `
:root {
  --background: #0a0a1a;
  --foreground: #e0e0ff;
  --card: #12122a;
  --card-hover: #1a1a3a;
  --border: #2a2a4a;
  --muted: #6a6a9a;
  --accent: #ff2d95;
  --success: #00f0ff;
  --warning: #ffb800;
  --danger: #ff1744;
  --surface-1: #0e0e22;
  --surface-2: #16163a;
  --surface-3: #12122a;
  --text-primary: #e0e0ff;
  --text-secondary: #9a9ac0;
  --text-muted: #6a6a9a;
  --skin-glow: 0 0 20px rgba(255, 45, 149, 0.2);
}

.bg-primary-500\\/20 { background-color: rgba(255, 45, 149, 0.2) !important; }
.text-primary-400 { color: #ff2d95 !important; }
.bg-primary-600 { background-color: #ff2d95 !important; }
.bg-primary-600:hover, .hover\\:bg-primary-700:hover { background-color: #e0207a !important; }
.border-primary-800 { border-color: rgba(255, 45, 149, 0.3) !important; }
.focus\\:border-primary-500:focus { border-color: #ff2d95 !important; }
.text-primary-500 { color: #ff2d95 !important; }

.status-online { background-color: #00f0ff !important; }
.badge-info { background-color: rgba(0, 240, 255, 0.2) !important; color: #00f0ff !important; }
`,
    },
]

// ============================================
// SKIN ENGINE
// ============================================

const SKIN_STYLE_ID = 'skin-custom-css'

/**
 * Get all built-in skins as SkinData
 */
export function getBuiltInSkins(): SkinData[] {
    return BUILT_IN_SKINS.map(skin => ({
        id: skin.id,
        manifest: skin.manifest,
        css: skin.css,
        templates: {},
        assets: {},
        installedAt: 0,
        isBuiltIn: true,
    }))
}

/**
 * Apply a skin to the DOM
 */
export function applySkinToDOM(skin: SkinData | null): void {
    if (typeof window === 'undefined') return

    // Remove existing skin style
    const existing = document.getElementById(SKIN_STYLE_ID)
    if (existing) existing.remove()

    if (!skin) return

    // Inject skin CSS
    const style = document.createElement('style')
    style.id = SKIN_STYLE_ID
    style.textContent = skin.css
    document.head.appendChild(style)
}

/**
 * Remove skin from DOM
 */
export function removeSkinFromDOM(): void {
    if (typeof window === 'undefined') return
    const existing = document.getElementById(SKIN_STYLE_ID)
    if (existing) existing.remove()
}

/**
 * Process uploaded zip file into SkinData
 */
export async function processZipFile(file: File): Promise<{ skin: SkinData; warnings: string[] }> {
    const allWarnings: string[] = []

    // Validate total size
    const sizeResult = validateTotalSize(file.size)
    if (!sizeResult.valid) {
        throw new Error(sizeResult.errors.join(', '))
    }

    // Read zip
    const zip = await JSZip.loadAsync(file)

    // Find and parse manifest
    const manifestFile = zip.file('skin.json')
    if (!manifestFile) {
        throw new Error('File skin.json tidak ditemukan dalam zip')
    }

    const manifestText = await manifestFile.async('text')
    let manifest: SkinManifest
    try {
        manifest = JSON.parse(manifestText)
    } catch {
        throw new Error('skin.json bukan JSON yang valid')
    }

    // Validate manifest
    const manifestResult = validateManifest(manifest)
    if (!manifestResult.valid) {
        throw new Error(manifestResult.errors.join(', '))
    }
    allWarnings.push(...manifestResult.warnings)

    // Read CSS file
    const cssFile = zip.file(manifest.files.css)
    if (!cssFile) {
        throw new Error(`File CSS "${manifest.files.css}" tidak ditemukan dalam zip`)
    }

    const rawCSS = await cssFile.async('text')

    // Validate CSS file
    const cssFileResult = validateFile(manifest.files.css, rawCSS.length)
    if (!cssFileResult.valid) {
        throw new Error(cssFileResult.errors.join(', '))
    }

    // Sanitize CSS
    const { css, warnings: cssWarnings } = sanitizeCSS(rawCSS)
    allWarnings.push(...cssWarnings)

    // Process templates
    const templates: Record<string, string> = {}
    if (manifest.files.widgets) {
        for (const [name, path] of Object.entries(manifest.files.widgets)) {
            const templateFile = zip.file(path)
            if (templateFile) {
                const html = await templateFile.async('text')
                const fileResult = validateFile(path, html.length)
                if (fileResult.valid) {
                    templates[name] = sanitizeHTML(html)
                } else {
                    allWarnings.push(...fileResult.errors)
                }
            }
        }
    }

    // Process layout template
    if (manifest.files.layout) {
        const layoutFile = zip.file(manifest.files.layout)
        if (layoutFile) {
            const html = await layoutFile.async('text')
            templates['layout'] = sanitizeHTML(html)
        }
    }

    // Process assets (images, fonts)
    const assets: Record<string, string> = {}
    const assetFiles = zip.filter((path, file) => {
        return !file.dir && !path.endsWith('.json') && !path.endsWith('.css') && !path.endsWith('.html')
    })

    for (const assetFile of assetFiles) {
        const fileResult = validateFile(assetFile.name, 0) // size check done by total
        if (fileResult.valid) {
            const blob = await assetFile.async('blob')
            assets[assetFile.name] = URL.createObjectURL(blob)
        }
    }

    // Generate ID
    const id = `skin-${manifest.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`

    const skin: SkinData = {
        id,
        manifest,
        css,
        templates,
        assets,
        installedAt: Date.now(),
        isBuiltIn: false,
    }

    return { skin, warnings: allWarnings }
}

/**
 * Install a skin (save to storage)
 */
export async function installSkin(skin: SkinData): Promise<void> {
    await saveSkin(skin)
}

/**
 * Uninstall a skin
 */
export async function uninstallSkin(id: string): Promise<void> {
    // Check if it's the active skin
    const activeId = await getActiveSkinId()
    if (activeId === id) {
        await saveActiveSkinId(null)
        removeSkinFromDOM()
    }
    await deleteFromStorage(id)
}

/**
 * Set active skin
 */
export async function setActiveSkin(id: string | null): Promise<void> {
    await saveActiveSkinId(id)

    if (!id) {
        removeSkinFromDOM()
        return
    }

    // Check built-in first
    const builtIn = getBuiltInSkins().find(s => s.id === id)
    if (builtIn) {
        applySkinToDOM(builtIn)
        return
    }

    // Load from storage
    const skin = await getSkin(id)
    if (skin) {
        applySkinToDOM(skin)
    }
}

/**
 * Load all skins (built-in + installed)
 */
export async function loadAllSkins(): Promise<{ skins: SkinData[]; activeId: string | null }> {
    const builtInSkins = getBuiltInSkins()
    let installedSkins: SkinData[] = []
    let activeId: string | null = null

    try {
        installedSkins = await getAllSkins()
        activeId = await getActiveSkinId()
    } catch (e) {
        console.warn('Failed to load skins from storage:', e)
    }

    return {
        skins: [...builtInSkins, ...installedSkins],
        activeId,
    }
}

/**
 * Initialize skin engine — load saved skin on startup
 */
export async function initializeSkinEngine(): Promise<{ skins: SkinData[]; activeId: string | null }> {
    const { skins, activeId } = await loadAllSkins()

    // Apply saved active skin
    if (activeId) {
        const activeSkin = skins.find(s => s.id === activeId)
        if (activeSkin) {
            applySkinToDOM(activeSkin)
        }
    }

    return { skins, activeId }
}
