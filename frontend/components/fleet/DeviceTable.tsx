'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink, Wifi, WifiOff } from 'lucide-react'
import clsx from 'clsx'

interface Device {
    id: string
    device_key: string
    name: string
    type: string
    firmware: string | null
    status: string
    last_seen: string | null
}

interface DeviceTableProps {
    devices: Device[]
    selectedDevices: string[]
    onSelectDevice: (deviceId: string) => void
    onSelectAll: () => void
}

export default function DeviceTable({
    devices,
    selectedDevices,
    onSelectDevice,
    onSelectAll,
}: DeviceTableProps) {
    const allSelected = devices.length > 0 && selectedDevices.length === devices.length

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-dark-400 border-b border-dark-100">
                    <tr>
                        <th className="px-4 py-3 text-left">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={onSelectAll}
                                className="rounded border-dark-100 bg-dark-300"
                            />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Device
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Firmware
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Last Seen
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                    {devices.map((device) => (
                        <tr
                            key={device.id}
                            className={clsx(
                                'hover:bg-dark-300 transition-colors',
                                selectedDevices.includes(device.id) && 'bg-primary-900/20'
                            )}
                        >
                            <td className="px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={selectedDevices.includes(device.id)}
                                    onChange={() => onSelectDevice(device.id)}
                                    className="rounded border-dark-100 bg-dark-300"
                                />
                            </td>
                            <td className="px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-white">{device.name}</p>
                                    <p className="text-xs text-gray-500">{device.device_key}</p>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className="badge badge-info capitalize">{device.type}</span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                    {device.status === 'online' ? (
                                        <>
                                            <Wifi className="w-4 h-4 text-green-500" />
                                            <span className="text-sm text-green-400">Online</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-400">Offline</span>
                                        </>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                                {device.firmware || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                                {device.last_seen
                                    ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })
                                    : 'Never'}
                            </td>
                            <td className="px-4 py-3">
                                <Link
                                    href={`/devices/${device.id}`}
                                    className="text-primary-400 hover:text-primary-300 flex items-center text-sm"
                                >
                                    View <ExternalLink className="w-3 h-3 ml-1" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {devices.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No devices found
                </div>
            )}
        </div>
    )
}
