'use client'

// ============================================
// Skin Manager — Modal UI Component
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, Trash2, Check, Palette, AlertTriangle, Download } from 'lucide-react'
import { useSkin } from '@/lib/skin/SkinContext'
import clsx from 'clsx'

export default function SkinManager() {
    const {
        skins,
        activeSkinId,
        isLoading,
        error,
        applySkin,
        resetSkin,
        uploadSkin,
        removeSkin,
        isManagerOpen,
        closeManager,
    } = useSkin()

    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Clear messages after a few seconds
    useEffect(() => {
        if (uploadMessage) {
            const timer = setTimeout(() => setUploadMessage(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [uploadMessage])

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeManager()
        }
        if (isManagerOpen) {
            document.addEventListener('keydown', handleEsc)
            return () => document.removeEventListener('keydown', handleEsc)
        }
    }, [isManagerOpen, closeManager])

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return

        const file = files[0]
        if (!file.name.endsWith('.zip')) {
            setUploadMessage({ type: 'error', text: 'Hanya file .zip yang diizinkan' })
            return
        }

        setIsUploading(true)
        setUploadMessage(null)

        try {
            const { warnings } = await uploadSkin(file)
            if (warnings.length > 0) {
                setUploadMessage({ type: 'warning', text: `Skin diinstall dengan ${warnings.length} peringatan` })
            } else {
                setUploadMessage({ type: 'success', text: 'Skin berhasil diinstall!' })
            }
        } catch (e) {
            setUploadMessage({
                type: 'error',
                text: e instanceof Error ? e.message : 'Gagal mengupload skin',
            })
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [uploadSkin])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
    }, [handleFiles])

    if (!isManagerOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeManager() }}
        >
            <div
                className="w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col animate-fade-in"
                style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <div className="flex items-center space-x-3">
                        <Palette className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Skin Manager
                        </h2>
                        <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                                color: 'var(--accent)',
                            }}
                        >
                            {skins.length} skins
                        </span>
                    </div>
                    <button
                        onClick={closeManager}
                        className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Upload Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={clsx(
                            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                            isDragging ? 'scale-[1.02]' : ''
                        )}
                        style={{
                            borderColor: isDragging ? 'var(--accent)' : 'var(--border)',
                            backgroundColor: isDragging ? 'rgba(14, 165, 233, 0.05)' : 'transparent',
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                        {isUploading ? (
                            <div className="space-y-2">
                                <div
                                    className="w-8 h-8 mx-auto border-2 border-t-transparent rounded-full animate-spin"
                                    style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                                />
                                <p style={{ color: 'var(--text-secondary)' }}>Memproses skin...</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="w-8 h-8 mx-auto" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Drag & drop file <span className="font-mono">.zip</span> skin, atau{' '}
                                    <span style={{ color: 'var(--accent)' }} className="font-medium">browse</span>
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Max 5MB • Berisi skin.json + theme.css
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Upload Messages */}
                    {uploadMessage && (
                        <div
                            className="flex items-center space-x-2 px-4 py-3 rounded-lg text-sm animate-fade-in"
                            style={{
                                backgroundColor:
                                    uploadMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                                        uploadMessage.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                                            'rgba(239, 68, 68, 0.1)',
                                color:
                                    uploadMessage.type === 'success' ? 'var(--success)' :
                                        uploadMessage.type === 'warning' ? 'var(--warning)' :
                                            'var(--danger)',
                            }}
                        >
                            {uploadMessage.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> :
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                            <span>{uploadMessage.text}</span>
                        </div>
                    )}

                    {/* Global Error */}
                    {error && !uploadMessage && (
                        <div
                            className="flex items-center space-x-2 px-4 py-3 rounded-lg text-sm"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
                        >
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Skin Gallery */}
                    <div>
                        <h3
                            className="text-sm font-medium mb-3 uppercase tracking-wide"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Available Skins
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Default / Reset card */}
                            <button
                                onClick={() => resetSkin()}
                                className={clsx(
                                    'rounded-xl p-4 text-left transition-all',
                                    !activeSkinId ? 'ring-2' : ''
                                )}
                                style={{
                                    backgroundColor: 'var(--surface-1)',
                                    border: !activeSkinId ? '2px solid var(--accent)' : '1px solid var(--border)',
                                    boxShadow: !activeSkinId ? '0 0 0 2px var(--accent)' : undefined,
                                }}
                            >
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="flex space-x-1">
                                        {['#0d1321', '#151c2c', '#0ea5e9', '#22c55e'].map((c, i) => (
                                            <div
                                                key={i}
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                    {!activeSkinId && (
                                        <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                    )}
                                </div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    Default Theme
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    Tema bawaan sistem
                                </p>
                            </button>

                            {/* Skin cards */}
                            {skins.map((skin) => (
                                <div
                                    key={skin.id}
                                    className={clsx(
                                        'rounded-xl p-4 transition-all group relative',
                                        activeSkinId === skin.id ? 'ring-2' : ''
                                    )}
                                    style={{
                                        backgroundColor: 'var(--surface-1)',
                                        border: activeSkinId === skin.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        boxShadow: activeSkinId === skin.id ? '0 0 0 2px var(--accent)' : undefined,
                                    }}
                                >
                                    {/* Preview Colors */}
                                    <div className="flex items-center space-x-2 mb-2">
                                        <div className="flex space-x-1">
                                            {(skin.manifest.config?.previewColors || ['#333', '#555', '#777', '#999']).map(
                                                (c, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-4 h-4 rounded-full"
                                                        style={{ backgroundColor: c }}
                                                    />
                                                )
                                            )}
                                        </div>
                                        {activeSkinId === skin.id && (
                                            <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {skin.manifest.name}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        {skin.manifest.author || 'Unknown'}{' '}
                                        {skin.isBuiltIn && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px]"
                                                style={{ backgroundColor: 'rgba(14,165,233,0.1)', color: 'var(--accent)' }}>
                                                Built-in
                                            </span>
                                        )}
                                    </p>

                                    {/* Actions */}
                                    <div className="mt-3 flex items-center space-x-2">
                                        <button
                                            onClick={() => applySkin(skin.id)}
                                            disabled={activeSkinId === skin.id}
                                            className={clsx(
                                                'flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium',
                                                activeSkinId === skin.id
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'hover:opacity-90'
                                            )}
                                            style={{
                                                backgroundColor: activeSkinId === skin.id ? 'var(--surface-2)' : 'var(--accent)',
                                                color: activeSkinId === skin.id ? 'var(--text-muted)' : '#fff',
                                            }}
                                        >
                                            {activeSkinId === skin.id ? 'Active' : 'Apply'}
                                        </button>

                                        {!skin.isBuiltIn && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    removeSkin(skin.id)
                                                }}
                                                className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                                                style={{
                                                    color: 'var(--danger)',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                }}
                                                title="Hapus skin"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-6 py-3 flex items-center justify-between text-xs"
                    style={{
                        borderTop: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                    }}
                >
                    <span>Template Pack Skin System v1.0</span>
                    <span>
                        {activeSkinId
                            ? `Active: ${skins.find(s => s.id === activeSkinId)?.manifest.name || 'Unknown'}`
                            : 'Default Theme'
                        }
                    </span>
                </div>
            </div>
        </div>
    )
}
