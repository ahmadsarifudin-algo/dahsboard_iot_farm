'use client'

import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, AlertCircle, Info, Check } from 'lucide-react'
import clsx from 'clsx'

interface Alarm {
    id: string
    device_id: string
    severity: string
    message: string
    ts_open: string
    acknowledged: boolean
    device?: {
        name: string
    }
}

interface AlarmListProps {
    alarms: Alarm[]
    onAcknowledge?: (alarmId: string) => void
}

const severityConfig = {
    critical: {
        icon: AlertTriangle,
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        badge: 'badge-danger',
    },
    warning: {
        icon: AlertCircle,
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        badge: 'badge-warning',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        badge: 'badge-info',
    },
}

export default function AlarmList({ alarms, onAcknowledge }: AlarmListProps) {
    if (alarms.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No active alarms</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {alarms.map((alarm) => {
                const config = severityConfig[alarm.severity as keyof typeof severityConfig] || severityConfig.info
                const Icon = config.icon

                return (
                    <div
                        key={alarm.id}
                        className={clsx(
                            'flex items-center justify-between p-3 rounded-lg border transition-all',
                            config.bg,
                            config.border,
                            'hover:bg-opacity-20'
                        )}
                    >
                        <div className="flex items-center space-x-3">
                            <Icon className={clsx('w-5 h-5', config.text)} />
                            <div>
                                <p className="text-sm text-white">{alarm.message}</p>
                                <p className="text-xs text-gray-500">
                                    {alarm.device?.name || alarm.device_id} • {formatDistanceToNow(new Date(alarm.ts_open), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className={clsx('badge', config.badge)}>
                                {alarm.severity}
                            </span>
                            {!alarm.acknowledged && onAcknowledge && (
                                <button
                                    onClick={() => onAcknowledge(alarm.id)}
                                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-300"
                                >
                                    Ack
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
