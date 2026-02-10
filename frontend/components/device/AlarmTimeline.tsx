'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, AlertCircle, Info, Check, Clock } from 'lucide-react'
import clsx from 'clsx'
import { api } from '@/lib/api'

interface Alarm {
    id: string
    device_id: string
    severity: string
    message: string
    ts_open: string
    ts_close: string | null
    acknowledged: boolean
    acknowledged_by: string | null
}

interface AlarmTimelineProps {
    deviceId: string
}

const severityConfig = {
    critical: {
        icon: AlertTriangle,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
    },
    warning: {
        icon: AlertCircle,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
    },
    info: {
        icon: Info,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
    },
}

export default function AlarmTimeline({ deviceId }: AlarmTimelineProps) {
    const [alarms, setAlarms] = useState<Alarm[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAlarms()
    }, [deviceId])

    async function loadAlarms() {
        try {
            const data = await api.getAlarms({ device_id: deviceId, active_only: false, limit: 50 })
            setAlarms(data as Alarm[])
        } catch (err) {
            console.error('Failed to load alarms:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleAcknowledge(alarmId: string) {
        try {
            await api.acknowledgeAlarm(alarmId, 'operator')
            loadAlarms()
        } catch (err) {
            console.error('Failed to acknowledge alarm:', err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    if (alarms.length === 0) {
        return (
            <div className="text-center py-12">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="text-gray-400">No alarm history for this device</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Alarm History</h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-dark-100" />

                {/* Timeline items */}
                <div className="space-y-4">
                    {alarms.map((alarm) => {
                        const config = severityConfig[alarm.severity as keyof typeof severityConfig] || severityConfig.info
                        const Icon = config.icon
                        const isActive = !alarm.ts_close

                        return (
                            <div key={alarm.id} className="relative flex items-start pl-10">
                                {/* Timeline dot */}
                                <div className={clsx(
                                    'absolute left-2 w-5 h-5 rounded-full flex items-center justify-center',
                                    config.bg,
                                    config.border,
                                    'border'
                                )}>
                                    {isActive ? (
                                        <div className={clsx('w-2 h-2 rounded-full', config.color.replace('text-', 'bg-'))} />
                                    ) : (
                                        <Check className="w-3 h-3 text-gray-500" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className={clsx(
                                    'flex-1 p-4 rounded-lg border',
                                    config.bg,
                                    config.border
                                )}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3">
                                            <Icon className={clsx('w-5 h-5 mt-0.5', config.color)} />
                                            <div>
                                                <p className="text-white">{alarm.message}</p>
                                                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                                                    <span className="flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {formatDistanceToNow(new Date(alarm.ts_open), { addSuffix: true })}
                                                    </span>
                                                    {alarm.ts_close && (
                                                        <span>
                                                            Resolved {formatDistanceToNow(new Date(alarm.ts_close), { addSuffix: true })}
                                                        </span>
                                                    )}
                                                    {alarm.acknowledged && (
                                                        <span>
                                                            Acked by {alarm.acknowledged_by}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isActive && !alarm.acknowledged && (
                                            <button
                                                onClick={() => handleAcknowledge(alarm.id)}
                                                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-300"
                                            >
                                                Acknowledge
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
