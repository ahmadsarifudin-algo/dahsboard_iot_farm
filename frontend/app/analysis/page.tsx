'use client'

import { useState, useRef, useEffect } from 'react'
import {
    Sparkles, Send, Table2, BarChart3, MessageSquare, Loader2,
    Download, Trash2, ChevronRight, Database, Clock, X,
    ThermometerSun, Droplets, Wind, Bug, TrendingUp, AlertTriangle
} from 'lucide-react'
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'

// ============= Types =============
interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    sql?: string
    data?: Record<string, any>[]
    chartConfig?: { type: 'bar' | 'line' | 'area'; xKey: string; yKeys: string[]; colors: string[] }
    insightCards?: { title: string; value: string; change?: string; icon: string }[]
    timestamp: Date
}

interface SavedQuery {
    id: string
    title: string
    query: string
    timestamp: Date
}

// ============= Dummy AI Responses =============
const DUMMY_RESPONSES: Record<string, Omit<ChatMessage, 'id' | 'role' | 'timestamp'>> = {
    'suhu': {
        content: 'Berikut data rata-rata suhu per kandang dalam 7 hari terakhir. Kandang B2 menunjukkan suhu tertinggi (33.1°C) yang melebihi batas optimal 30°C. Rekomendasi: periksa sistem ventilasi Kandang B2.',
        sql: `SELECT s.name AS kandang, 
  AVG(t.value) AS avg_suhu,
  MAX(t.value) AS max_suhu,
  MIN(t.value) AS min_suhu
FROM telemetry t 
JOIN devices d ON t.device_id = d.id
JOIN sites s ON d.site_id = s.id
WHERE t.metric = 'temperature'
  AND t.time > NOW() - INTERVAL '7 days'
GROUP BY s.name
ORDER BY avg_suhu DESC;`,
        data: [
            { kandang: 'Kandang B2', avg_suhu: 33.1, max_suhu: 35.2, min_suhu: 30.8 },
            { kandang: 'Kandang A2', avg_suhu: 31.2, max_suhu: 33.0, min_suhu: 29.5 },
            { kandang: 'Kandang F1', avg_suhu: 32.0, max_suhu: 34.1, min_suhu: 29.8 },
            { kandang: 'Kandang D1', avg_suhu: 30.5, max_suhu: 32.0, min_suhu: 28.9 },
            { kandang: 'Kandang C2', avg_suhu: 29.8, max_suhu: 31.5, min_suhu: 28.2 },
            { kandang: 'Kandang A1', avg_suhu: 28.5, max_suhu: 30.1, min_suhu: 27.0 },
            { kandang: 'Kandang B1', avg_suhu: 27.8, max_suhu: 29.5, min_suhu: 26.2 },
            { kandang: 'Kandang E1', avg_suhu: 29.2, max_suhu: 31.0, min_suhu: 27.4 },
        ],
        chartConfig: { type: 'bar', xKey: 'kandang', yKeys: ['avg_suhu', 'max_suhu'], colors: ['#f59e0b', '#ef4444'] },
        insightCards: [
            { title: 'Suhu Tertinggi', value: '35.2°C', change: 'Kandang B2', icon: 'alert' },
            { title: 'Rata-rata Global', value: '30.3°C', change: '+1.2°C vs minggu lalu', icon: 'temp' },
            { title: 'Kandang Optimal', value: '5 / 8', change: '<30°C', icon: 'check' },
        ]
    },
    'mortalitas': {
        content: 'Data mortalitas harian menunjukkan tren peningkatan di Kandang A2 sejak tanggal 5 Feb. Korelasi kuat dengan kenaikan suhu (r=0.87). Perlu tindakan segera.',
        sql: `SELECT DATE(t.time) AS tanggal,
  s.name AS kandang,
  SUM(CASE WHEN t.metric='mortality' THEN t.value END) AS mortality,
  AVG(CASE WHEN t.metric='temperature' THEN t.value END) AS avg_temp
FROM telemetry t 
JOIN devices d ON t.device_id = d.id
JOIN sites s ON d.site_id = s.id
WHERE t.time > NOW() - INTERVAL '14 days'
GROUP BY DATE(t.time), s.name
ORDER BY tanggal;`,
        data: [
            { tanggal: '01 Feb', mortality: 8, avg_temp: 28.5 },
            { tanggal: '02 Feb', mortality: 6, avg_temp: 28.2 },
            { tanggal: '03 Feb', mortality: 10, avg_temp: 29.1 },
            { tanggal: '04 Feb', mortality: 7, avg_temp: 28.8 },
            { tanggal: '05 Feb', mortality: 15, avg_temp: 30.5 },
            { tanggal: '06 Feb', mortality: 22, avg_temp: 31.8 },
            { tanggal: '07 Feb', mortality: 18, avg_temp: 31.2 },
            { tanggal: '08 Feb', mortality: 25, avg_temp: 32.5 },
            { tanggal: '09 Feb', mortality: 20, avg_temp: 31.0 },
            { tanggal: '10 Feb', mortality: 12, avg_temp: 29.5 },
        ],
        chartConfig: { type: 'line', xKey: 'tanggal', yKeys: ['mortality', 'avg_temp'], colors: ['#ef4444', '#f59e0b'] },
        insightCards: [
            { title: 'Total Mortalitas', value: '143 ekor', change: '+38% vs 2 minggu lalu', icon: 'alert' },
            { title: 'Korelasi Suhu', value: 'r = 0.87', change: 'Sangat kuat', icon: 'trend' },
        ]
    },
    'ip': {
        content: 'Perbandingan Index Performance (IP) semua kandang. Kandang A1 dan B1 berada di kuadran A (best practice), sementara Kandang B2 perlu perhatian khusus karena IP dibawah 300.',
        sql: `SELECT s.name AS kandang,
  ip_score, livability, fcr, avg_bw, deplesi
FROM performance_summary ps
JOIN sites s ON ps.site_id = s.id
ORDER BY ip_score DESC;`,
        data: [
            { kandang: 'Kandang A1', ip_score: 385, livability: 96.2, fcr: 1.42, avg_bw: 2.15 },
            { kandang: 'Kandang B1', ip_score: 372, livability: 95.8, fcr: 1.45, avg_bw: 2.12 },
            { kandang: 'Kandang E1', ip_score: 348, livability: 94.5, fcr: 1.48, avg_bw: 2.08 },
            { kandang: 'Kandang D1', ip_score: 335, livability: 93.8, fcr: 1.50, avg_bw: 2.05 },
            { kandang: 'Kandang A2', ip_score: 320, livability: 92.5, fcr: 1.55, avg_bw: 1.98 },
            { kandang: 'Kandang C2', ip_score: 310, livability: 91.8, fcr: 1.58, avg_bw: 1.95 },
            { kandang: 'Kandang C1', ip_score: 295, livability: 90.2, fcr: 1.62, avg_bw: 1.90 },
            { kandang: 'Kandang B2', ip_score: 268, livability: 88.5, fcr: 1.72, avg_bw: 1.82 },
        ],
        chartConfig: { type: 'bar', xKey: 'kandang', yKeys: ['ip_score'], colors: ['#22c55e'] },
        insightCards: [
            { title: 'IP Tertinggi', value: '385', change: 'Kandang A1', icon: 'check' },
            { title: 'IP Terendah', value: '268', change: 'Kandang B2 ⚠️', icon: 'alert' },
            { title: 'Rata-rata IP', value: '329', change: 'Target: 350', icon: 'trend' },
        ]
    },
    'default': {
        content: 'Saya bisa membantu menganalisis data farm Anda. Coba tanyakan tentang:\n\n• **Suhu & Kelembaban** — "Tampilkan rata-rata suhu per kandang"\n• **Mortalitas** — "Analisis tren mortalitas mingguan"\n• **Performance (IP)** — "Bandingkan IP semua kandang"\n• **Amonia** — "Kandang mana yang kadar amonianya tinggi?"\n• **Korelasi** — "Apakah suhu berpengaruh ke mortalitas?"',
    }
}

function matchResponse(input: string): Omit<ChatMessage, 'id' | 'role' | 'timestamp'> {
    const lower = input.toLowerCase()
    if (lower.includes('suhu') || lower.includes('temp') || lower.includes('panas')) return DUMMY_RESPONSES['suhu']
    if (lower.includes('mortal') || lower.includes('mati') || lower.includes('deplesi')) return DUMMY_RESPONSES['mortalitas']
    if (lower.includes('ip') || lower.includes('perform') || lower.includes('indeks')) return DUMMY_RESPONSES['ip']
    return DUMMY_RESPONSES['default']
}

// ============= Sub-Components =============

function InsightCard({ title, value, change, icon }: { title: string; value: string; change?: string; icon: string }) {
    const iconMap: Record<string, JSX.Element> = {
        alert: <AlertTriangle className="w-4 h-4 text-red-400" />,
        temp: <ThermometerSun className="w-4 h-4 text-amber-400" />,
        check: <TrendingUp className="w-4 h-4 text-green-400" />,
        trend: <BarChart3 className="w-4 h-4 text-blue-400" />,
    }
    return (
        <div className="p-3 rounded-xl bg-dark-400/50 border border-dark-100">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{title}</span>
                {iconMap[icon] || <Database className="w-4 h-4 text-gray-500" />}
            </div>
            <p className="text-lg font-bold text-white">{value}</p>
            {change && <p className="text-xs text-gray-400 mt-0.5">{change}</p>}
        </div>
    )
}

function DataTable({ data }: { data: Record<string, any>[] }) {
    if (!data || data.length === 0) return null
    const columns = Object.keys(data[0])

    return (
        <div className="overflow-x-auto rounded-xl border border-dark-100">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-dark-400">
                        {columns.map(col => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                {col.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-dark-400/50 transition-colors">
                            {columns.map(col => (
                                <td key={col} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                                    {typeof row[col] === 'number' ? row[col].toLocaleString('id-ID', { maximumFractionDigits: 2 }) : row[col]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function ChartView({ data, config }: { data: Record<string, any>[]; config: ChatMessage['chartConfig'] }) {
    if (!data || !config) return null

    const ChartComponent = config.type === 'line' ? LineChart : config.type === 'area' ? AreaChart : BarChart

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey={config.xKey} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                        labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {config.yKeys.map((key, i) => {
                        const color = config.colors[i] || '#22c55e'
                        if (config.type === 'line') return <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
                        if (config.type === 'area') return <Area key={key} type="monotone" dataKey={key} stroke={color} fill={color + '33'} />
                        return <Bar key={key} dataKey={key} fill={color} radius={[4, 4, 0, 0]} />
                    })}
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    )
}

// ============= Main Page =============
export default function AnalysisPlaygroundPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '👋 Selamat datang di **Farm Data Analysis Playground**! Saya adalah AI assistant yang siap membantu Anda menganalisis data farm.\n\nCoba tanyakan sesuatu seperti:\n- "Tampilkan rata-rata suhu per kandang"\n- "Analisis tren mortalitas mingguan"\n- "Bandingkan IP semua kandang"',
            timestamp: new Date(),
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [activeView, setActiveView] = useState<'chat' | 'table' | 'chart'>('chat')
    const [activeMessage, setActiveMessage] = useState<ChatMessage | null>(null)
    const [showSql, setShowSql] = useState<string | null>(null)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const [savedQueries] = useState<SavedQuery[]>([
        { id: 'sq-1', title: 'Suhu Mingguan', query: 'Tampilkan suhu rata-rata per kandang', timestamp: new Date('2026-02-08') },
        { id: 'sq-2', title: 'IP Comparison', query: 'Bandingkan IP semua kandang', timestamp: new Date('2026-02-06') },
    ])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function handleSend() {
        if (!input.trim() || isLoading) return

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        // Simulate AI delay
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))

        const response = matchResponse(userMsg.content)
        const assistantMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            ...response,
            timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMsg])
        setActiveMessage(assistantMsg)
        if (assistantMsg.data) {
            setActiveView('chart')
        }
        setIsLoading(false)
    }

    function handleQuickAction(query: string) {
        setInput(query)
        // Auto-send after a short delay
        setTimeout(() => {
            setInput('')
            const userMsg: ChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'user',
                content: query,
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, userMsg])
            setIsLoading(true)

            setTimeout(() => {
                const response = matchResponse(query)
                const assistantMsg: ChatMessage = {
                    id: `msg-${Date.now() + 1}`,
                    role: 'assistant',
                    ...response,
                    timestamp: new Date(),
                }
                setMessages(prev => [...prev, assistantMsg])
                setActiveMessage(assistantMsg)
                if (assistantMsg.data) setActiveView('chart')
                setIsLoading(false)
            }, 1500 + Math.random() * 1000)
        }, 200)
    }

    return (
        <div className="h-[calc(100vh-5rem)] flex gap-4 animate-fade-in">
            {/* ===== LEFT PANEL: Visualization ===== */}
            <div className="flex-1 flex flex-col bg-dark-300 rounded-2xl border border-dark-100 overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-3 border-b border-dark-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1 bg-dark-400 rounded-lg p-1">
                        {[
                            { key: 'chart' as const, icon: BarChart3, label: 'Chart' },
                            { key: 'table' as const, icon: Table2, label: 'Table' },
                            { key: 'chat' as const, icon: MessageSquare, label: 'History' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveView(tab.key)}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeView === tab.key
                                    ? 'bg-dark-200 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {activeMessage?.data && (
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{activeMessage.data.length} rows</span>
                            <button className="p-1.5 rounded-lg hover:bg-dark-400 text-gray-500 hover:text-gray-300 transition-colors" title="Export CSV">
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5">
                    {!activeMessage?.data && activeView !== 'chat' ? (
                        // Empty State
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 mb-4">
                                <Sparkles className="w-10 h-10 text-violet-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Farm Data Analysis</h3>
                            <p className="text-sm text-gray-500 max-w-md mb-6">
                                Tanyakan sesuatu di panel chat untuk memulai analisis data. AI akan menghasilkan query, menampilkan data, dan membuat visualisasi secara otomatis.
                            </p>
                            <div className="grid grid-cols-3 gap-3 max-w-lg">
                                {[
                                    { icon: ThermometerSun, label: 'Monitoring Suhu', color: 'text-amber-400' },
                                    { icon: TrendingUp, label: 'Analisis IP', color: 'text-green-400' },
                                    { icon: AlertTriangle, label: 'Deteksi Anomali', color: 'text-red-400' },
                                ].map(f => (
                                    <div key={f.label} className="p-3 rounded-xl bg-dark-400 border border-dark-100 text-center">
                                        <f.icon className={`w-5 h-5 ${f.color} mx-auto mb-1.5`} />
                                        <p className="text-xs text-gray-400">{f.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeView === 'chart' && activeMessage?.data ? (
                        // Chart View
                        <div className="space-y-5">
                            {/* Insight Cards */}
                            {activeMessage.insightCards && (
                                <div className="grid grid-cols-3 gap-3">
                                    {activeMessage.insightCards.map((card, i) => (
                                        <InsightCard key={i} {...card} />
                                    ))}
                                </div>
                            )}

                            {/* Chart */}
                            <div className="p-4 rounded-xl bg-dark-400/50 border border-dark-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white">Visualisasi</h3>
                                    <div className="flex items-center space-x-1">
                                        {(['bar', 'line', 'area'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    if (activeMessage.chartConfig) {
                                                        setActiveMessage({
                                                            ...activeMessage,
                                                            chartConfig: { ...activeMessage.chartConfig, type }
                                                        })
                                                    }
                                                }}
                                                className={`px-2 py-1 rounded text-xs capitalize transition-all ${activeMessage.chartConfig?.type === type
                                                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                                                    : 'text-gray-500 hover:text-gray-300'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <ChartView data={activeMessage.data} config={activeMessage.chartConfig} />
                            </div>

                            {/* Data Table */}
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-3">Data Detail</h3>
                                <DataTable data={activeMessage.data} />
                            </div>
                        </div>
                    ) : activeView === 'table' && activeMessage?.data ? (
                        // Table View
                        <DataTable data={activeMessage.data} />
                    ) : (
                        // Chat History / Saved Queries
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-white">Saved Queries</h3>
                            <div className="space-y-2">
                                {savedQueries.map(sq => (
                                    <button
                                        key={sq.id}
                                        onClick={() => handleQuickAction(sq.query)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-400 hover:bg-dark-200 border border-dark-100 transition-all text-left"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-white">{sq.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{sq.query}</p>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            <span>{sq.timestamp.toLocaleDateString('id-ID')}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <h3 className="text-sm font-semibold text-white mt-6">Recent Analyses</h3>
                            <div className="space-y-2">
                                {messages.filter(m => m.role === 'user').map(msg => (
                                    <div key={msg.id} className="p-3 rounded-xl bg-dark-400 border border-dark-100">
                                        <p className="text-sm text-gray-300">{msg.content}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== RIGHT PANEL: Chat ===== */}
            <div className="w-[380px] min-w-[320px] flex flex-col bg-dark-300 rounded-2xl border border-dark-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-dark-100">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white">Farm AI Assistant</h2>
                            <p className="text-xs text-gray-500">Powered by Gemini</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-2 border-b border-dark-100 flex gap-2 overflow-x-auto">
                    {[
                        { label: '🌡️ Suhu', q: 'Tampilkan rata-rata suhu per kandang' },
                        { label: '📊 IP', q: 'Bandingkan IP semua kandang' },
                        { label: '💀 Mortalitas', q: 'Analisis tren mortalitas mingguan' },
                    ].map(qa => (
                        <button
                            key={qa.label}
                            onClick={() => handleQuickAction(qa.q)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-dark-400 text-gray-300 hover:text-white hover:bg-dark-200 border border-dark-100 whitespace-nowrap transition-all"
                        >
                            {qa.label}
                        </button>
                    ))}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-primary-600 text-white rounded-br-md'
                                : 'bg-dark-400 text-gray-200 rounded-bl-md border border-dark-100'
                                }`}>
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center space-x-1.5 mb-2">
                                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                                        <span className="text-xs font-medium text-violet-400">AI</span>
                                    </div>
                                )}
                                <div className="text-sm whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{
                                    __html: msg.content
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\n/g, '<br/>')
                                        .replace(/• /g, '&bull; ')
                                }} />

                                {/* SQL Preview */}
                                {msg.sql && (
                                    <button
                                        onClick={() => setShowSql(showSql === msg.id ? null : msg.id)}
                                        className="mt-2 flex items-center space-x-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                        <Database className="w-3 h-3" />
                                        <span>{showSql === msg.id ? 'Sembunyikan SQL' : 'Lihat SQL'}</span>
                                    </button>
                                )}
                                {showSql === msg.id && msg.sql && (
                                    <pre className="mt-2 p-3 rounded-lg bg-dark-500/80 text-xs text-green-400 overflow-x-auto font-mono border border-dark-100">
                                        {msg.sql}
                                    </pre>
                                )}

                                {/* Insight Cards */}
                                {msg.insightCards && (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {msg.insightCards.map((card, i) => (
                                            <InsightCard key={i} {...card} />
                                        ))}
                                    </div>
                                )}

                                {/* View Data Button */}
                                {msg.data && (
                                    <button
                                        onClick={() => { setActiveMessage(msg); setActiveView('chart') }}
                                        className="mt-3 w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-500/30 transition-all"
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        <span>Lihat Visualisasi</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                )}

                                <p className="text-[10px] text-gray-600 mt-2 text-right">
                                    {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-dark-400 rounded-2xl rounded-bl-md px-4 py-3 border border-dark-100">
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                                    <span className="text-sm text-gray-400">Menganalisis data...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-dark-100">
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Tanyakan tentang data farm..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-dark-400 border border-dark-100 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
