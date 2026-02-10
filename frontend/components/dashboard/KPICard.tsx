import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface KPICardProps {
    title: string
    value: number | string
    icon: LucideIcon
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
    subtitle?: string
    trend?: {
        value: number
        positive: boolean
    }
}

const colorMap = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const iconColorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
}

export default function KPICard({
    title,
    value,
    icon: Icon,
    color = 'blue',
    subtitle,
    trend,
}: KPICardProps) {
    return (
        <div className={clsx('card card-hover border', colorMap[color])}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-400">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                    {trend && (
                        <p className={clsx(
                            'text-xs mt-1',
                            trend.positive ? 'text-green-400' : 'text-red-400'
                        )}>
                            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </p>
                    )}
                </div>
                <div className={clsx('p-3 rounded-lg', `bg-${color}-500/10`)}>
                    <Icon className={clsx('w-6 h-6', iconColorMap[color])} />
                </div>
            </div>
        </div>
    )
}
