'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

// Routes that should show the full dashboard layout (sidebar + header)
const dashboardRoutes = [
    '/',
    '/fleet',
    '/fleet/kandang',
    '/fleet/device',
    '/devices',
    '/alarms',
    '/map',
    '/analysis',
    '/settings'
]

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Check if current route needs dashboard layout
    const needsDashboardLayout = dashboardRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    ) && !pathname.startsWith('/login')

    // Login and public pages get minimal layout
    if (!needsDashboardLayout || pathname === '/login') {
        return <>{children}</>
    }

    // Dashboard pages get full layout with sidebar and header
    return (
        <div className="flex h-screen bg-dark-500">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
