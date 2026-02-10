'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Search, User, LogOut, ChevronDown, Settings, Sun, Moon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import authService from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function Header() {
    const { stats } = useStore()
    const { theme, toggleTheme } = useTheme()
    const router = useRouter()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [user, setUser] = useState<any>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const savedUser = authService.getUser()
        if (savedUser) {
            setUser(savedUser)
        }
    }, [])

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        authService.logout()
        router.push('/login')
    }

    return (
        <header className="h-16 bg-dark-400 border-b border-dark-100 flex items-center justify-between px-6">
            {/* Search */}
            <div className="flex items-center flex-1 max-w-md">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search devices, sites..."
                        className="input w-full pl-10"
                    />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
                {/* Live indicator */}
                <div className="flex items-center space-x-2 text-sm">
                    <span className="status-online" />
                    <span className="text-gray-400">Live</span>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-dark-300"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 text-yellow-400" />
                    ) : (
                        <Moon className="w-5 h-5 text-blue-500" />
                    )}
                </button>

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                    {stats.activeAlarms > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                            {stats.activeAlarms > 9 ? '9+' : stats.activeAlarms}
                        </span>
                    )}
                </button>

                {/* User menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-dark-300"
                    >
                        <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-400" />
                        </div>
                        {user && (
                            <>
                                <span className="text-sm font-medium text-white hidden md:block">
                                    {user.fullname || user.username}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </>
                        )}
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-dark-300 border border-dark-100 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                            {user && (
                                <>
                                    <div className="px-4 py-3 border-b border-dark-100">
                                        <p className="text-sm font-medium text-white">{user.fullname}</p>
                                        <p className="text-xs text-gray-400">{user.email}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                                            {user.role?.name || 'User'}
                                        </span>
                                    </div>
                                    {user.company && (
                                        <div className="px-4 py-2 border-b border-dark-100">
                                            <p className="text-xs text-gray-500">Perusahaan</p>
                                            <p className="text-sm text-gray-300">{user.company.name}</p>
                                        </div>
                                    )}
                                </>
                            )}
                            <button
                                onClick={() => {
                                    setShowUserMenu(false)
                                    router.push('/settings')
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-200 flex items-center space-x-2"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Pengaturan</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-dark-200 flex items-center space-x-2"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Keluar</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
