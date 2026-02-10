'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Filter, Check, RefreshCw } from 'lucide-react'
import AlarmList from '@/components/dashboard/AlarmList'
import { api } from '@/lib/api'

interface Alarm {
    id: string
    device_id: string
    severity: string
    message: string
    ts_open: string
    ts_close: string | null
    acknowledged: boolean
    device?: { name: string }
}

export default function AlarmsPage() {
    const [alarms, setAlarms] = useState<Alarm[]>([])
    const [loading, setLoading] = useState(true)
    const [severity, setSeverity] = useState('')
    const [activeOnly, setActiveOnly] = useState(true)
    const [summary, setSummary] = useState({ critical: 0, warning: 0, info: 0, total: 0 })

    useEffect(() => {
        loadAlarms()
        loadSummary()
    }, [severity, activeOnly])

    async function loadAlarms() {
        try {
            setLoading(true)
            const data = await api.getAlarms({
                severity: severity || undefined,
                active_only: activeOnly,
                limit: 100,
            })
            setAlarms(data as Alarm[])
        } catch (err) {
            console.error('Failed to load alarms:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadSummary() {
        try {
            const data = await api.getAlarmsSummary()
            setSummary(data as { critical: number; warning: number; info: number; total: number })
        } catch (err) {
            console.error('Failed to load summary:', err)
        }
    }

    async function handleAcknowledge(alarmId: string) {
        try {
            await api.acknowledgeAlarm(alarmId, 'operator')
            loadAlarms()
        } catch (err) {
            console.error('Failed to acknowledge:', err)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Alarms</h1>
                    <p className="text-gray-400 mt-1">Monitor and manage system alerts</p>
                </div>
                <button
                    onClick={() => { loadAlarms(); loadSummary(); }}
                    className="btn-secondary flex items-center"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card border border-red-500/30 bg-red-500/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Critical</p>
                            <p className="text-3xl font-bold text-red-400">{summary.critical}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                </div>
                <div className="card border border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Warning</p>
                            <p className="text-3xl font-bold text-yellow-400">{summary.warning}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    </div>
                </div>
                <div className="card border border-blue-500/30 bg-blue-500/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Info</p>
                            <p className="text-3xl font-bold text-blue-400">{summary.info}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-blue-400" />
                    </div>
                </div>
                <div className="card border border-green-500/30 bg-green-500/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Total Active</p>
                            <p className="text-3xl font-bold text-green-400">{summary.total}</p>
                        </div>
                        <Check className="w-8 h-8 text-green-400" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="input"
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                        >
                            <option value="">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                        </select>
                    </div>

                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={activeOnly}
                            onChange={(e) => setActiveOnly(e.target.checked)}
                            className="rounded border-dark-100 bg-dark-300"
                        />
                        <span className="text-sm text-gray-400">Active only</span>
                    </label>

                    <span className="text-sm text-gray-400 ml-auto">
                        {alarms.length} alarms
                    </span>
                </div>
            </div>

            {/* Alarm List */}
            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : (
                    <AlarmList alarms={alarms} onAcknowledge={handleAcknowledge} />
                )}
            </div>
        </div>
    )
}
