'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, RefreshCw, Home, MapPin, Cpu, Edit, Trash2, X, AlertTriangle, Wifi, WifiOff, ThermometerSun, Droplets, Users } from 'lucide-react'
import Link from 'next/link'
import { iotApi, Kandang } from '@/lib/iot-api'
import authService from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function KandangListPage() {
    const router = useRouter()
    const [kandangList, setKandangList] = useState<Kandang[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedKandang, setSelectedKandang] = useState<Kandang | null>(null)

    // Form state for add/edit
    const [formData, setFormData] = useState({
        kode: '',
        alamat: '',
        populasi: '',
        jenisBudidaya: 'broiler'
    })

    // Check authentication on mount
    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push('/login')
            return
        }
        loadKandangList()
    }, [router])

    async function loadKandangList() {
        try {
            setLoading(true)
            setError(null)
            const response = await iotApi.getKandangList()
            setKandangList(response.data || [])
        } catch (err: any) {
            console.error('Failed to load kandang list:', err)
            setError(err.message || 'Gagal memuat data kandang')
        } finally {
            setLoading(false)
        }
    }

    function handleEditClick(e: React.MouseEvent, kandang: Kandang) {
        e.preventDefault()
        e.stopPropagation()
        setSelectedKandang(kandang)
        setFormData({
            kode: kandang.kode,
            alamat: kandang.alamat,
            populasi: kandang.populasi.toString(),
            jenisBudidaya: kandang.jenisBudidaya || 'broiler'
        })
        setShowEditModal(true)
    }

    function handleDeleteClick(e: React.MouseEvent, kandang: Kandang) {
        e.preventDefault()
        e.stopPropagation()
        setSelectedKandang(kandang)
        setShowDeleteModal(true)
    }

    async function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedKandang) return

        // TODO: Integrate with edit API when available
        console.log('Edit kandang:', formData)
        setShowEditModal(false)
        setSelectedKandang(null)
        resetForm()
    }

    async function handleDeleteConfirm() {
        if (!selectedKandang) return

        try {
            await iotApi.deleteKandang(selectedKandang._id)
            // Reload list after delete
            await loadKandangList()
        } catch (err) {
            console.error('Failed to delete kandang:', err)
        }

        setShowDeleteModal(false)
        setSelectedKandang(null)
    }

    async function handleAddSubmit(e: React.FormEvent) {
        e.preventDefault()

        try {
            await iotApi.createKandang({
                kode: formData.kode,
                alamat: formData.alamat,
                tipe: 1,
                populasi: parseInt(formData.populasi) || 0,
                jenisBudidaya: formData.jenisBudidaya
            })
            // Reload list after add
            await loadKandangList()
            setShowAddModal(false)
            resetForm()
        } catch (err) {
            console.error('Failed to create kandang:', err)
        }
    }

    function resetForm() {
        setFormData({
            kode: '',
            alamat: '',
            populasi: '',
            jenisBudidaya: 'broiler'
        })
    }

    // Get first flock stats for display
    function getFlockStats(kandang: Kandang) {
        if (!kandang.flocks || kandang.flocks.length === 0) {
            return { temperature: null, humidity: null, connected: false }
        }
        const firstFlock = kandang.flocks[0]
        return {
            temperature: firstFlock.actualTemperature ? (firstFlock.actualTemperature / 10).toFixed(1) : null,
            humidity: firstFlock.humidity ? (firstFlock.humidity / 10).toFixed(1) : null,
            connected: firstFlock.connected
        }
    }

    // Count online devices
    function getOnlineDevices(kandang: Kandang) {
        if (!kandang.flocks) return { online: 0, total: 0 }
        const online = kandang.flocks.filter(f => f.connected).length
        return { online, total: kandang.flocks.length }
    }

    // Get kandang type label
    function getKandangType(tipe: number): string {
        const types: Record<number, string> = {
            1: 'Close House Full Auto',
            2: 'Open House',
            3: 'Close House Semi Auto',
            4: 'Open House Panggung',
            5: 'Open House Postal',
            6: 'Open House Tingkat',
            7: 'Close House Retrofit'
        }
        return types[tipe] || 'Unknown'
    }

    // Get floor name based on index and total floors
    function getFloorName(index: number, totalFloors: number): string {
        if (totalFloors === 1) return 'Lantai'
        if (totalFloors === 2) {
            return index === 0 ? 'Lantai Bawah' : 'Lantai Atas'
        }
        if (totalFloors === 3) {
            if (index === 0) return 'Lantai Bawah'
            if (index === 1) return 'Lantai Tengah'
            return 'Lantai Atas'
        }
        return `Lantai ${index + 1}`
    }

    const filteredKandang = kandangList.filter(kandang =>
        kandang.kode.toLowerCase().includes(search.toLowerCase()) ||
        kandang.alamat.toLowerCase().includes(search.toLowerCase()) ||
        (kandang.province && kandang.province.toLowerCase().includes(search.toLowerCase())) ||
        (kandang.regency && kandang.regency.toLowerCase().includes(search.toLowerCase()))
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
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
                        <Home className="w-6 h-6 mr-3 text-primary-500" />
                        List Kandang
                    </h1>
                    <p className="text-gray-400 mt-1">Kelola daftar kandang/site dalam sistem</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => {
                            resetForm()
                            setShowAddModal(true)
                        }}
                        className="btn-primary flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Kandang
                    </button>
                    <button
                        onClick={() => loadKandangList()}
                        className="btn-secondary flex items-center"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">{error}</span>
                    <button
                        onClick={() => loadKandangList()}
                        className="ml-auto text-sm text-red-400 hover:text-red-300"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="card">
                <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Cari kandang..."
                            className="input w-full pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-sm text-gray-400">
                        {filteredKandang.length} kandang
                    </span>
                </div>
            </div>

            {/* Kandang Grid */}
            {filteredKandang.length === 0 ? (
                <div className="card text-center py-12">
                    <Home className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">
                        {search ? 'Tidak ada kandang yang ditemukan' : 'Belum ada kandang terdaftar'}
                    </p>
                    {!search && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary mt-4"
                        >
                            <Plus className="w-4 h-4 mr-2 inline" />
                            Tambah Kandang Pertama
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredKandang.map((kandang) => {
                        const stats = getFlockStats(kandang)
                        const devices = getOnlineDevices(kandang)

                        return (
                            <Link
                                key={kandang._id}
                                href={`/fleet/kandang/${kandang._id}`}
                                className="card card-hover group cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center mr-3">
                                            <Home className="w-5 h-5 text-primary-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{kandang.kode}</h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">{kandang.jenisBudidaya}</span>
                                                <span className="text-xs px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded">
                                                    {getKandangType(kandang.tipe)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {/* Connection Status */}
                                        <div className={`px-2 py-1 rounded-full text-xs flex items-center ${devices.online > 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {devices.online > 0 ? (
                                                <Wifi className="w-3 h-3 mr-1" />
                                            ) : (
                                                <WifiOff className="w-3 h-3 mr-1" />
                                            )}
                                            {devices.online}/{devices.total}
                                        </div>
                                        {/* Edit/Delete buttons */}
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleEditClick(e, kandang)}
                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-300 rounded"
                                                title="Edit Kandang"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteClick(e, kandang)}
                                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-dark-300 rounded"
                                                title="Hapus Kandang"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="flex items-start text-sm text-gray-400 mb-3">
                                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>{kandang.alamat}, {kandang.regency}</span>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {/* Population */}
                                    <div className="bg-dark-400 rounded-lg p-2 text-center">
                                        <Users className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                                        <p className="text-xs text-gray-500">Populasi</p>
                                        <p className="text-sm font-semibold text-white">
                                            {kandang.populasi.toLocaleString()}
                                        </p>
                                    </div>
                                    {/* Temperature */}
                                    <div className="bg-dark-400 rounded-lg p-2 text-center">
                                        <ThermometerSun className="w-4 h-4 mx-auto mb-1 text-orange-400" />
                                        <p className="text-xs text-gray-500">Suhu</p>
                                        <p className="text-sm font-semibold text-white">
                                            {stats.temperature ? `${stats.temperature}°C` : '-'}
                                        </p>
                                    </div>
                                    {/* Humidity */}
                                    <div className="bg-dark-400 rounded-lg p-2 text-center">
                                        <Droplets className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                                        <p className="text-xs text-gray-500">Kelembaban</p>
                                        <p className="text-sm font-semibold text-white">
                                            {stats.humidity ? `${stats.humidity}%` : '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-dark-100">
                                    <div className="flex items-center text-sm">
                                        <Cpu className="w-4 h-4 mr-2 text-gray-500" />
                                        <span className="text-gray-400">
                                            {kandang.floor_count} lantai, {kandang.flock_count} device
                                        </span>
                                    </div>
                                    <span className="text-sm text-primary-400 group-hover:text-primary-300">
                                        Lihat Detail →
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {/* Add Kandang Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    />
                    <div className="relative bg-dark-300 border border-dark-100 rounded-xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Tambah Kandang Baru</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Kode Kandang *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="KANDANG-001"
                                    value={formData.kode}
                                    onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Alamat *</label>
                                <textarea
                                    className="input w-full h-20"
                                    placeholder="Alamat lengkap..."
                                    value={formData.alamat}
                                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Populasi</label>
                                    <input
                                        type="number"
                                        className="input w-full"
                                        placeholder="10000"
                                        value={formData.populasi}
                                        onChange={(e) => setFormData({ ...formData, populasi: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Jenis Budidaya</label>
                                    <select
                                        className="input w-full"
                                        value={formData.jenisBudidaya}
                                        onChange={(e) => setFormData({ ...formData, jenisBudidaya: e.target.value })}
                                    >
                                        <option value="broiler">Broiler</option>
                                        <option value="layer">Layer</option>
                                        <option value="breeder">Breeder</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-dark-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary"
                                >
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary">
                                    <Plus className="w-4 h-4 mr-2 inline" />
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Kandang Modal */}
            {showEditModal && selectedKandang && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowEditModal(false)}
                    />
                    <div className="relative bg-dark-300 border border-dark-100 rounded-xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <Edit className="w-5 h-5 mr-2 text-primary-400" />
                                Edit Kandang
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Kode Kandang *</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="KANDANG-001"
                                    value={formData.kode}
                                    onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Alamat *</label>
                                <textarea
                                    className="input w-full h-20"
                                    placeholder="Alamat lengkap..."
                                    value={formData.alamat}
                                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Populasi</label>
                                    <input
                                        type="number"
                                        className="input w-full"
                                        placeholder="10000"
                                        value={formData.populasi}
                                        onChange={(e) => setFormData({ ...formData, populasi: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Jenis Budidaya</label>
                                    <select
                                        className="input w-full"
                                        value={formData.jenisBudidaya}
                                        onChange={(e) => setFormData({ ...formData, jenisBudidaya: e.target.value })}
                                    >
                                        <option value="broiler">Broiler</option>
                                        <option value="layer">Layer</option>
                                        <option value="breeder">Breeder</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-dark-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="btn-secondary"
                                >
                                    Batal
                                </button>
                                <button type="submit" className="btn-primary">
                                    <Edit className="w-4 h-4 mr-2 inline" />
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedKandang && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <div className="relative bg-dark-300 border border-dark-100 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-slide-up">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Hapus Kandang?</h2>
                            <p className="text-gray-400 mb-4">
                                Yakin ingin menghapus <strong className="text-white">{selectedKandang.kode}</strong>?
                            </p>
                            <p className="text-sm text-red-400 mb-6">
                                Tindakan ini tidak dapat dibatalkan dan semua data terkait akan hilang.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 mr-2 inline" />
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
