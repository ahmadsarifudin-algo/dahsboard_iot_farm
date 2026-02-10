import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import { ThemeProvider } from '@/lib/theme'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'IoT Data Center Dashboard',
    description: 'Real-time monitoring and control for distributed IoT devices',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider>
                    <LayoutWrapper>
                        {children}
                    </LayoutWrapper>
                </ThemeProvider>
            </body>
        </html>
    )
}
