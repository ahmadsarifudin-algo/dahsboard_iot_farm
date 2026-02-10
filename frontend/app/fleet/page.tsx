'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, RefreshCw, Plus, Wrench, Wifi, WifiOff, X, Calendar, Building2, ChevronDown, Camera, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, differenceInDays, differenceInMonths } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

// ============= Types =============
interface DeviceItem {
    id: string
    partNumber: string
    name: string
    type: string
    kandangOwner: string
    tanggalPasang: string       // ISO date
    ownership: 'sewa' | 'beli' | 'dismantle'
    status: 'online' | 'offline'
    maintenanceLogs: MaintenanceLog[]
}

interface MaintenanceLog {
    id: string
    date: string               // ISO date
    nameMaintenance: string
    activity: string
    problemToSolve: string
    status: 'pending' | 'in_progress' | 'done'
    fotoBefore: string | null  // URL
    fotoAfter: string | null   // URL
}

// ============= Dummy Data =============
const DUMMY_DEVICES: DeviceItem[] = [
    {
        id: 'dev-001', partNumber: 'CT-624-001', name: 'Ci-Touch 624', type: 'Ci-Touch624',
        kandangOwner: 'Kandang A1', tanggalPasang: '2024-08-15', ownership: 'beli', status: 'online',
        maintenanceLogs: [
            { id: 'ml-001', date: '2025-12-10', nameMaintenance: 'Ahmad Rudi', activity: 'Kalibrasi sensor suhu', problemToSolve: 'Deviasi suhu ±2°C', status: 'done', fotoBefore: null, fotoAfter: null },
            { id: 'ml-002', date: '2026-01-20', nameMaintenance: 'Budi Santoso', activity: 'Ganti relay fan', problemToSolve: 'Relay fan 3 mati', status: 'done', fotoBefore: null, fotoAfter: null },
        ]
    },
    {
        id: 'dev-002', partNumber: 'CT-624-002', name: 'Ci-Touch 624', type: 'Ci-Touch624',
        kandangOwner: 'Kandang A2', tanggalPasang: '2024-06-01', ownership: 'sewa', status: 'online',
        maintenanceLogs: [
            { id: 'ml-003', date: '2025-11-05', nameMaintenance: 'Dedi Pratama', activity: 'Pembersihan sensor', problemToSolve: 'Sensor ammonia kotor', status: 'done', fotoBefore: null, fotoAfter: null },
        ]
    },
    {
        id: 'dev-003', partNumber: 'CT-624-003', name: 'Ci-Touch 624', type: 'Ci-Touch624',
        kandangOwner: 'Kandang B1', tanggalPasang: '2025-01-10', ownership: 'beli', status: 'offline',
        maintenanceLogs: [
            { id: 'ml-004', date: '2026-02-01', nameMaintenance: 'Ahmad Rudi', activity: 'Ganti board utama', problemToSolve: 'Board utama error, tidak bisa boot', status: 'in_progress', fotoBefore: null, fotoAfter: null },
        ]
    },
    {
        id: 'dev-004', partNumber: 'CT-624-004', name: 'Ci-Touch 624', type: 'Ci-Touch624',
        kandangOwner: 'Kandang B2', tanggalPasang: '2024-03-20', ownership: 'sewa', status: 'online',
        maintenanceLogs: []
    },
    {
        id: 'dev-005', partNumber: 'CT-400-001', name: 'Ci-Touch 400', type: 'Ci-Touch400',
        kandangOwner: 'Kandang C1', tanggalPasang: '2023-11-01', ownership: 'dismantle', status: 'offline',
        maintenanceLogs: [
            { id: 'ml-005', date: '2025-06-15', nameMaintenance: 'Siti Aminah', activity: 'Dismantle unit', problemToSolve: 'Unit sudah EOL, diganti model baru', status: 'done', fotoBefore: null, fotoAfter: null },
        ]
    },
    {
        id: 'dev-006', partNumber: 'CT-624-005', name: 'Ci-Touch 624', type: 'Ci-Touch624',
        kandangOwner: 'Kandang C2', tanggalPasang: '2025-05-12', ownership: 'beli', status: 'online',
        maintenanceLogs: [
            { id: 'ml-006', date: '2026-01-28', nameMaintenance: 'Budi Santoso', activity: 'Update firmware v2.3', problemToSolve: 'Bug pada pembacaan humidity', status: 'done', fotoBefore: null, fotoAfter: null },
            { id: 'ml-007', date: '2026-02-05', nameMaintenance: 'Ahmad Rudi', activity: 'Cek koneksi WiFi', problemToSolve: 'Intermittent disconnect', status: 'pending', fotoBefore: null, fotoAfter: null },
        ]
    },
    {
        id: 'dev-007', partNumber: 'CT-624-006', name: 'Ci-Touch 624', type: 'Ci-Touch624',
        kandangOwner: 'Kandang D1', tanggalPasang: '2024-12-01', ownership: 'sewa', status: 'online',
        maintenanceLogs: []
    },
    {
        id: 'dev-008', partNumber: 'CT-400-002', name: 'Ci-Touch 400', type: 'Ci-Touch400',
        kandangOwner: 'Kandang D2', tanggalPasang: '2024-01-15', ownership: 'beli', status: 'online',
        maintenanceLogs: [
            { id: 'ml-008', date: '2025-09-10', nameMaintenance: 'Dedi Pratama', activity: 'Ganti sensor suhu', problemToSolve: 'Sensor NTC rusak', status: 'done', fotoBefore: null, fotoAfter: null },
        ]
    },
]

// ============= Helpers =============
function getMasaAktif(tanggalPasang: string): string {
    const now = new Date()
    const installed = new Date(tanggalPasang)
    const months = differenceInMonths(now, installed)
    const days = differenceInDays(now, installed) % 30

    if (months >= 12) {
        const years = Math.floor(months / 12)
        const remainMonths = months % 12
        return `${years} thn ${remainMonths} bln`
    }
    if (months > 0) return `${months} bln ${days} hari`
    return `${differenceInDays(now, installed)} hari`
}

function getOwnershipBadge(ownership: string) {
    switch (ownership) {
        case 'beli': return { label: 'Beli', className: 'bg-green-500/20 text-green-400 border-green-500/30' }
        case 'sewa': return { label: 'Sewa', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
        case 'dismantle': return { label: 'Dismantle', className: 'bg-red-500/20 text-red-400 border-red-500/30' }
        default: return { label: ownership, className: 'bg-gray-500/20 text-gray-400' }
    }
}

function getMaintenanceStatusBadge(status: string) {
    switch (status) {
        case 'done': return { label: 'Selesai', className: 'bg-green-500/20 text-green-400' }
        case 'in_progress': return { label: 'Proses', className: 'bg-yellow-500/20 text-yellow-400' }
        case 'pending': return { label: 'Pending', className: 'bg-gray-500/20 text-gray-400' }
        default: return { label: status, className: 'bg-gray-500/20 text-gray-400' }
    }
}

// ============= Component =============
export default function FleetDeviceListPage() {
    const [devices] = useState<DeviceItem[]>(DUMMY_DEVICES)
    const [search, setSearch] = useState('')
    const [ownershipFilter, setOwnershipFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null)
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)

    const filteredDevices = devices.filter(d => {
        const matchSearch = !search ||
            d.partNumber.toLowerCase().includes(search.toLowerCase()) ||
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.kandangOwner.toLowerCase().includes(search.toLowerCase())
        const matchOwnership = !ownershipFilter || d.ownership === ownershipFilter
        const matchStatus = !statusFilter || d.status === statusFilter
        return matchSearch && matchOwnership && matchStatus
    })

    function openMaintenanceLog(device: DeviceItem) {
        setSelectedDevice(device)
        setShowMaintenanceModal(true)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">List Device</h1>
                    <p className="text-gray-400 mt-1">Manajemen perangkat IoT terpasang</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                        {filteredDevices.length} dari {devices.length} device
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px] max-w-md relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Cari part number, nama, kandang..."
                            className="input w-full pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Ownership Filter */}
                    <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="input"
                            value={ownershipFilter}
                            onChange={(e) => setOwnershipFilter(e.target.value)}
                        >
                            <option value="">Semua Ownership</option>
                            <option value="beli">Beli</option>
                            <option value="sewa">Sewa</option>
                            <option value="dismantle">Dismantle</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <select
                        className="input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Semua Status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-dark-300 border border-dark-100 text-center">
                    <p className="text-xs text-gray-500">Total Device</p>
                    <p className="text-xl font-bold text-white">{devices.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-xs text-gray-500">Online</p>
                    <p className="text-xl font-bold text-green-400">{devices.filter(d => d.status === 'online').length}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-xs text-gray-500">Offline</p>
                    <p className="text-xl font-bold text-red-400">{devices.filter(d => d.status === 'offline').length}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-xs text-gray-500">Sewa</p>
                    <p className="text-xl font-bold text-blue-400">{devices.filter(d => d.ownership === 'sewa').length}</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                    <p className="text-xs text-gray-500">Dismantle</p>
                    <p className="text-xl font-bold text-yellow-400">{devices.filter(d => d.ownership === 'dismantle').length}</p>
                </div>
            </div>

            {/* Device Table - Desktop */}
            <div className="card p-0 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-dark-400 text-xs text-gray-500 uppercase tracking-wider border-b border-dark-100">
                                <th className="text-left py-3 px-4 font-medium">#</th>
                                <th className="text-left py-3 px-4 font-medium">Part Number</th>
                                <th className="text-left py-3 px-4 font-medium">Kandang Owner</th>
                                <th className="text-center py-3 px-4 font-medium">Tgl Pasang</th>
                                <th className="text-center py-3 px-4 font-medium">Ownership</th>
                                <th className="text-center py-3 px-4 font-medium">Status</th>
                                <th className="text-center py-3 px-4 font-medium">Masa Aktif</th>
                                <th className="text-center py-3 px-4 font-medium">Maintenance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-100">
                            {filteredDevices.map((device, idx) => {
                                const owBadge = getOwnershipBadge(device.ownership)
                                return (
                                    <tr key={device.id} className="hover:bg-dark-400/50 transition-colors">
                                        <td className="py-3 px-4 text-sm text-gray-500 font-mono">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="text-sm font-medium text-white">{device.partNumber}</p>
                                                <p className="text-xs text-gray-500">{device.name} · {device.type}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center space-x-2">
                                                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                                                <span className="text-sm text-gray-300">{device.kandangOwner}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center space-x-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                                <span className="text-sm text-gray-300">
                                                    {format(new Date(device.tanggalPasang), 'dd MMM yyyy', { locale: idLocale })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${owBadge.className}`}>
                                                {owBadge.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center space-x-1.5">
                                                {device.status === 'online' ? (
                                                    <>
                                                        <Wifi className="w-3.5 h-3.5 text-green-500" />
                                                        <span className="text-sm text-green-400">Online</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <WifiOff className="w-3.5 h-3.5 text-gray-500" />
                                                        <span className="text-sm text-gray-400">Offline</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-sm text-gray-300">{getMasaAktif(device.tanggalPasang)}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => openMaintenanceLog(device)}
                                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-500/30 transition-all"
                                            >
                                                <ClipboardList className="w-3.5 h-3.5" />
                                                <span>Log ({device.maintenanceLogs.length})</span>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    {filteredDevices.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Tidak ada device ditemukan
                        </div>
                    )}
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-dark-100">
                    {filteredDevices.map((device, idx) => {
                        const owBadge = getOwnershipBadge(device.ownership)
                        return (
                            <div key={device.id} className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{device.partNumber}</p>
                                        <p className="text-xs text-gray-500">{device.name}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${owBadge.className}`}>
                                            {owBadge.label}
                                        </span>
                                        {device.status === 'online' ? (
                                            <Wifi className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <WifiOff className="w-4 h-4 text-gray-500" />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded-lg bg-dark-400">
                                        <p className="text-[10px] text-gray-500">Kandang</p>
                                        <p className="text-xs font-medium text-white">{device.kandangOwner}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-dark-400">
                                        <p className="text-[10px] text-gray-500">Tgl Pasang</p>
                                        <p className="text-xs font-medium text-white">{format(new Date(device.tanggalPasang), 'dd/MM/yy')}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-dark-400">
                                        <p className="text-[10px] text-gray-500">Masa Aktif</p>
                                        <p className="text-xs font-medium text-white">{getMasaAktif(device.tanggalPasang)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openMaintenanceLog(device)}
                                    className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 border border-primary-500/30 transition-all"
                                >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    <span>Log Maintenance ({device.maintenanceLogs.length})</span>
                                </button>
                            </div>
                        )
                    })}
                    {filteredDevices.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Tidak ada device ditemukan
                        </div>
                    )}
                </div>
            </div>

            {/* ============= Maintenance Log Modal ============= */}
            {showMaintenanceModal && selectedDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowMaintenanceModal(false)}
                    />
                    <div className="relative bg-dark-300 border border-dark-100 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-dark-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-white flex items-center">
                                        <Wrench className="w-5 h-5 mr-2 text-primary-400" />
                                        Log Maintenance
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {selectedDevice.partNumber} — {selectedDevice.kandangOwner}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowMaintenanceModal(false)}
                                    className="p-2 rounded-lg hover:bg-dark-200 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
                            {selectedDevice.maintenanceLogs.length === 0 ? (
                                <div className="text-center py-12">
                                    <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500">Belum ada log maintenance</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-dark-400 text-xs text-gray-500 uppercase tracking-wider">
                                                    <th className="text-left py-3 px-3 font-medium rounded-tl-lg">Tanggal</th>
                                                    <th className="text-left py-3 px-3 font-medium">Teknisi</th>
                                                    <th className="text-left py-3 px-3 font-medium">Aktivitas</th>
                                                    <th className="text-left py-3 px-3 font-medium">Problem</th>
                                                    <th className="text-center py-3 px-3 font-medium">Status</th>
                                                    <th className="text-center py-3 px-3 font-medium">Foto Before</th>
                                                    <th className="text-center py-3 px-3 font-medium rounded-tr-lg">Foto After</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-dark-100">
                                                {selectedDevice.maintenanceLogs.map((log) => {
                                                    const statusBadge = getMaintenanceStatusBadge(log.status)
                                                    return (
                                                        <tr key={log.id} className="hover:bg-dark-400/50 transition-colors">
                                                            <td className="py-3 px-3">
                                                                <span className="text-sm text-gray-300">
                                                                    {format(new Date(log.date), 'dd MMM yyyy', { locale: idLocale })}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className="text-sm text-white font-medium">{log.nameMaintenance}</span>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className="text-sm text-gray-300">{log.activity}</span>
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <span className="text-sm text-gray-400">{log.problemToSolve}</span>
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                                                    {statusBadge.label}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                {log.fotoBefore ? (
                                                                    <button className="p-1.5 rounded-lg bg-dark-400 hover:bg-dark-200 text-primary-400 transition-colors">
                                                                        <Camera className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-gray-600">—</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                {log.fotoAfter ? (
                                                                    <button className="p-1.5 rounded-lg bg-dark-400 hover:bg-dark-200 text-primary-400 transition-colors">
                                                                        <Camera className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-gray-600">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden space-y-3">
                                        {selectedDevice.maintenanceLogs.map((log) => {
                                            const statusBadge = getMaintenanceStatusBadge(log.status)
                                            return (
                                                <div key={log.id} className="p-4 rounded-xl bg-dark-400 border border-dark-100 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">
                                                            {format(new Date(log.date), 'dd MMM yyyy', { locale: idLocale })}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge.className}`}>
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-white">{log.activity}</p>
                                                    <p className="text-xs text-gray-400">{log.problemToSolve}</p>
                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-xs text-gray-500">Teknisi: <span className="text-gray-300">{log.nameMaintenance}</span></span>
                                                        <div className="flex items-center space-x-2">
                                                            {log.fotoBefore && (
                                                                <button className="text-[10px] text-primary-400 flex items-center">
                                                                    <Camera className="w-3 h-3 mr-0.5" /> Before
                                                                </button>
                                                            )}
                                                            {log.fotoAfter && (
                                                                <button className="text-[10px] text-primary-400 flex items-center">
                                                                    <Camera className="w-3 h-3 mr-0.5" /> After
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
