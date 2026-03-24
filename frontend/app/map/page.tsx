'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Filter, Layers, X, AlertTriangle, Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react'
import { iotApi, Kandang } from '@/lib/iot-api'
import authService from '@/lib/auth'
import { useRouter } from 'next/navigation'

const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
)
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
)
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
)
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
)

// ============= Sleman Area Coordinates (assigned per-kandang by index) =============
const SLEMAN_LOCATIONS = [
    { name: "Minggir", lat: -7.7375, lon: 110.2665 },
    { name: "Seyegan", lat: -7.7488, lon: 110.3085 },
    { name: "Godean", lat: -7.7692, lon: 110.2950 },
    { name: "Tempel", lat: -7.7165, lon: 110.3255 },
    { name: "Turi", lat: -7.6555, lon: 110.3650 },
    { name: "Pakem", lat: -7.6700, lon: 110.4200 },
    { name: "Ngaglik", lat: -7.7050, lon: 110.3900 },
    { name: "Kalasan", lat: -7.7605, lon: 110.4555 },
    { name: "Prambanan", lat: -7.7520, lon: 110.4900 },
    { name: "Berbah", lat: -7.7780, lon: 110.4400 },
]

// ============= Custom Kandang Icon =============
function createKandangIcon(isOnline: boolean) {
    const colors = isOnline
        ? { fill: '#22c55e', stroke: '#166534', glow: 'rgba(34,197,94,0.3)', pulse: '' }
        : { fill: '#6b7280', stroke: '#374151', glow: 'rgba(107,114,128,0.2)', pulse: '' }
    const c = colors

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <!-- Shadow -->
        <ellipse cx="20" cy="46" rx="8" ry="2" fill="rgba(0,0,0,0.25)"/>
        <!-- Pin body -->
        <g style="transform-origin:20px 24px">
            <!-- Glow ring -->
            <circle cx="20" cy="20" r="19" fill="${c.glow}" stroke="none"/>
            <!-- Pin shape -->
            <path d="M20 46 C20 46 6 28 6 18 C6 10.268 12.268 4 20 4 C27.732 4 34 10.268 34 18 C34 28 20 46 20 46Z" 
                fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5" opacity="0.95"/>
            <!-- Kandang/Barn icon -->
            <g transform="translate(10,9)" fill="white" stroke="white" stroke-width="0.5">
                <!-- Roof -->
                <path d="M10 1 L19 7 L1 7 Z" fill="white" stroke="white" stroke-linejoin="round" stroke-width="1"/>
                <!-- Walls -->
                <rect x="3" y="7" width="14" height="10" rx="1" fill="white" opacity="0.9"/>
                <!-- Door -->
                <rect x="8" y="10" width="4" height="7" rx="0.5" fill="${c.stroke}" opacity="0.7"/>
                <!-- Windows -->
                <rect x="4" y="9" width="3" height="2.5" rx="0.5" fill="${c.stroke}" opacity="0.5"/>
                <rect x="13" y="9" width="3" height="2.5" rx="0.5" fill="${c.stroke}" opacity="0.5"/>
            </g>
        </g>
    </svg>`

    const LeafletLib = typeof window !== 'undefined' ? require('leaflet') : null
    if (!LeafletLib) return undefined as any
    return LeafletLib.divIcon({
        html: svg,
        className: 'kandang-marker',
        iconSize: [40, 48],
        iconAnchor: [20, 46],
        popupAnchor: [0, -40],
    })
}

// ============= Mapped Kandang Data for Map =============
interface KandangMapItem {
    id: string
    name: string
    kode: string
    alamat: string
    lat: number
    lng: number
    flockCount: number
    onlineCount: number
    isOnline: boolean
    tipe: number
}

function getKandangType(tipe: number): string {
    switch (tipe) {
        case 1: return 'Chickin Basic'
        case 2: return 'Chickin Plus'
        case 3: return 'Chickin Lite'
        case 4: return 'Chickin Sense'
        case 5: return 'Chickin Diesel'
        default: return 'Unknown'
    }
}

export default function MapPage() {
    const [mounted, setMounted] = useState(false)
    const [filterStatus, setFilterStatus] = useState('')
    const [kandangList, setKandangList] = useState<KandangMapItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
        loadKandangData()
    }, [])

    async function loadKandangData() {
        setLoading(true)
        setError('')
        try {
            const token = authService.getToken()
            if (!token) { router.push('/login'); return }

            const response = await iotApi.getKandangList()
            const list = response.data || []

            const mapped: KandangMapItem[] = list.map((k: any, idx: number) => {
                const loc = SLEMAN_LOCATIONS[idx % SLEMAN_LOCATIONS.length]
                const flocks = k.flocks || []
                const onlineCount = flocks.filter((f: any) => f.connected).length
                return {
                    id: k._id,
                    name: k.nama || k.kode || `Kandang ${idx + 1}`,
                    kode: k.kode || '—',
                    alamat: `Kec. ${loc.name}, Sleman, Yogyakarta`,
                    lat: loc.lat,
                    lng: loc.lon,
                    flockCount: flocks.length,
                    onlineCount,
                    isOnline: onlineCount > 0,
                    tipe: k.tipe || 0,
                }
            })
            setKandangList(mapped)
        } catch (err: any) {
            console.error('Failed to load kandang for map:', err)
            setError(err.message || 'Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = kandangList.filter(k => {
        if (!filterStatus) return true
        if (filterStatus === 'online') return k.isOnline
        if (filterStatus === 'offline') return !k.isOnline
        return true
    })

    const onlineCount = kandangList.filter(k => k.isOnline).length
    const offlineCount = kandangList.length - onlineCount

    if (!mounted) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Peta Kandang</h1>
                    <p className="text-gray-400 mt-1">Lokasi dan status real-time seluruh kandang</p>
                </div>

                {/* Filters & Stats */}
                <div className="flex items-center space-x-3 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="input text-sm"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">Semua Status</option>
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                        </select>
                        {filterStatus && (
                            <button onClick={() => setFilterStatus('')} className="p-1 text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={loadKandangData}
                        className="p-2 rounded-lg hover:bg-dark-400 text-gray-400 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center"><Layers className="w-4 h-4 mr-1" />{filtered.length} kandang</span>
                        <span className="flex items-center text-green-400"><Wifi className="w-3.5 h-3.5 mr-1" />{onlineCount} online</span>
                        <span className="flex items-center text-gray-500"><WifiOff className="w-3.5 h-3.5 mr-1" />{offlineCount} offline</span>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                    <span className="ml-3 text-gray-400">Memuat peta kandang...</span>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="card text-center py-12">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={loadKandangData}
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-500/30 transition-all"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Map */}
            {!loading && !error && (
                <div className="flex-1 card p-0 overflow-hidden rounded-xl">
                    <MapContainer
                        center={[-7.72, 110.38]}
                        zoom={11}
                        style={{ height: '100%', width: '100%', minHeight: '500px' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        {filtered.map((kandang) => (
                            <Marker key={kandang.id} position={[kandang.lat, kandang.lng]} icon={createKandangIcon(kandang.isOnline)}>
                                <Popup>
                                    <div style={{ minWidth: '260px', fontFamily: 'Inter, system-ui, sans-serif' }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                                                {kandang.kode}
                                            </h3>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                backgroundColor: kandang.isOnline ? '#22c55e22' : '#6b728022',
                                                color: kandang.isOnline ? '#22c55e' : '#6b7280',
                                                border: `1px solid ${kandang.isOnline ? '#22c55e44' : '#6b728044'}`
                                            }}>
                                                {kandang.isOnline ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>{kandang.alamat}</p>

                                        {/* Info Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                                            {/* Tipe */}
                                            <div style={{
                                                textAlign: 'center', padding: '8px 4px', backgroundColor: '#f1f5f9',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Tipe</div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                                    {getKandangType(kandang.tipe)}
                                                </div>
                                            </div>
                                            {/* Device Count */}
                                            <div style={{
                                                textAlign: 'center', padding: '8px 4px', backgroundColor: '#f1f5f9',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Lantai</div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                                    {kandang.flockCount} lantai ({kandang.onlineCount} online)
                                                </div>
                                            </div>
                                        </div>

                                        {/* Link */}
                                        <a
                                            href={`/fleet/kandang/${kandang.id}`}
                                            style={{
                                                display: 'block', textAlign: 'center', fontSize: '12px', fontWeight: 600,
                                                backgroundColor: '#0ea5e9', color: '#fff', padding: '6px 12px',
                                                borderRadius: '8px', textDecoration: 'none', marginTop: '4px'
                                            }}
                                        >
                                            Lihat Detail Kandang →
                                        </a>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            )}
        </div>
    )
}
