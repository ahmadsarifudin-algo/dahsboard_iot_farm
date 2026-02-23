'use client'

// ============================================
// Skin Slot — Template Renderer Component
// ============================================

import { useMemo, type ReactNode } from 'react'
import { useSkin } from '@/lib/skin/SkinContext'
import { renderTemplate } from '@/lib/skin/TemplateRenderer'

interface SkinSlotProps {
    /** Slot name matching template key in skin (e.g., 'header', 'gauge') */
    name: string
    /** Data to pass to the template */
    data?: Record<string, unknown>
    /** Fallback React component if no skin template */
    fallback: ReactNode
    /** Additional CSS class */
    className?: string
}

/**
 * Renders a skin HTML template if available, otherwise renders the fallback React component.
 */
export default function SkinSlot({ name, data = {}, fallback, className }: SkinSlotProps) {
    const { skins, activeSkinId } = useSkin()

    const renderedHTML = useMemo(() => {
        if (!activeSkinId) return null

        const activeSkin = skins.find(s => s.id === activeSkinId)
        if (!activeSkin) return null

        const template = activeSkin.templates[name]
        if (!template) return null

        return renderTemplate(template, data)
    }, [activeSkinId, skins, name, data])

    // If skin provides a template for this slot, render it
    if (renderedHTML) {
        return (
            <div
                className={className}
                dangerouslySetInnerHTML={{ __html: renderedHTML }}
            />
        )
    }

    // Otherwise render the default React component
    return <>{fallback}</>
}
