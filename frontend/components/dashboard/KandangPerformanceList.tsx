'use client'

import { useState } from 'react'
import { Building2, Award, Users, Calendar, TrendingUp, ChevronRight, Target, Thermometer, BarChart3, X } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

// Dummy Kandang Performance Data
// IP = (Livability% × BW × 100) / (umur_panen × FCR)
// IPC = 0.70×CQS + 0.30×CCS (0-100)
export interface KandangPerformance {
    id: string
    name: string
    populasi: number
    umur: number          // hari
    totalNilai: number    // kg (panen_kg)
    livability: number    // %
    bw: number            // kg/ekor
    fcr: number
    ip: number
    ipc: number
    cqs: number           // Climate Quality Score
    ccs: number           // Control Quality Score
    quadrant: 'A' | 'B' | 'C' | 'D'
    flags: string[]
}

export const DUMMY_KANDANG_PERFORMANCE: KandangPerformance[] = [
    {
        id: 'kandang-001', name: 'Kandang A1', populasi: 32000, umur: 32,
        totalNilai: 52800, livability: 96.2, bw: 1.85, fcr: 1.62,
        ip: 343, ipc: 88.5, cqs: 90.2, ccs: 84.6, quadrant: 'A',
        flags: []
    },
    {
        id: 'kandang-002', name: 'Kandang A2', populasi: 28000, umur: 28,
        totalNilai: 39200, livability: 94.8, bw: 1.52, fcr: 1.58,
        ip: 326, ipc: 82.1, cqs: 84.3, ccs: 76.9, quadrant: 'A',
        flags: ['TS_high_swing']
    },
    {
        id: 'kandang-003', name: 'Kandang B1', populasi: 35000, umur: 35,
        totalNilai: 54250, livability: 93.1, bw: 1.78, fcr: 1.71,
        ip: 277, ipc: 75.3, cqs: 78.1, ccs: 68.7, quadrant: 'B',
        flags: ['TU_low', 'hunting_high']
    },
    {
        id: 'kandang-004', name: 'Kandang B2', populasi: 30000, umur: 30,
        totalNilai: 42000, livability: 91.5, bw: 1.65, fcr: 1.75,
        ip: 288, ipc: 91.2, cqs: 92.8, ccs: 87.4, quadrant: 'C',
        flags: ['FCR_high']
    },
    {
        id: 'kandang-005', name: 'Kandang C1', populasi: 25000, umur: 33,
        totalNilai: 34500, livability: 89.2, bw: 1.58, fcr: 1.82,
        ip: 235, ipc: 65.8, cqs: 67.2, ccs: 62.5, quadrant: 'D',
        flags: ['CO2_high', 'TU_low', 'hunting_high']
    },
    {
        id: 'kandang-006', name: 'Kandang C2', populasi: 27000, umur: 26,
        totalNilai: 35100, livability: 95.5, bw: 1.42, fcr: 1.55,
        ip: 337, ipc: 70.4, cqs: 72.1, ccs: 66.4, quadrant: 'B',
        flags: ['TS_high_swing', 'missing_setpoint']
    },
]

function getIPColor(ip: number): string {
    if (ip >= 330) return 'text-green-400'
    if (ip >= 280) return 'text-yellow-400'
    return 'text-red-400'
}

function getIPBg(ip: number): string {
    if (ip >= 330) return 'bg-green-500/20 border-green-500/30'
    if (ip >= 280) return 'bg-yellow-500/20 border-yellow-500/30'
    return 'bg-red-500/20 border-red-500/30'
}

function getIPCColor(ipc: number): string {
    if (ipc >= 80) return 'text-green-400'
    if (ipc >= 65) return 'text-yellow-400'
    return 'text-red-400'
}

function getIPCBg(ipc: number): string {
    if (ipc >= 80) return 'bg-green-500/15'
    if (ipc >= 65) return 'bg-yellow-500/15'
    return 'bg-red-500/15'
}

function getIPBarColor(ip: number): string {
    if (ip >= 330) return '#22c55e'
    if (ip >= 280) return '#eab308'
    return '#ef4444'
}

function getIPCBarColor(ipc: number): string {
    if (ipc >= 80) return '#22c55e'
    if (ipc >= 65) return '#eab308'
    return '#ef4444'
}

function getQuadrantInfo(q: string): { label: string; color: string; desc: string } {
    switch (q) {
        case 'A': return { label: 'A', color: 'bg-green-500/20 text-green-400 border-green-500/40', desc: 'Best practice' }
        case 'B': return { label: 'B', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', desc: 'Hidden risk' }
        case 'C': return { label: 'C', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', desc: 'Non-climate issue' }
        case 'D': return { label: 'D', color: 'bg-red-500/20 text-red-400 border-red-500/40', desc: 'Priority fix' }
        default: return { label: '-', color: 'bg-gray-500/20 text-gray-400', desc: '' }
    }
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-dark-300 border border-dark-100 rounded-lg p-3 shadow-xl">
            <p className="text-sm font-medium text-white mb-1">{label}</p>
            {payload.map((entry: any, idx: number) => (
                <p key={idx} className="text-xs" style={{ color: entry.color }}>
                    {entry.name}: <span className="font-bold">{entry.value}</span>
                </p>
            ))}
        </div>
    )
}

interface KandangPerformanceListProps {
    data?: KandangPerformance[]
}

export default function KandangPerformanceList({ data = DUMMY_KANDANG_PERFORMANCE }: KandangPerformanceListProps) {
    const sorted = [...data].sort((a, b) => b.ip - a.ip)
    const [showChart, setShowChart] = useState(false)
    const [chartType, setChartType] = useState<'ip' | 'ipc' | 'combined'>('combined')

    // Prepare chart data
    const chartData = sorted.map(k => ({
        name: k.name,
        IP: k.ip,
        IPC: k.ipc,
        CQS: k.cqs,
        CCS: k.ccs,
        Livability: k.livability,
        FCR: k.fcr,
        BW: k.bw,
    }))

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center">
                    <Award className="w-5 h-5 mr-2 text-amber-400" />
                    Kandang Performance
                </h2>
                <div className="flex items-center space-x-3">
                    {/* Chart toggle button */}
                    <button
                        onClick={() => setShowChart(!showChart)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showChart
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300 border border-dark-100'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>Lihat Grafik</span>
                    </button>
                    <div className="hidden md:flex items-center space-x-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        <span className="text-gray-500">Excellent</span>
                        <span className="w-2 h-2 rounded-full bg-yellow-400 ml-2"></span>
                        <span className="text-gray-500">Average</span>
                        <span className="w-2 h-2 rounded-full bg-red-400 ml-2"></span>
                        <span className="text-gray-500">Low</span>
                    </div>
                </div>
            </div>

            {/* Charts Section (Collapsible) */}
            {showChart && (
                <div className="space-y-4 animate-fade-in">
                    {/* Chart type tabs */}
                    <div className="flex items-center space-x-2">
                        {[
                            { key: 'combined' as const, label: 'IP & IPC' },
                            { key: 'ip' as const, label: 'Detail IP' },
                            { key: 'ipc' as const, label: 'Detail IPC' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setChartType(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chartType === tab.key
                                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                                    : 'bg-dark-400 text-gray-500 hover:text-gray-300 border border-dark-100'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Combined IP & IPC Chart */}
                    {chartType === 'combined' && (
                        <div className="p-4 rounded-xl bg-dark-400 border border-dark-100">
                            <h3 className="text-sm font-medium text-gray-400 mb-4">Perbandingan IP & IPC per Kandang</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis yAxisId="ip" orientation="left" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'IP', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                                    <YAxis yAxisId="ipc" orientation="right" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'IPC', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                                    <Bar yAxisId="ip" dataKey="IP" radius={[4, 4, 0, 0]} barSize={28}>
                                        {chartData.map((entry, idx) => (
                                            <Cell key={idx} fill={getIPBarColor(entry.IP)} fillOpacity={0.85} />
                                        ))}
                                    </Bar>
                                    <Bar yAxisId="ipc" dataKey="IPC" radius={[4, 4, 0, 0]} barSize={28}>
                                        {chartData.map((entry, idx) => (
                                            <Cell key={idx} fill={getIPCBarColor(entry.IPC)} fillOpacity={0.6} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Threshold lines legend */}
                            <div className="flex items-center justify-center space-x-6 mt-3 text-xs text-gray-500">
                                <span>IP: <span className="text-green-400">≥330</span> Excellent · <span className="text-yellow-400">≥280</span> Average · <span className="text-red-400">&lt;280</span> Low</span>
                                <span>IPC: <span className="text-green-400">≥80</span> Excellent · <span className="text-yellow-400">≥65</span> Average · <span className="text-red-400">&lt;65</span> Low</span>
                            </div>
                        </div>
                    )}

                    {/* Detail IP Chart */}
                    {chartType === 'ip' && (
                        <div className="p-4 rounded-xl bg-dark-400 border border-dark-100">
                            <h3 className="text-sm font-medium text-gray-400 mb-4">Detail IP - Komponen Produksi</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* IP Bar */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Index Performance (IP)</p>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={chartData} layout="vertical" barSize={20}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={85} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="IP" radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, idx) => (
                                                    <Cell key={idx} fill={getIPBarColor(entry.IP)} fillOpacity={0.85} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Production metrics */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Livability, FCR, BW</p>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                                            <Bar dataKey="Livability" fill="#22c55e" fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={16} />
                                            <Bar dataKey="BW" fill="#38bdf8" fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={16} />
                                            <Bar dataKey="FCR" fill="#f59e0b" fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detail IPC Chart */}
                    {chartType === 'ipc' && (
                        <div className="p-4 rounded-xl bg-dark-400 border border-dark-100">
                            <h3 className="text-sm font-medium text-gray-400 mb-4">Detail IPC - Climate & Control Quality</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* IPC Bar */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">IPC Score (0-100)</p>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={chartData} layout="vertical" barSize={20}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={85} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="IPC" radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, idx) => (
                                                    <Cell key={idx} fill={getIPCBarColor(entry.IPC)} fillOpacity={0.85} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* CQS vs CCS */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">CQS (Climate) vs CCS (Control)</p>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                                            <Bar dataKey="CQS" fill="#0ea5e9" fillOpacity={0.75} radius={[3, 3, 0, 0]} barSize={22} name="CQS (Climate)" />
                                            <Bar dataKey="CCS" fill="#a855f7" fillOpacity={0.75} radius={[3, 3, 0, 0]} barSize={22} name="CCS (Control)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-dark-100">
                <table className="w-full">
                    <thead>
                        <tr className="bg-dark-400 text-xs text-gray-500 uppercase tracking-wider">
                            <th className="text-left py-3 px-4 font-medium">#</th>
                            <th className="text-left py-3 px-4 font-medium">Kandang</th>
                            <th className="text-right py-3 px-4 font-medium">Populasi</th>
                            <th className="text-right py-3 px-4 font-medium">Umur (hari)</th>
                            <th className="text-right py-3 px-4 font-medium">Total Nilai (kg)</th>
                            <th className="text-center py-3 px-4 font-medium">IP</th>
                            <th className="text-center py-3 px-4 font-medium">IPC</th>
                            <th className="text-center py-3 px-4 font-medium">Quadrant</th>
                            <th className="text-left py-3 px-4 font-medium">Issues</th>
                            <th className="py-3 px-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100">
                        {sorted.map((k, idx) => {
                            const qi = getQuadrantInfo(k.quadrant)
                            return (
                                <tr key={k.id} className="hover:bg-dark-400/50 transition-colors">
                                    <td className="py-3 px-4 text-sm text-gray-500 font-mono">{idx + 1}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-primary-400" />
                                            </div>
                                            <span className="font-medium text-white text-sm">{k.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end space-x-1.5">
                                            <Users className="w-3.5 h-3.5 text-gray-500" />
                                            <span className="text-sm text-gray-300">{k.populasi.toLocaleString('id-ID')}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end space-x-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                            <span className="text-sm text-gray-300">{k.umur}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-gray-300">
                                        {k.totalNilai.toLocaleString('id-ID')}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold border ${getIPBg(k.ip)} ${getIPColor(k.ip)}`}>
                                            {k.ip}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-sm font-bold ${getIPCColor(k.ipc)}`}>{k.ipc.toFixed(1)}</span>
                                            <div className="w-14 h-1.5 bg-dark-300 rounded-full mt-1 overflow-hidden">
                                                <div className={`h-full rounded-full ${getIPCBg(k.ipc).replace('/15', '')}`}
                                                    style={{ width: `${k.ipc}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${qi.color}`}
                                            title={qi.desc}>
                                            {qi.label}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {k.flags.length > 0 ? k.flags.slice(0, 2).map(f => (
                                                <span key={f} className="px-1.5 py-0.5 rounded text-[10px] bg-dark-300 text-gray-400 border border-dark-100">
                                                    {f}
                                                </span>
                                            )) : (
                                                <span className="text-xs text-gray-600">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <Link href={`/fleet/kandang/${k.id}`} className="p-1.5 rounded-lg hover:bg-dark-300 transition-colors text-gray-500 hover:text-white">
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {sorted.map((k, idx) => {
                    const qi = getQuadrantInfo(k.quadrant)
                    return (
                        <Link key={k.id} href={`/fleet/kandang/${k.id}`}
                            className="block p-4 rounded-xl bg-dark-400 border border-dark-100 hover:border-primary-500/30 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white text-sm">{k.name}</h3>
                                        <p className="text-xs text-gray-500">{k.populasi.toLocaleString('id-ID')} ekor · {k.umur} hari</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${qi.color}`}>
                                    Q{qi.label}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded-lg bg-dark-300">
                                    <p className="text-[10px] text-gray-500 uppercase">IP</p>
                                    <p className={`text-lg font-bold ${getIPColor(k.ip)}`}>{k.ip}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-dark-300">
                                    <p className="text-[10px] text-gray-500 uppercase">IPC</p>
                                    <p className={`text-lg font-bold ${getIPCColor(k.ipc)}`}>{k.ipc.toFixed(1)}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-dark-300">
                                    <p className="text-[10px] text-gray-500 uppercase">Total (kg)</p>
                                    <p className="text-sm font-bold text-white">{(k.totalNilai / 1000).toFixed(1)}k</p>
                                </div>
                            </div>
                            {k.flags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {k.flags.map(f => (
                                        <span key={f} className="px-1.5 py-0.5 rounded text-[10px] bg-dark-300 text-gray-400 border border-dark-100">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Link>
                    )
                })}
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-xs text-gray-500">Quadrant A</p>
                    <p className="text-lg font-bold text-green-400">{data.filter(k => k.quadrant === 'A').length}</p>
                    <p className="text-[10px] text-gray-600">Best practice</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                    <p className="text-xs text-gray-500">Quadrant B</p>
                    <p className="text-lg font-bold text-yellow-400">{data.filter(k => k.quadrant === 'B').length}</p>
                    <p className="text-[10px] text-gray-600">Hidden risk</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-xs text-gray-500">Quadrant C</p>
                    <p className="text-lg font-bold text-blue-400">{data.filter(k => k.quadrant === 'C').length}</p>
                    <p className="text-[10px] text-gray-600">Non-climate issue</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-xs text-gray-500">Quadrant D</p>
                    <p className="text-lg font-bold text-red-400">{data.filter(k => k.quadrant === 'D').length}</p>
                    <p className="text-[10px] text-gray-600">Priority fix</p>
                </div>
            </div>
        </div>
    )
}
