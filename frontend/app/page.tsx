'use client'

import { useEffect, useState } from 'react'
import {
    Bird,
    Scale,
    Leaf,
    Skull,
    ThermometerSun,
    Bell,
    TrendingUp,
    TrendingDown,
    Minus,
    Activity,
    BarChart3
} from 'lucide-react'
import KandangPerformanceList from '@/components/dashboard/KandangPerformanceList'
import DataPlayground from '@/components/dashboard/DataPlayground'
import { api } from '@/lib/api'
import { useWebSocket } from '@/lib/websocket'
import { useStore } from '@/lib/store'

// Dummy KPI data for Matrix Farm Poultry
const FARM_KPI = {
    produksi: {
        totalLiveBirds: 245800,
        totalLiveBirdsTrend: 2.3,
        totalPanen: 125600, // kg
        totalPanenTrend: -1.2,
    },
    efisiensi: {
        fcr: 1.72,
        fcrTarget: 1.65,
        fcrTrend: 0.02,
    },
    kesehatan: {
        mortalitas: 2.8, // %
        mortalitasTarget: 3.0,
        mortalitasTrend: -0.3,
    },
    lingkungan: {
        compliance: 94.2, // %
        complianceTarget: 95,
        complianceTrend: 0.5,
    },
    operasional: {
        alarmRate: 3.2, // per hari
        alarmRateTrend: -0.5,
    }
}

interface KPICardProps {
    title: string
    value: string | number
    unit?: string
    subtitle?: string
    icon: React.ElementType
    color: string
    trend?: number
    trendLabel?: string
    target?: number
    targetLabel?: string
}

function KPICard({ title, value, unit, subtitle, icon: Icon, color, trend, trendLabel, target, targetLabel }: KPICardProps) {
    const colorClasses: Record<string, string> = {
        blue: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
        green: 'from-green-500/20 to-green-600/10 text-green-400 border-green-500/30',
        yellow: 'from-yellow-500/20 to-yellow-600/10 text-yellow-400 border-yellow-500/30',
        red: 'from-red-500/20 to-red-600/10 text-red-400 border-red-500/30',
        purple: 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30',
        cyan: 'from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30',
        orange: 'from-orange-500/20 to-orange-600/10 text-orange-400 border-orange-500/30',
        pink: 'from-pink-500/20 to-pink-600/10 text-pink-400 border-pink-500/30'
    }

    const iconColors: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-400',
        green: 'bg-green-500/20 text-green-400',
        yellow: 'bg-yellow-500/20 text-yellow-400',
        red: 'bg-red-500/20 text-red-400',
        purple: 'bg-purple-500/20 text-purple-400',
        cyan: 'bg-cyan-500/20 text-cyan-400',
        orange: 'bg-orange-500/20 text-orange-400',
        pink: 'bg-pink-500/20 text-pink-400'
    }

    const getTrendIcon = () => {
        if (trend === undefined) return null
        if (trend > 0) return <TrendingUp className="w-3 h-3" />
        if (trend < 0) return <TrendingDown className="w-3 h-3" />
        return <Minus className="w-3 h-3" />
    }

    const getTrendColor = () => {
        if (trend === undefined) return 'text-gray-400'
        // For most metrics, positive trend is good
        if (title.includes('Mortalitas') || title.includes('FCR') || title.includes('Alarm')) {
            return trend <= 0 ? 'text-green-400' : 'text-red-400'
        }
        return trend >= 0 ? 'text-green-400' : 'text-red-400'
    }

    return (
        <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color]} border p-4`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">{title}</p>
                    <div className="flex items-baseline space-x-1">
                        <p className="text-2xl font-bold text-white">
                            {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
                        </p>
                        {unit && <span className="text-sm text-gray-400">{unit}</span>}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                    {trend !== undefined && (
                        <div className={`flex items-center space-x-1 mt-2 text-xs ${getTrendColor()}`}>
                            {getTrendIcon()}
                            <span>{trend > 0 ? '+' : ''}{trend}{trendLabel || ''}</span>
                        </div>
                    )}
                    {target !== undefined && (
                        <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Target: {target}{targetLabel}</span>
                            </div>
                            <div className="h-1.5 bg-dark-400 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${typeof value === 'number' && value >= target ? 'bg-green-500' : 'bg-yellow-500'}`}
                                    style={{ width: `${Math.min(100, (typeof value === 'number' ? value / target : 0) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    )
}

export default function OverviewPage() {
    const [loading, setLoading] = useState(true)
    const { stats, setStats, alarms, setAlarms, sites, setSites } = useStore()

    // Connect WebSocket
    useWebSocket()

    useEffect(() => {
        loadDashboardData()
    }, [])

    async function loadDashboardData() {
        try {
            const [statsData, alarmsData, sitesData] = await Promise.all([
                api.getOverviewStats(),
                api.getAlarms({ active_only: true, limit: 10 }),
                api.getSitesMapData(),
            ])

            const typedStats = statsData as any
            setStats({
                totalDevices: typedStats.total_devices,
                onlineDevices: typedStats.online_devices,
                offlineDevices: typedStats.offline_devices,
                activeAlarms: typedStats.active_alarms,
                criticalAlarms: typedStats.critical_alarms,
                warningAlarms: typedStats.warning_alarms,
                messageRate: typedStats.message_rate,
                totalSites: typedStats.total_sites,
            })

            setAlarms(alarmsData as any[])
            setSites(sitesData as any[])
        } catch (err) {
            console.error('Failed to load dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <BarChart3 className="w-7 h-7 mr-3 text-primary-500" />
                        Matrix Farm Poultry
                    </h1>
                    <p className="text-gray-400 mt-1">KPI Dashboard - Real-time monitoring</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Activity className="w-4 h-4 text-green-500" />
                        <span>{stats.messageRate} msg/min</span>
                    </div>
                    <div className="px-3 py-1 bg-dark-300 rounded-lg text-sm text-gray-400">
                        {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Domain: Produksi */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <Bird className="w-4 h-4 mr-2" />
                    Produksi
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <KPICard
                        title="Total Live Birds"
                        value={FARM_KPI.produksi.totalLiveBirds}
                        unit="ekor"
                        icon={Bird}
                        color="blue"
                        trend={FARM_KPI.produksi.totalLiveBirdsTrend}
                        trendLabel="% vs minggu lalu"
                        subtitle="Σ populasi hidup per kandang"
                    />
                    <KPICard
                        title="Total Panen"
                        value={FARM_KPI.produksi.totalPanen}
                        unit="kg"
                        icon={Scale}
                        color="green"
                        trend={FARM_KPI.produksi.totalPanenTrend}
                        trendLabel="% vs siklus lalu"
                        subtitle="Σ berat panen periode ini"
                    />
                </div>
            </div>

            {/* Domain: Efisiensi & Kesehatan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                        <Leaf className="w-4 h-4 mr-2" />
                        Efisiensi
                    </h2>
                    <KPICard
                        title="FCR Area"
                        value={FARM_KPI.efisiensi.fcr}
                        icon={Leaf}
                        color="cyan"
                        trend={FARM_KPI.efisiensi.fcrTrend}
                        trendLabel=""
                        target={FARM_KPI.efisiensi.fcrTarget}
                        targetLabel=""
                        subtitle="Total pakan / total bobot hidup"
                    />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                        <Skull className="w-4 h-4 mr-2" />
                        Kesehatan
                    </h2>
                    <KPICard
                        title="Mortalitas % Area"
                        value={FARM_KPI.kesehatan.mortalitas}
                        unit="%"
                        icon={Skull}
                        color="red"
                        trend={FARM_KPI.kesehatan.mortalitasTrend}
                        trendLabel="%"
                        target={FARM_KPI.kesehatan.mortalitasTarget}
                        targetLabel="%"
                        subtitle="Total mati / total DOC"
                    />
                </div>
            </div>

            {/* Domain: Lingkungan & Operasional */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                        <ThermometerSun className="w-4 h-4 mr-2" />
                        Lingkungan
                    </h2>
                    <KPICard
                        title="Compliance Env %"
                        value={FARM_KPI.lingkungan.compliance}
                        unit="%"
                        icon={ThermometerSun}
                        color="orange"
                        trend={FARM_KPI.lingkungan.complianceTrend}
                        trendLabel="%"
                        target={FARM_KPI.lingkungan.complianceTarget}
                        targetLabel="%"
                        subtitle="% jam/hari dalam range optimal"
                    />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                        <Bell className="w-4 h-4 mr-2" />
                        Operasional
                    </h2>
                    <KPICard
                        title="Alarm Rate"
                        value={FARM_KPI.operasional.alarmRate}
                        unit="/ hari"
                        icon={Bell}
                        color="yellow"
                        trend={FARM_KPI.operasional.alarmRateTrend}
                        trendLabel=" vs kemarin"
                        subtitle="#alarm per hari"
                    />
                </div>
            </div>

            {/* Kandang Performance List */}
            <div className="card">
                <KandangPerformanceList />
            </div>

            {/* Data Playground - Market Intelligence */}
            <DataPlayground />
        </div>
    )
}
