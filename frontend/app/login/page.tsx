'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, Mail, Lock, Phone, User, AlertCircle, Loader2 } from 'lucide-react'
import authService, { LoginMethod } from '@/lib/auth'

export default function LoginPage() {
    const router = useRouter()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [method, setMethod] = useState<LoginMethod>('Email')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [checkingAuth, setCheckingAuth] = useState(true)

    // Check if already logged in
    useEffect(() => {
        if (authService.isAuthenticated()) {
            router.push('/fleet/kandang')
        } else {
            setCheckingAuth(false)
        }
    }, [router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await authService.login(identifier, password, method)

            if (response.data?.token) {
                // Save token
                authService.saveToken(response.data.token)

                // Decode and save user data
                const userData = authService.decodeToken(response.data.token)
                if (userData) {
                    authService.saveUser(userData)
                }

                // Redirect to dashboard
                router.push('/fleet/kandang')
            } else if (response.errors && response.errors.length > 0) {
                setError(response.errors[0].message)
            } else if (response.message && response.message !== 'success') {
                setError(response.message)
            } else {
                setError('Login gagal. Silakan coba lagi.')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Terjadi kesalahan. Silakan periksa koneksi internet Anda.')
        } finally {
            setLoading(false)
        }
    }

    const getPlaceholder = () => {
        switch (method) {
            case 'Email':
                return 'Masukkan email'
            case 'Username':
                return 'Masukkan username'
            case 'Phone':
                return 'Masukkan nomor telepon'
        }
    }

    const getIcon = () => {
        switch (method) {
            case 'Email':
                return <Mail className="w-5 h-5 text-gray-400" />
            case 'Username':
                return <User className="w-5 h-5 text-gray-400" />
            case 'Phone':
                return <Phone className="w-5 h-5 text-gray-400" />
        }
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-dark-400 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-400 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-green-500/10 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
                        <span className="text-3xl font-bold text-white">CI</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard IoT</h1>
                    <p className="text-gray-400">Chickin Indonesia</p>
                </div>

                {/* Login Card */}
                <div className="bg-dark-300/80 backdrop-blur-xl border border-dark-100 rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-xl font-semibold text-white mb-6 text-center">Masuk ke Akun Anda</h2>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Login Method Tabs */}
                        <div className="flex bg-dark-400 rounded-lg p-1">
                            {(['Email', 'Username', 'Phone'] as LoginMethod[]).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMethod(m)}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${method === m
                                        ? 'bg-primary-500 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {/* Identifier Input */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                {method === 'Email' ? 'Email' : method === 'Username' ? 'Username' : 'Nomor Telepon'}
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    {getIcon()}
                                </div>
                                <input
                                    type={method === 'Email' ? 'email' : method === 'Phone' ? 'tel' : 'text'}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder={getPlaceholder()}
                                    className="input w-full pl-11"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password"
                                    className="input w-full pl-11 pr-11"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="text-right">
                            <a href="#" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                                Lupa password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !identifier || !password}
                            className="btn-primary w-full py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    <span>Masuk</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Register Link */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            Belum punya akun?{' '}
                            <a href="#" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                                Daftar sekarang
                            </a>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    © 2026 Chickin Indonesia. All rights reserved.
                </p>
            </div>
        </div>
    )
}
