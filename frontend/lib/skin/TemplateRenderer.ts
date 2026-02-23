// ============================================
// Template Renderer — Mustache-like Engine
// ============================================

/**
 * Simple template engine supporting:
 * - {{variable}} — value replacement
 * - {{#if condition}}...{{/if}} — conditional blocks
 * - {{#if condition}}...{{#else}}...{{/if}} — if/else
 * - {{#each items}}...{{/each}} — iteration
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
    let result = template

    // Process {{#each items}}...{{/each}}
    result = result.replace(
        /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
        (_, key, inner) => {
            const items = data[key]
            if (!Array.isArray(items)) return ''
            return items.map(item => {
                const itemData = typeof item === 'object' && item !== null
                    ? item as Record<string, unknown>
                    : { value: item }
                return renderTemplate(inner, { ...data, ...itemData })
            }).join('')
        }
    )

    // Process {{#if condition}}...{{#else}}...{{/if}}
    result = result.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{#else\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (_, key, ifBlock, elseBlock) => {
            return data[key] ? renderTemplate(ifBlock, data) : renderTemplate(elseBlock, data)
        }
    )

    // Process {{#if condition}}...{{/if}} (without else)
    result = result.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (_, key, inner) => {
            return data[key] ? renderTemplate(inner, data) : ''
        }
    )

    // Replace {{variable}}
    result = result.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => {
            const val = data[key]
            if (val === undefined || val === null) return ''
            return String(val)
        }
    )

    return result
}
