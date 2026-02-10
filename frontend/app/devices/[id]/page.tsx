'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
    ArrowLeft, Wifi, WifiOff, Settings, RefreshCw,
    Thermometer, Droplets, Gauge, Zap, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import TelemetryChart from '@/components/device/TelemetryChart'
import ControlPanel from '@/components/device/ControlPanel'
import AlarmTimeline from '@/components/device/AlarmTimeline'
import { api } from '@/lib/api'

interface DeviceDetail {
    id: string
    device_key: string
    name: string
    type: string
    site_id: string | null
    firmware: string | null
    status: string
    last_seen: string | null
    shadow_desired: Record<string, any>
    shadow_reported: Record<string, any>
    metadata: Record<string, any>
    site?: {
        id: string
        name: string
    }
}

const metricIcons: Record<string, any> = {
    temperature: Thermometer,
    humidity: Droplets,
    pressure: Gauge,
    power: Zap,
}

export default function DeviceDetailPage() {
    const params = useParams()
    const deviceId = params.id as string

    const [device, setDevice] = useState<DeviceDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'telemetry' | 'control' | 'alarms'>('telemetry')
    const [latestTelemetry, setLatestTelemetry] = useState<Record<string, any>>({})

    useEffect(() => {
        loadDevice()
        loadLatestTelemetry()
    }, [deviceId])

    async function loadDevice() {
        try {
            const data = await api.getDevice(deviceId)
            setDevice(data as DeviceDetail)
        } catch (err) {
            console.error('Failed to load device:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadLatestTelemetry() {
        try {
            const data = await api.getLatestTelemetry(deviceId)
            setLatestTelemetry((data as any).latest || {})
        } catch (err) {
            console.error('Failed to load telemetry:', err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    if (!device) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl text-white">Device not found</h2>
                <Link href="/fleet" className="text-primary-400 mt-2 inline-block">
                    Back to Fleet
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                    <Link href="/fleet" className="p-2 text-gray-400 hover:text-white mt-1">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{device.name}</h1>
                        <p className="text-gray-400">{device.device_key}</p>
                        <div className="flex items-center space-x-4 mt-2">
                            {device.status === 'online' ? (
                                <span className="badge badge-success flex items-center">
                                    <Wifi className="w-3 h-3 mr-1" /> Online
                                </span>
                            ) : (
                                <span className="badge bg-gray-500/20 text-gray-400 flex items-center">
                                    <WifiOff className="w-3 h-3 mr-1" /> Offline
                                </span>
                            )}
                            <span className="badge badge-info capitalize">{device.type}</span>
                            {device.firmware && (
                                <span className="text-sm text-gray-500">v{device.firmware}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => { loadDevice(); loadLatestTelemetry(); }}
                        className="btn-secondary flex items-center"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </button>
                    <button className="btn-secondary">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Latest Metrics */}
            {Object.keys(latestTelemetry).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(latestTelemetry).map(([metric, data]: [string, any]) => {
                        const Icon = metricIcons[metric] || Gauge
                        return (
                            <div key={metric} className="card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400 capitalize">{metric}</span>
                                    <Icon className="w-4 h-4 text-primary-500" />
                                </div>
                                <p className="text-2xl font-bold text-white">
                                    {typeof data.value === 'number' ? data.value.toFixed(1) : data.value}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatDistanceToNow(new Date(data.time), { addSuffix: true })}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-dark-100">
                <div className="flex space-x-4">
                    {(['telemetry', 'control', 'alarms'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab
                                ? 'text-primary-400 border-primary-500'
                                : 'text-gray-400 border-transparent hover:text-white'
                                }`}
                        >
                            {tab === 'alarms' && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="card">
                {activeTab === 'telemetry' && (
                    <TelemetryChart deviceId={deviceId} />
                )}
                {activeTab === 'control' && (
                    <ControlPanel device={device} onUpdate={loadDevice} />
                )}
                {activeTab === 'alarms' && (
                    <AlarmTimeline deviceId={deviceId} />
                )}
            </div>

            {/* Shadow State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">Desired State</h3>
                    <pre className="bg-dark-400 p-4 rounded-lg text-sm text-gray-300 overflow-auto">
                        {JSON.stringify(device.shadow_desired, null, 2) || '{}'}
                    </pre>
                </div>
                <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">Reported State</h3>
                    <pre className="bg-dark-400 p-4 rounded-lg text-sm text-gray-300 overflow-auto">
                        {JSON.stringify(device.shadow_reported, null, 2) || '{}'}
                    </pre>
                </div>
            </div>
        </div>
    )
}
