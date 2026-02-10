'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => { },
    setTheme: () => { },
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('theme') as Theme | null
        if (saved === 'light' || saved === 'dark') {
            setThemeState(saved)
            document.documentElement.classList.toggle('dark', saved === 'dark')
        }
    }, [])

    const setTheme = (t: Theme) => {
        setThemeState(t)
        localStorage.setItem('theme', t)
        document.documentElement.classList.toggle('dark', t === 'dark')
    }

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    // Prevent flash of wrong theme
    if (!mounted) return <>{children}</>

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
