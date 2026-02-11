'use client'

import { useState, useEffect } from 'react'
import {
    Search,
    Globe,
    Database,
    TrendingUp,
    TrendingDown,
    Minus,
    ExternalLink,
    Clock,
    Loader2,
    Sparkles,
    History,
    X,
    ChevronDown,
    RefreshCw,
    Tag
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

interface MarketItem {
    label: string
    value: string
    detail: string
    trend: string
}

interface GroundingSource {
    title: string
    uri: string
}

interface SearchRecord {
    id: string
    query: string
    category: string
    summary: string
    items: MarketItem[]
    sources: GroundingSource[]
    searched_at: string
}

const SUGGESTED_QUERIES = [
    '🐔 Harga ayam broiler hari ini',
    '🥚 Harga telur ayam hari ini',
    '🌽 Harga jagung pakan ternak',
    '🐣 Harga DOC broiler terbaru',
]

const CATEGORY_LABELS: Record<string, string> = {
    ayam_broiler: '🐔 Ayam Broiler',
    doc: '🐣 DOC',
    pakan: '🌽 Pakan',
    telur: '🥚 Telur',
    daging: '🥩 Daging',
    obat_vitamin: '💊 Obat/Vitamin',
    lainnya: '📦 Lainnya',
}

function TrendBadge({ trend }: { trend: string }) {
    const config: Record<string, { icon: React.ElementType; color: string; label: string }> = {
        naik: { icon: TrendingUp, color: 'text-red-400 bg-red-500/20', label: 'Naik' },
        turun: { icon: TrendingDown, color: 'text-green-400 bg-green-500/20', label: 'Turun' },
        stabil: { icon: Minus, color: 'text-gray-400 bg-gray-500/20', label: 'Stabil' },
    }
    const c = config[trend] || config.stabil
    const Icon = c.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
            <Icon className="w-3 h-3" />
            {c.label}
        </span>
    )
}

export default function DataPlayground() {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<SearchRecord | null>(null)
    const [error, setError] = useState('')
    const [history, setHistory] = useState<SearchRecord[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [historyCategories, setHistoryCategories] = useState<string[]>([])

    // Load history on mount
    useEffect(() => {
        loadHistory()
    }, [])

    async function loadHistory() {
        try {
            const res = await fetch(`${API_BASE}/market-prices/history?limit=10`)
            if (res.ok) {
                const data = await res.json()
                setHistory(data.searches || [])
                setHistoryCategories(data.categories || [])
            }
        } catch { }
    }

    async function handleSearch(searchQuery?: string) {
        const q = (searchQuery || query).replace(/^[^\w\s]*\s*/, '').trim()
        if (!q) return

        setLoading(true)
        setError('')
        setResult(null)

        try {
            const res = await fetch(`${API_BASE}/market-prices/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || 'Search failed')
            }

            const data = await res.json()
            setResult(data.search)
            loadHistory() // refresh history
        } catch (err: any) {
            setError(err.message || 'Gagal mencari data')
        } finally {
            setLoading(false)
        }
    }

    function handleHistoryClick(record: SearchRecord) {
        setResult(record)
        setQuery(record.query)
        setShowHistory(false)
    }

    function formatTime(iso: string) {
        const d = new Date(iso)
        return d.toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <div className="rounded-xl bg-dark-200 border border-dark-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-dark-100 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-white">Data Playground</h3>
                            <p className="text-xs text-gray-500">Cari data pasar real-time dari internet</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${showHistory
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-dark-300 text-gray-400 hover:text-white hover:bg-dark-100'
                            }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        Riwayat
                        {history.length > 0 && (
                            <span className="bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full text-[10px]">
                                {history.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-5 py-3 border-b border-dark-100">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Cari data pasar... (contoh: harga ayam broiler)"
                            className="w-full pl-10 pr-4 py-2.5 bg-dark-300 border border-dark-100 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading || !query.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Globe className="w-4 h-4" />
                        )}
                        Cari
                    </button>
                </div>

                {/* Suggested queries */}
                {!result && !loading && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {SUGGESTED_QUERIES.map((sq) => (
                            <button
                                key={sq}
                                onClick={() => { setQuery(sq); handleSearch(sq) }}
                                className="px-3 py-1.5 bg-dark-300 hover:bg-dark-100 border border-dark-100 rounded-full text-xs text-gray-400 hover:text-white transition-all"
                            >
                                {sq}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* History Panel */}
            {showHistory && history.length > 0 && (
                <div className="px-5 py-3 border-b border-dark-100 bg-dark-300/50 max-h-48 overflow-y-auto">
                    <div className="space-y-1.5">
                        {history.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => handleHistoryClick(h)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-100 transition-all group text-left"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs">{CATEGORY_LABELS[h.category] || '📦'}</span>
                                    <span className="text-sm text-gray-300 truncate">{h.query}</span>
                                </div>
                                <span className="text-[10px] text-gray-600 whitespace-nowrap ml-2">
                                    {formatTime(h.searched_at)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="px-5 py-8 flex flex-col items-center gap-3">
                    <div className="relative">
                        <Globe className="w-8 h-8 text-amber-400 animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                    </div>
                    <p className="text-sm text-gray-400">Mencari di internet...</p>
                    <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="px-5 py-4">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                        ⚠️ {error}
                    </div>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="px-5 py-4 space-y-4">
                    {/* Source badge + category */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400">
                                <Globe className="w-3 h-3" />
                                Sumber: Web Search
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-dark-300 rounded-full text-xs text-gray-400">
                                <Tag className="w-3 h-3" />
                                {CATEGORY_LABELS[result.category] || result.category}
                            </span>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] text-gray-600">
                            <Clock className="w-3 h-3" />
                            {formatTime(result.searched_at)}
                        </span>
                    </div>

                    {/* Summary */}
                    {result.summary && (
                        <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
                    )}

                    {/* Data Table */}
                    {result.items && result.items.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-dark-100">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-dark-300/80">
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Komoditas</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Harga</th>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Detail</th>
                                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-100">
                                    {result.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-dark-300/40 transition-colors">
                                            <td className="px-4 py-3 text-white font-medium">{item.label}</td>
                                            <td className="px-4 py-3 text-amber-400 font-semibold">{item.value}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{item.detail}</td>
                                            <td className="px-4 py-3 text-center">
                                                <TrendBadge trend={item.trend} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Grounding Sources */}
                    {result.sources && result.sources.length > 0 && (
                        <div className="p-3 bg-dark-300/50 rounded-lg border border-dark-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Search className="w-3 h-3" />
                                Sumber Web
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {result.sources.slice(0, 5).map((src, i) => (
                                    <a
                                        key={i}
                                        href={src.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-dark-200 hover:bg-dark-100 border border-dark-100 rounded-md text-xs text-blue-400 hover:text-blue-300 transition-all"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        {src.title || new URL(src.uri).hostname}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search again */}
                    <button
                        onClick={() => { setResult(null); setQuery('') }}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Cari lagi
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
                <div className="px-5 py-6 text-center">
                    <Globe className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Ketik pencarian untuk mendapatkan data pasar terbaru</p>
                    <p className="text-xs text-gray-600 mt-1">Data diambil langsung dari Google Search via AI</p>
                </div>
            )}
        </div>
    )
}
