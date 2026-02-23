'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Map,
    Server,
    AlertTriangle,
    Settings,
    Activity,
    ChevronDown,
    ChevronRight,
    Home,
    Cpu,
    Sparkles,
    PanelLeftClose,
    PanelLeftOpen,
    Palette
} from 'lucide-react'
import { useSkin } from '@/lib/skin/SkinContext'
import clsx from 'clsx'

interface NavItem {
    name: string
    href?: string
    icon: any
    children?: { name: string; href: string; icon: any }[]
}

const navigation: NavItem[] = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Map', href: '/map', icon: Map },
    {
        name: 'Fleet',
        icon: Server,
        children: [
            { name: 'List Kandang', href: '/fleet/kandang', icon: Home },
            { name: 'List Device', href: '/fleet', icon: Cpu },
        ]
    },
    { name: 'Alarms', href: '/alarms', icon: AlertTriangle },
    { name: 'Data Playground', href: '/analysis', icon: Sparkles },
    { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { openManager } = useSkin()
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['Fleet'])
    const [collapsed, setCollapsed] = useState(false)
    const [hovered, setHovered] = useState(false)
    const collapseTimer = useRef<NodeJS.Timeout | null>(null)

    // The sidebar is visually expanded when: not collapsed OR when hovered
    const isExpanded = !collapsed || hovered

    function handleMouseEnter() {
        if (collapseTimer.current) {
            clearTimeout(collapseTimer.current)
            collapseTimer.current = null
        }
        setHovered(true)
    }

    function handleMouseLeave() {
        // Small delay before collapsing to prevent flickering
        collapseTimer.current = setTimeout(() => {
            setHovered(false)
        }, 300)
    }

    useEffect(() => {
        return () => {
            if (collapseTimer.current) clearTimeout(collapseTimer.current)
        }
    }, [])

    function toggleMenu(name: string) {
        setExpandedMenus(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        )
    }

    function isActiveParent(item: NavItem) {
        if (item.children) {
            return item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
        }
        return pathname === item.href
    }

    return (
        <aside
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={clsx(
                'bg-dark-400 border-r border-dark-100 flex flex-col transition-all duration-300 ease-in-out relative z-30',
                isExpanded ? 'w-64' : 'w-[68px]'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-dark-100 justify-between">
                <div className="flex items-center min-w-0">
                    <Activity className="w-8 h-8 text-primary-500 flex-shrink-0" />
                    <span className={clsx(
                        'ml-3 text-xl font-bold text-white whitespace-nowrap transition-all duration-300',
                        isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                    )}>
                        IoT Center
                    </span>
                </div>
                {isExpanded && (
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-300 transition-colors flex-shrink-0"
                        title={collapsed ? 'Pin sidebar' : 'Auto-hide sidebar'}
                    >
                        {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
                {navigation.map((item) => {
                    const isActive = item.href ? pathname === item.href : isActiveParent(item)
                    const isSubExpanded = expandedMenus.includes(item.name)
                    const hasChildren = item.children && item.children.length > 0

                    return (
                        <div key={item.name}>
                            {hasChildren ? (
                                <>
                                    {/* Parent with children */}
                                    <button
                                        onClick={() => isExpanded && toggleMenu(item.name)}
                                        className={clsx(
                                            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200',
                                            isActive
                                                ? 'bg-primary-600/20 text-primary-400'
                                                : 'text-gray-400 hover:bg-dark-300 hover:text-white'
                                        )}
                                        title={!isExpanded ? item.name : undefined}
                                    >
                                        <div className="flex items-center min-w-0">
                                            <item.icon className="w-5 h-5 flex-shrink-0" />
                                            <span className={clsx(
                                                'ml-3 whitespace-nowrap transition-all duration-300',
                                                isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                                            )}>
                                                {item.name}
                                            </span>
                                        </div>
                                        {isExpanded && (
                                            isSubExpanded
                                                ? <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                                : <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* Children — only show when expanded */}
                                    {isSubExpanded && isExpanded && (
                                        <div className="ml-4 mt-1 space-y-1">
                                            {item.children?.map((child) => {
                                                const isChildActive = pathname === child.href
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href}
                                                        className={clsx(
                                                            'flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                                                            isChildActive
                                                                ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                                                                : 'text-gray-400 hover:bg-dark-300 hover:text-white'
                                                        )}
                                                    >
                                                        <child.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                                                        <span className="whitespace-nowrap">{child.name}</span>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Regular link */
                                <Link
                                    href={item.href!}
                                    className={clsx(
                                        'flex items-center px-3 py-2.5 rounded-lg transition-all duration-200',
                                        isActive
                                            ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                                            : 'text-gray-400 hover:bg-dark-300 hover:text-white'
                                    )}
                                    title={!isExpanded ? item.name : undefined}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    <span className={clsx(
                                        'ml-3 whitespace-nowrap transition-all duration-300',
                                        isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                                    )}>
                                        {item.name}
                                    </span>
                                </Link>
                            )}
                        </div>
                    )
                })}
            </nav>

            {/* Skin Manager Button */}
            <div className="p-2 border-t border-dark-100">
                <button
                    onClick={openManager}
                    className={clsx(
                        'w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200',
                        'text-gray-400 hover:bg-dark-300 hover:text-white'
                    )}
                    title={!isExpanded ? 'Skin Manager' : undefined}
                >
                    <Palette className="w-5 h-5 flex-shrink-0" />
                    <span className={clsx(
                        'ml-3 whitespace-nowrap transition-all duration-300 text-sm',
                        isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                    )}>
                        Skin Manager
                    </span>
                </button>
            </div>

            {/* System Status */}
            <div className="p-2 border-t border-dark-100">
                <div className="card p-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className={clsx(
                            'text-sm text-gray-400 whitespace-nowrap transition-all duration-300',
                            isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                        )}>
                            System Status
                        </span>
                        <span className="status-online flex-shrink-0" />
                    </div>
                    {isExpanded && (
                        <div className="text-xs text-gray-500">
                            All services operational
                        </div>
                    )}
                </div>
            </div>
        </aside>
    )
}
