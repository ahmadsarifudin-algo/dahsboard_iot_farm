'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Filter, Layers, X, Thermometer, Droplets, AlertTriangle, Wind, Users } from 'lucide-react'


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

// ============= Custom Kandang Icon =============
function createKandangIcon(alarmStatus: 'normal' | 'warning' | 'critical') {
    const colors = {
        normal: { fill: '#22c55e', stroke: '#166534', glow: 'rgba(34,197,94,0.3)', pulse: '' },
        warning: { fill: '#f59e0b', stroke: '#92400e', glow: 'rgba(245,158,11,0.3)', pulse: '' },
        critical: { fill: '#ef4444', stroke: '#991b1b', glow: 'rgba(239,68,68,0.4)', pulse: 'animation: pulse-marker 1.5s ease-in-out infinite;' },
    }
    const c = colors[alarmStatus]

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
        <style>
            @keyframes pulse-marker { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.08)} }
        </style>
        <!-- Shadow -->
        <ellipse cx="20" cy="46" rx="8" ry="2" fill="rgba(0,0,0,0.25)"/>
        <!-- Pin body -->
        <g style="${c.pulse}transform-origin:20px 24px">
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

// ============= Kandang Map Data =============
interface KandangMapItem {
    id: string
    name: string
    alamat: string
    region: string
    lat: number
    lng: number
    populasi: number
    suhu: number         // °C
    kelembaban: number   // %
    amonia: number       // ppm
    alarmStatus: 'normal' | 'warning' | 'critical'
    alarmCount: number
    alarmMessages: string[]
}

const DUMMY_KANDANG_LOCATIONS: KandangMapItem[] = [
    {
        id: 'k-001', name: 'Kandang A1',
        alamat: 'Jl. Raya Parung No. 12, Parung, Bogor',
        region: 'Jawa Barat',
        lat: -6.4205, lng: 106.7340,
        populasi: 32000, suhu: 28.5, kelembaban: 72, amonia: 8,
        alarmStatus: 'normal', alarmCount: 0, alarmMessages: []
    },
    {
        id: 'k-002', name: 'Kandang A2',
        alamat: 'Jl. Raya Parung No. 14, Parung, Bogor',
        region: 'Jawa Barat',
        lat: -6.4225, lng: 106.7360,
        populasi: 28000, suhu: 31.2, kelembaban: 68, amonia: 15,
        alarmStatus: 'warning', alarmCount: 2,
        alarmMessages: ['Suhu melebihi batas (>30°C)', 'Amonia tinggi (>12ppm)']
    },
    {
        id: 'k-003', name: 'Kandang B1',
        alamat: 'Desa Cibadak, Kec. Sukaraja, Sukabumi',
        region: 'Jawa Barat',
        lat: -6.8706, lng: 106.8392,
        populasi: 35000, suhu: 27.8, kelembaban: 75, amonia: 6,
        alarmStatus: 'normal', alarmCount: 0, alarmMessages: []
    },
    {
        id: 'k-004', name: 'Kandang B2',
        alamat: 'Jl. Soekarno-Hatta Km 8, Semarang',
        region: 'Jawa Tengah',
        lat: -7.0051, lng: 110.4381,
        populasi: 30000, suhu: 33.1, kelembaban: 64, amonia: 22,
        alarmStatus: 'critical', alarmCount: 3,
        alarmMessages: ['Suhu kritis (>32°C)', 'Amonia bahaya (>20ppm)', 'Fan 2 offline']
    },
    {
        id: 'k-005', name: 'Kandang C1',
        alamat: 'Desa Junrejo, Kec. Junrejo, Batu, Malang',
        region: 'Jawa Timur',
        lat: -7.8873, lng: 112.5274,
        populasi: 25000, suhu: 26.4, kelembaban: 78, amonia: 5,
        alarmStatus: 'normal', alarmCount: 0, alarmMessages: []
    },
    {
        id: 'k-006', name: 'Kandang C2',
        alamat: 'Jl. Raya Mojokerto-Jombang Km 5',
        region: 'Jawa Timur',
        lat: -7.4709, lng: 112.4341,
        populasi: 27000, suhu: 29.8, kelembaban: 70, amonia: 11,
        alarmStatus: 'warning', alarmCount: 1,
        alarmMessages: ['Kelembaban rendah (<70%)']
    },
    {
        id: 'k-007', name: 'Kandang D1',
        alamat: 'Desa Tabanan, Kec. Tabanan, Bali',
        region: 'Bali',
        lat: -8.5417, lng: 115.1254,
        populasi: 20000, suhu: 30.5, kelembaban: 65, amonia: 9,
        alarmStatus: 'normal', alarmCount: 0, alarmMessages: []
    },
    {
        id: 'k-008', name: 'Kandang E1',
        alamat: 'Desa Aik Darek, Kec. Batukliang, Lombok Tengah',
        region: 'NTB',
        lat: -8.7181, lng: 116.2847,
        populasi: 18000, suhu: 29.2, kelembaban: 71, amonia: 7,
        alarmStatus: 'normal', alarmCount: 0, alarmMessages: []
    },
    {
        id: 'k-009', name: 'Kandang F1',
        alamat: 'Jl. Trans Sulawesi Km 12, Maros, Makassar',
        region: 'Sulawesi Selatan',
        lat: -5.0576, lng: 119.5726,
        populasi: 22000, suhu: 32.0, kelembaban: 60, amonia: 18,
        alarmStatus: 'critical', alarmCount: 2,
        alarmMessages: ['Suhu kritis (>32°C)', 'Amonia tinggi (>15ppm)']
    },
    {
        id: 'k-010', name: 'Kandang G1',
        alamat: 'Desa Kubu, Kec. Kubu, Karangasem, Bali',
        region: 'Bali',
        lat: -8.3205, lng: 115.5812,
        populasi: 15000, suhu: 28.0, kelembaban: 73, amonia: 4,
        alarmStatus: 'normal', alarmCount: 0, alarmMessages: []
    },
]

function getAlarmBadge(status: string) {
    switch (status) {
        case 'normal': return { label: 'Normal', bg: '#22c55e', textColor: '#166534' }
        case 'warning': return { label: 'Warning', bg: '#f59e0b', textColor: '#92400e' }
        case 'critical': return { label: 'Critical', bg: '#ef4444', textColor: '#991b1b' }
        default: return { label: status, bg: '#6b7280', textColor: '#374151' }
    }
}

function getSuhuColor(suhu: number): string {
    if (suhu > 32) return '#ef4444'
    if (suhu > 30) return '#f59e0b'
    return '#22c55e'
}

function getAmoniaColor(amonia: number): string {
    if (amonia > 20) return '#ef4444'
    if (amonia > 12) return '#f59e0b'
    return '#22c55e'
}

export default function MapPage() {
    const [mounted, setMounted] = useState(false)
    const [filterRegion, setFilterRegion] = useState('')
    const [filterAlarm, setFilterAlarm] = useState('')

    const regions = [...new Set(DUMMY_KANDANG_LOCATIONS.map(k => k.region))]

    useEffect(() => {
        setMounted(true)
    }, [])

    const filtered = DUMMY_KANDANG_LOCATIONS.filter(k => {
        const matchRegion = !filterRegion || k.region === filterRegion
        const matchAlarm = !filterAlarm || k.alarmStatus === filterAlarm
        return matchRegion && matchAlarm
    })

    const totalPopulasi = filtered.reduce((sum, k) => sum + k.populasi, 0)
    const alarmCount = filtered.filter(k => k.alarmStatus !== 'normal').length

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

                {/* Filters */}
                <div className="flex items-center space-x-3 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="input text-sm"
                            value={filterRegion}
                            onChange={(e) => setFilterRegion(e.target.value)}
                        >
                            <option value="">Semua Region</option>
                            {regions.map((region) => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                        {filterRegion && (
                            <button onClick={() => setFilterRegion('')} className="p-1 text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <select
                        className="input text-sm"
                        value={filterAlarm}
                        onChange={(e) => setFilterAlarm(e.target.value)}
                    >
                        <option value="">Semua Status</option>
                        <option value="normal">Normal</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                    </select>

                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center"><Layers className="w-4 h-4 mr-1" />{filtered.length} kandang</span>
                        <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{totalPopulasi.toLocaleString('id-ID')} ekor</span>
                        {alarmCount > 0 && (
                            <span className="flex items-center text-yellow-400">
                                <AlertTriangle className="w-4 h-4 mr-1" />{alarmCount} alarm
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 card p-0 overflow-hidden rounded-xl">
                <MapContainer
                    center={[-2.5, 118]}
                    zoom={5}
                    style={{ height: '100%', width: '100%', minHeight: '500px' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    {filtered.map((kandang) => {
                        const alarm = getAlarmBadge(kandang.alarmStatus)
                        return (
                            <Marker key={kandang.id} position={[kandang.lat, kandang.lng]} icon={createKandangIcon(kandang.alarmStatus)}>
                                <Popup>
                                    <div style={{ minWidth: '280px', fontFamily: 'Inter, system-ui, sans-serif' }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1e293b' }}>{kandang.name}</h3>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                backgroundColor: alarm.bg + '22', color: alarm.bg, border: `1px solid ${alarm.bg}44`
                                            }}>
                                                {alarm.label}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>{kandang.alamat}</p>

                                        {/* Populasi */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '6px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginBottom: '8px'
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Populasi</span>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                                {kandang.populasi.toLocaleString('id-ID')} ekor
                                            </span>
                                        </div>

                                        {/* Sensor Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                            {/* Suhu */}
                                            <div style={{
                                                textAlign: 'center', padding: '8px 4px', backgroundColor: '#fff7ed',
                                                borderRadius: '8px', border: '1px solid #fed7aa'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#9a3412', marginBottom: '2px' }}>🌡️ Suhu</div>
                                                <div style={{ fontSize: '16px', fontWeight: 700, color: getSuhuColor(kandang.suhu) }}>
                                                    {kandang.suhu}°C
                                                </div>
                                            </div>
                                            {/* Kelembaban */}
                                            <div style={{
                                                textAlign: 'center', padding: '8px 4px', backgroundColor: '#eff6ff',
                                                borderRadius: '8px', border: '1px solid #bfdbfe'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#1e40af', marginBottom: '2px' }}>💧 Kelembaban</div>
                                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb' }}>
                                                    {kandang.kelembaban}%
                                                </div>
                                            </div>
                                            {/* Amonia */}
                                            <div style={{
                                                textAlign: 'center', padding: '8px 4px', backgroundColor: '#fefce8',
                                                borderRadius: '8px', border: '1px solid #fde68a'
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#92400e', marginBottom: '2px' }}>☁️ Amonia</div>
                                                <div style={{ fontSize: '16px', fontWeight: 700, color: getAmoniaColor(kandang.amonia) }}>
                                                    {kandang.amonia} ppm
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alarm Messages */}
                                        {kandang.alarmMessages.length > 0 && (
                                            <div style={{
                                                padding: '8px 10px', backgroundColor: kandang.alarmStatus === 'critical' ? '#fef2f2' : '#fffbeb',
                                                borderRadius: '8px', marginBottom: '8px',
                                                border: `1px solid ${kandang.alarmStatus === 'critical' ? '#fecaca' : '#fde68a'}`
                                            }}>
                                                <div style={{ fontSize: '11px', fontWeight: 600, color: kandang.alarmStatus === 'critical' ? '#dc2626' : '#d97706', marginBottom: '4px' }}>
                                                    ⚠️ Alarm ({kandang.alarmCount})
                                                </div>
                                                {kandang.alarmMessages.map((msg, i) => (
                                                    <div key={i} style={{ fontSize: '11px', color: '#64748b', padding: '1px 0' }}>• {msg}</div>
                                                ))}
                                            </div>
                                        )}

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
                        )
                    })}
                </MapContainer>
            </div>
        </div>
    )
}
