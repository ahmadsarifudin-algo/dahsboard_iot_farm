---
description: How to add a new page to the dashboard
---

## Add a New Page

1. Create the page file at `frontend/app/{route-name}/page.tsx`:
   - Use `'use client'` directive at the top
   - Export a default function component
   - Follow existing page patterns (see `app/alarms/page.tsx` for a simple example)

2. **CRITICAL**: Add the new route to the dashboard layout whitelist in `frontend/components/layout/LayoutWrapper.tsx`:
   - Open the file and find the `dashboardRoutes` array
   - Add your new route path (e.g., `'/my-new-page'`)
   - Without this, the page will render **without the sidebar and header**

3. Add a navigation item to the sidebar in `frontend/components/layout/Sidebar.tsx`:
   - Import the desired icon from `lucide-react`
   - Add an entry to the `navigation` array with `name`, `href`, and `icon`

4. Test by navigating to the new route in the browser.

### Example

```tsx
// frontend/app/reports/page.tsx
'use client'

export default function ReportsPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-white">Reports</h1>
        </div>
    )
}
```

Then add to LayoutWrapper.tsx dashboardRoutes: `'/reports'`
And add to Sidebar.tsx navigation array: `{ name: 'Reports', href: '/reports', icon: FileText }`
