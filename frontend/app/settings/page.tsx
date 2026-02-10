'use client'

import { useState } from 'react'
import { Save, Moon, Sun, Bell, Database, Wifi, Shield } from 'lucide-react'

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        theme: 'dark',
        notifications: true,
        soundAlerts: false,
        autoRefresh: true,
        refreshInterval: 30,
        apiEndpoint: 'http://localhost:8000',
        wsEndpoint: 'ws://localhost:8000/ws',
    })

    const [saved, setSaved] = useState(false)

    function handleSave() {
        // Save to localStorage
        localStorage.setItem('iot-settings', JSON.stringify(settings))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 mt-1">Configure your dashboard preferences</p>
            </div>

            {/* Appearance */}
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
                                className={`p-2 rounded-lg ${settings.theme === 'light'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-dark-300 text-gray-400'
                                    }`}
                            >
                                <Sun className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                className={`p-2 rounded-lg ${settings.theme === 'dark'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-dark-300 text-gray-400'
                                    }`}
                            >
                                <Moon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
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
                            <input
                                type="checkbox"
                                checked={settings.notifications}
                                onChange={(e) =>
                                    setSettings({ ...settings, notifications: e.target.checked })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white">Sound Alerts</p>
                            <p className="text-sm text-gray-500">Play sound for critical alarms</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.soundAlerts}
                                onChange={(e) =>
                                    setSettings({ ...settings, soundAlerts: e.target.checked })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Data & Refresh */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                    <Database className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-white">Data & Refresh</h2>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white">Auto Refresh</p>
                            <p className="text-sm text-gray-500">Automatically refresh dashboard data</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoRefresh}
                                onChange={(e) =>
                                    setSettings({ ...settings, autoRefresh: e.target.checked })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                    <div>
                        <label className="text-white block mb-2">Refresh Interval (seconds)</label>
                        <input
                            type="number"
                            className="input w-32"
                            value={settings.refreshInterval}
                            onChange={(e) =>
                                setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 30 })
                            }
                            min={5}
                            max={300}
                        />
                    </div>
                </div>
            </div>

            {/* Connection */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                    <Wifi className="w-5 h-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-white">Connection</h2>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-white block mb-2">API Endpoint</label>
                        <input
                            type="text"
                            className="input w-full"
                            value={settings.apiEndpoint}
                            onChange={(e) =>
                                setSettings({ ...settings, apiEndpoint: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <label className="text-white block mb-2">WebSocket Endpoint</label>
                        <input
                            type="text"
                            className="input w-full"
                            value={settings.wsEndpoint}
                            onChange={(e) =>
                                setSettings({ ...settings, wsEndpoint: e.target.value })
                            }
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between">
                <div>
                    {saved && (
                        <span className="text-green-400 text-sm">Settings saved successfully!</span>
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
