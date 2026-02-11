'use client'

import { useState, useEffect } from 'react'
import {
    Save, Moon, Sun, Bell, Database, Wifi, Shield, Sparkles,
    CheckCircle2, XCircle, Loader2, Eye, EyeOff, RefreshCw
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

interface AppSettings {
    // UI settings (localStorage)
    theme: string
    notifications: boolean
    soundAlerts: boolean
    autoRefresh: boolean
    refreshInterval: number
    apiEndpoint: string
    wsEndpoint: string
    // Backend settings (server)
    gemini_api_key: string
    gemini_api_key_set: boolean
    gemini_model: string
    database_url: string
    database_type: string
    available_models: { value: string; label: string }[]
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings>({
        theme: 'dark',
        notifications: true,
        soundAlerts: false,
        autoRefresh: true,
        refreshInterval: 30,
        apiEndpoint: process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000',
        wsEndpoint: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
        gemini_api_key: '',
        gemini_api_key_set: false,
        gemini_model: 'gemini-2.0-flash',
        database_url: 'sqlite+aiosqlite:///./iot_dashboard.db',
        database_type: 'sqlite',
        available_models: [],
    })

    const [saved, setSaved] = useState(false)
    const [rawApiKey, setRawApiKey] = useState('')
    const [showApiKey, setShowApiKey] = useState(false)
    const [geminiTest, setGeminiTest] = useState<{ status: string; message: string } | null>(null)
    const [dbTest, setDbTest] = useState<{ status: string; message: string } | null>(null)
    const [testing, setTesting] = useState<string | null>(null)

    // Load settings from backend
    useEffect(() => {
        fetchBackendSettings()
    }, [])

    async function fetchBackendSettings() {
        try {
            const res = await fetch(`${API_BASE}/settings`)
            if (res.ok) {
                const data = await res.json()
                setSettings(prev => ({
                    ...prev,
                    gemini_api_key: data.gemini_api_key || '',
                    gemini_api_key_set: data.gemini_api_key_set || false,
                    gemini_model: data.gemini_model || 'gemini-2.0-flash',
                    database_url: data.database_url || prev.database_url,
                    database_type: data.database_type || 'sqlite',
                    available_models: data.available_models || [],
                }))
            }
        } catch (e) {
            console.error('Failed to load backend settings:', e)
        }
    }

    async function handleSave() {
        // Save UI settings to localStorage
        const uiSettings = {
            theme: settings.theme,
            notifications: settings.notifications,
            soundAlerts: settings.soundAlerts,
            autoRefresh: settings.autoRefresh,
            refreshInterval: settings.refreshInterval,
            apiEndpoint: settings.apiEndpoint,
            wsEndpoint: settings.wsEndpoint,
        }
        localStorage.setItem('iot-settings', JSON.stringify(uiSettings))

        // Save backend settings to server
        const backendUpdates: Record<string, string> = {}
        if (rawApiKey) backendUpdates.gemini_api_key = rawApiKey
        backendUpdates.gemini_model = settings.gemini_model
        backendUpdates.database_url = settings.database_url

        try {
            const res = await fetch(`${API_BASE}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backendUpdates),
            })
            if (res.ok) {
                const data = await res.json()
                setSettings(prev => ({
                    ...prev,
                    ...data.settings,
                }))
                setRawApiKey('')
                setShowApiKey(false)
            }
        } catch (e) {
            console.error('Failed to save backend settings:', e)
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    async function testGemini() {
        setTesting('gemini')
        setGeminiTest(null)
        try {
            const res = await fetch(`${API_BASE}/settings/test-gemini`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: rawApiKey || undefined }),
            })
            const data = await res.json()
            if (res.ok) {
                setGeminiTest({ status: 'success', message: data.message })
            } else {
                setGeminiTest({ status: 'error', message: data.detail })
            }
        } catch (e: any) {
            setGeminiTest({ status: 'error', message: 'Connection failed' })
        }
        setTesting(null)
    }

    async function testDb() {
        setTesting('db')
        setDbTest(null)
        try {
            const res = await fetch(`${API_BASE}/settings/test-db`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ database_url: settings.database_url }),
            })
            const data = await res.json()
            if (res.ok) {
                setDbTest({ status: 'success', message: data.message })
            } else {
                setDbTest({ status: 'error', message: data.detail })
            }
        } catch (e: any) {
            setDbTest({ status: 'error', message: 'Connection failed' })
        }
        setTesting(null)
    }

    function StatusBadge({ test }: { test: { status: string; message: string } | null }) {
        if (!test) return null
        return (
            <div className={`flex items-center space-x-1.5 mt-2 text-xs ${test.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {test.status === 'success'
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <XCircle className="w-3.5 h-3.5" />
                }
                <span>{test.message}</span>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 mt-1">Configure your dashboard preferences and AI settings</p>
            </div>

            {/* ===== AI Configuration ===== */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                        <Sparkles className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">AI Configuration</h2>
                        <p className="text-xs text-gray-500">Configure Gemini API for Data Playground analysis</p>
                    </div>
                </div>
                <div className="space-y-4">
                    {/* API Key */}
                    <div>
                        <label className="text-white block mb-2">Gemini API Key</label>
                        <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    className="input w-full pr-10"
                                    value={rawApiKey || (settings.gemini_api_key_set ? settings.gemini_api_key : '')}
                                    onChange={(e) => setRawApiKey(e.target.value)}
                                    placeholder={settings.gemini_api_key_set ? 'Key already set (enter new to replace)' : 'Enter your Gemini API key...'}
                                />
                                <button
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                onClick={testGemini}
                                disabled={testing === 'gemini'}
                                className="px-3 py-2 rounded-lg text-xs font-medium bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 border border-violet-500/30 transition-all disabled:opacity-50 whitespace-nowrap"
                            >
                                {testing === 'gemini' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            Get your key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Google AI Studio</a>
                        </p>
                        <StatusBadge test={geminiTest} />
                    </div>
                    {/* Model Selection */}
                    <div>
                        <label className="text-white block mb-2">Model</label>
                        <select
                            className="input w-full"
                            value={settings.gemini_model}
                            onChange={(e) => setSettings({ ...settings, gemini_model: e.target.value })}
                        >
                            {(settings.available_models.length > 0
                                ? settings.available_models
                                : [
                                    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
                                    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
                                    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
                                    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                                ]
                            ).map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== Database ===== */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                    <Database className="w-5 h-5 text-primary-500" />
                    <div>
                        <h2 className="text-lg font-semibold text-white">Database</h2>
                        <p className="text-xs text-gray-500">Configure database connection for IoT data storage</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-white">Database URL</label>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${settings.database_type === 'sqlite'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : settings.database_type === 'postgresql'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}>
                                {settings.database_type === 'sqlite' ? 'SQLite' : settings.database_type === 'postgresql' ? 'PostgreSQL' : settings.database_type}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                className="input w-full font-mono text-sm"
                                value={settings.database_url}
                                onChange={(e) => {
                                    const url = e.target.value
                                    let dbType = 'unknown'
                                    if (url.includes('sqlite')) dbType = 'sqlite'
                                    else if (url.includes('postgres')) dbType = 'postgresql'
                                    setSettings({ ...settings, database_url: url, database_type: dbType })
                                }}
                                placeholder="sqlite+aiosqlite:///./iot_dashboard.db"
                            />
                            <button
                                onClick={testDb}
                                disabled={testing === 'db'}
                                className="px-3 py-2 rounded-lg text-xs font-medium bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-500/30 transition-all disabled:opacity-50 whitespace-nowrap"
                            >
                                {testing === 'db' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            SQLite: <code className="text-gray-500">sqlite+aiosqlite:///./file.db</code> &nbsp;|&nbsp;
                            PostgreSQL: <code className="text-gray-500">postgresql+asyncpg://user:pass@host:5432/db</code>
                        </p>
                        <StatusBadge test={dbTest} />
                    </div>
                </div>
            </div>

            {/* ===== Appearance ===== */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                    <Moon className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-white">Appearance</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white">Theme</p>
                            <p className="text-sm text-gray-500">Choose your preferred theme</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setSettings({ ...settings, theme: 'light' })}
                                className={`p-2 rounded-lg ${settings.theme === 'light' ? 'bg-primary-600 text-white' : 'bg-dark-300 text-gray-400'}`}
                            >
                                <Sun className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                className={`p-2 rounded-lg ${settings.theme === 'dark' ? 'bg-primary-600 text-white' : 'bg-dark-300 text-gray-400'}`}
                            >
                                <Moon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Notifications ===== */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                    <Bell className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-white">Notifications</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white">Enable Notifications</p>
                            <p className="text-sm text-gray-500">Receive alarm notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white">Sound Alerts</p>
                            <p className="text-sm text-gray-500">Play sound for critical alarms</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.soundAlerts} onChange={(e) => setSettings({ ...settings, soundAlerts: e.target.checked })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* ===== Connection ===== */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                    <Wifi className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-white">Connection</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white">Auto Refresh</p>
                            <p className="text-sm text-gray-500">Automatically refresh dashboard data</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.autoRefresh} onChange={(e) => setSettings({ ...settings, autoRefresh: e.target.checked })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                    <div>
                        <label className="text-white block mb-2">Refresh Interval (seconds)</label>
                        <input type="number" className="input w-32" value={settings.refreshInterval} onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 30 })} min={5} max={300} />
                    </div>
                    <div>
                        <label className="text-white block mb-2">API Endpoint</label>
                        <input type="text" className="input w-full" value={settings.apiEndpoint} onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-white block mb-2">WebSocket Endpoint</label>
                        <input type="text" className="input w-full" value={settings.wsEndpoint} onChange={(e) => setSettings({ ...settings, wsEndpoint: e.target.value })} />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pb-8">
                <div>
                    {saved && (
                        <span className="flex items-center space-x-1.5 text-green-400 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Settings saved successfully!</span>
                        </span>
                    )}
                </div>
                <button onClick={handleSave} className="btn-primary flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                </button>
            </div>
        </div>
    )
}
