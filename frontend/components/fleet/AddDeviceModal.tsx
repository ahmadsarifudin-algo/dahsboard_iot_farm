'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface Site {
    id: string
    name: string
}

interface AddDeviceModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const DEVICE_TYPES = [
    'CI Touch 115',
    'CI Touch 125',
    'CI Touch 135',
    'CI Touch Plus 218',
    'CI Touch Plus 228',
    'CI Touch Lite 514',
    'CI Sense',
    'CI Touch Diesel'
]

export default function AddDeviceModal({ isOpen, onClose, onSuccess }: AddDeviceModalProps) {
    const [formData, setFormData] = useState({
        device_key: '',
        name: '',
        type: 'CI Touch 115',
        site_id: '',
        firmware: '',
    })
    const [sites, setSites] = useState<Site[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadSites()
            // Reset form
            setFormData({
                device_key: '',
                name: '',
                type: 'CI Touch 115',
                site_id: '',
                firmware: '',
            })
            setError(null)
        }
    }, [isOpen])

    async function loadSites() {
        try {
            const data = await api.getSites()
            setSites(data as Site[])
        } catch (err) {
            console.error('Failed to load sites:', err)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            await api.createDevice({
                device_key: formData.device_key,
                name: formData.name,
                type: formData.type,
                site_id: formData.site_id || null,
                firmware: formData.firmware || null,
            })
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to create device')
        } finally {
            setLoading(false)
        }
    }

    function generateDeviceKey() {
        const key = `DEV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        setFormData({ ...formData, device_key: key })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-dark-300 border border-dark-100 rounded-xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <Plus className="w-5 h-5 mr-2 text-primary-500" />
                        Add New Device
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Device Key */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Device Key *</label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                className="input flex-1"
                                placeholder="DEV-XXXX-XXXX"
                                value={formData.device_key}
                                onChange={(e) => setFormData({ ...formData, device_key: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={generateDeviceKey}
                                className="btn-secondary text-sm px-3"
                            >
                                Generate
                            </button>
                        </div>
                    </div>

                    {/* Device Name */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Device Name *</label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="Temperature Sensor 001"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    {/* Device Type */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Device Type *</label>
                        <select
                            className="input w-full"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            required
                        >
                            {DEVICE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Site */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Assign to Site</label>
                        <select
                            className="input w-full"
                            value={formData.site_id}
                            onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                        >
                            <option value="">-- Not assigned --</option>
                            {sites.map((site) => (
                                <option key={site.id} value={site.id}>
                                    {site.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Firmware */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Firmware Version</label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="1.0.0"
                            value={formData.firmware}
                            onChange={(e) => setFormData({ ...formData, firmware: e.target.value })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-dark-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex items-center"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            Add Device
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
