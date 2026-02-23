// ============================================
// Skin Validator — Validation & Sanitization
// ============================================

import DOMPurify from 'dompurify'
import type { SkinManifest, ValidationResult } from './types'

// Allowed file extensions in skin zip
const ALLOWED_EXTENSIONS = new Set([
    '.html', '.css', '.json',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.woff', '.woff2', '.ttf',
])

// Max file sizes
const MAX_TOTAL_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILE_SIZE = 1 * 1024 * 1024  // 1MB per file

// Dangerous CSS patterns
const DANGEROUS_CSS_PATTERNS = [
    /@import\s/i,
    /expression\s*\(/i,
    /javascript\s*:/i,
    /behavior\s*:/i,
    /-moz-binding/i,
    /url\s*\(\s*["']?\s*https?:/i,
    /url\s*\(\s*["']?\s*\/\//i,
]

/**
 * Validate a skin manifest
 */
export function validateManifest(manifest: unknown): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!manifest || typeof manifest !== 'object') {
        return { valid: false, errors: ['skin.json harus berupa object JSON'], warnings }
    }

    const m = manifest as Record<string, unknown>

    // Required fields
    if (!m.name || typeof m.name !== 'string') {
        errors.push('Field "name" wajib dan harus berupa string')
    } else if (m.name.length > 50) {
        errors.push('Field "name" maksimal 50 karakter')
    }

    if (!m.files || typeof m.files !== 'object') {
        errors.push('Field "files" wajib dan harus berupa object')
    } else {
        const files = m.files as Record<string, unknown>
        if (!files.css || typeof files.css !== 'string') {
            errors.push('Field "files.css" wajib dan harus berupa path string')
        }
    }

    // Optional field validation
    if (m.version && typeof m.version !== 'string') {
        warnings.push('Field "version" harus berupa string')
    }
    if (m.author && typeof m.author !== 'string') {
        warnings.push('Field "author" harus berupa string')
    }

    return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate a file from the zip
 */
export function validateFile(filename: string, size: number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check extension
    const ext = '.' + filename.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        errors.push(`File "${filename}" memiliki ekstensi yang tidak diizinkan: ${ext}`)
    }

    // Check size
    if (size > MAX_FILE_SIZE) {
        errors.push(`File "${filename}" terlalu besar: ${(size / 1024 / 1024).toFixed(2)}MB (max 1MB)`)
    }

    // Check for path traversal
    if (filename.includes('..') || filename.startsWith('/')) {
        errors.push(`File "${filename}" mengandung path traversal yang tidak diizinkan`)
    }

    return { valid: errors.length === 0, errors, warnings }
}

/**
 * Check total zip size
 */
export function validateTotalSize(totalSize: number): ValidationResult {
    const errors: string[] = []
    if (totalSize > MAX_TOTAL_SIZE) {
        errors.push(`Total ukuran skin terlalu besar: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max 5MB)`)
    }
    return { valid: errors.length === 0, errors, warnings: [] }
}

/**
 * Sanitize HTML using DOMPurify
 */
export function sanitizeHTML(html: string): string {
    if (typeof window === 'undefined') return html // SSR guard
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'a', 'img', 'strong', 'em', 'br', 'hr',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'section', 'article', 'nav', 'header', 'footer', 'aside', 'main',
            'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g',
            'defs', 'linearGradient', 'radialGradient', 'stop', 'text', 'tspan',
        ],
        ALLOWED_ATTR: [
            'class', 'id', 'style', 'src', 'alt', 'href', 'target', 'rel',
            'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width',
            'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
            'transform', 'opacity', 'offset', 'stop-color', 'stop-opacity',
            'data-slot', 'data-widget', 'data-value', 'role', 'aria-label',
        ],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
        FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
    })
}

/**
 * Sanitize CSS — remove dangerous patterns
 */
export function sanitizeCSS(css: string): { css: string; warnings: string[] } {
    const warnings: string[] = []
    let sanitized = css

    for (const pattern of DANGEROUS_CSS_PATTERNS) {
        if (pattern.test(sanitized)) {
            warnings.push(`CSS pattern berbahaya ditemukan dan dihapus: ${pattern.source}`)
            sanitized = sanitized.replace(new RegExp(pattern.source, 'gi'), '/* BLOCKED */')
        }
    }

    return { css: sanitized, warnings }
}

export { MAX_TOTAL_SIZE, MAX_FILE_SIZE, ALLOWED_EXTENSIONS }
