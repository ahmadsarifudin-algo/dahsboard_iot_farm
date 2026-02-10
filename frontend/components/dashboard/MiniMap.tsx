'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Leaflet
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

interface Site {
    id: string
    name: string
    lat: number
    lng: number
    region?: string
    devices?: {
        total: number
        online: number
    }
}

interface MiniMapProps {
    sites: Site[]
}

export default function MiniMap({ sites }: MiniMapProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="h-full flex items-center justify-center bg-dark-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            </div>
        )
    }

    // Calculate center from sites or default
    const center = sites.length > 0
        ? [
            sites.reduce((sum, s) => sum + s.lat, 0) / sites.length,
            sites.reduce((sum, s) => sum + s.lng, 0) / sites.length,
        ] as [number, number]
        : [13.7563, 100.5018] as [number, number] // Default: Bangkok

    return (
        <MapContainer
            center={center}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {sites.map((site) => (
                <Marker key={site.id} position={[site.lat, site.lng]}>
                    <Popup>
                        <div className="text-dark-500">
                            <h3 className="font-bold">{site.name}</h3>
                            {site.region && <p className="text-sm text-gray-600">{site.region}</p>}
                            {site.devices && (
                                <p className="text-sm mt-1">
                                    {site.devices.online}/{site.devices.total} devices online
                                </p>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
