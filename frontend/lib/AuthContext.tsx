'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import authService, { User } from '@/lib/auth'

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (identifier: string, password: string, method: 'Email' | 'Username' | 'Phone') => Promise<boolean>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/register', '/forgot-password']
    const isPublicRoute = publicRoutes.includes(pathname)

    useEffect(() => {
        const checkAuth = () => {
            const savedUser = authService.getUser()
            const token = authService.getToken()

            if (token && savedUser) {
                setUser(savedUser)
            } else if (!isPublicRoute) {
                // Redirect to login if not authenticated and not on public route
                router.push('/login')
            }
            setIsLoading(false)
        }

        checkAuth()
    }, [pathname, router, isPublicRoute])

    const login = async (identifier: string, password: string, method: 'Email' | 'Username' | 'Phone'): Promise<boolean> => {
        try {
            const response = await authService.login(identifier, password, method)

            if (response.data?.token) {
                authService.saveToken(response.data.token)
                const userData = authService.decodeToken(response.data.token)
                if (userData) {
                    authService.saveUser(userData)
                    setUser(userData)
                }
                return true
            }
            return false
        } catch (error) {
            console.error('Login error:', error)
            return false
        }
    }

    const logout = () => {
        authService.logout()
        setUser(null)
        router.push('/login')
    }

    // Show loading spinner while checking auth
    if (isLoading && !isPublicRoute) {
        return (
            <div className="min-h-screen bg-dark-400 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
