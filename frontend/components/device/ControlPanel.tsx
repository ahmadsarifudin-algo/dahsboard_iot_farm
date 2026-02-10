'use client'

import { useState } from 'react'
import { Send, Power, RefreshCw, Settings, Sliders } from 'lucide-react'
import { api } from '@/lib/api'

interface DeviceDetail {
    id: string
    name: string
    type: string
    shadow_desired: Record<string, any>
    shadow_reported: Record<string, any>
}

interface ControlPanelProps {
    device: DeviceDetail
    onUpdate: () => void
}

const COMMON_COMMANDS = [
    { type: 'reboot', label: 'Reboot', icon: RefreshCw },
    { type: 'power_cycle', label: 'Power Cycle', icon: Power },
    { type: 'update_config', label: 'Update Config', icon: Settings },
    { type: 'calibrate', label: 'Calibrate', icon: Sliders },
]

export default function ControlPanel({ device, onUpdate }: ControlPanelProps) {
    const [customCommand, setCustomCommand] = useState('')
    const [customPayload, setCustomPayload] = useState('{}')
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    async function sendCommand(commandType: string, payload: object = {}) {
        setSending(true)
        setResult(null)

        try {
            await api.sendCommand(device.id, { command_type: commandType, payload })
            setResult({ success: true, message: `Command "${commandType}" sent successfully` })
            onUpdate()
        } catch (err) {
            setResult({ success: false, message: 'Failed to send command' })
        } finally {
            setSending(false)
        }
    }

    async function handleCustomCommand() {
        if (!customCommand.trim()) return

        try {
            const payload = JSON.parse(customPayload)
            await sendCommand(customCommand, payload)
            setCustomCommand('')
            setCustomPayload('{}')
        } catch (err) {
            setResult({ success: false, message: 'Invalid JSON payload' })
        }
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Device Control</h3>

            {/* Quick Commands */}
            <div>
                <h4 className="text-sm text-gray-400 mb-3">Quick Commands</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {COMMON_COMMANDS.map((cmd) => (
                        <button
                            key={cmd.type}
                            onClick={() => sendCommand(cmd.type)}
                            disabled={sending}
                            className="btn-secondary flex items-center justify-center py-3"
                        >
                            <cmd.icon className="w-4 h-4 mr-2" />
                            {cmd.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Command */}
            <div>
                <h4 className="text-sm text-gray-400 mb-3">Custom Command</h4>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Command type (e.g., set_threshold)"
                        className="input w-full"
                        value={customCommand}
                        onChange={(e) => setCustomCommand(e.target.value)}
                    />
                    <textarea
                        placeholder='Payload JSON (e.g., {"value": 25})'
                        className="input w-full h-24 font-mono text-sm"
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                    />
                    <button
                        onClick={handleCustomCommand}
                        disabled={sending || !customCommand.trim()}
                        className="btn-primary flex items-center"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Send Command
                    </button>
                </div>
            </div>

            {/* Result Message */}
            {result && (
                <div className={`p-3 rounded-lg ${result.success
                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                    {result.message}
                </div>
            )}

            {/* Shadow Update */}
            <div>
                <h4 className="text-sm text-gray-400 mb-3">Update Desired State</h4>
                <p className="text-xs text-gray-500 mb-2">
                    Changes will be pushed to the device via MQTT shadow/desired topic
                </p>
                <div className="bg-dark-400 p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Current desired state:</p>
                    <pre className="text-sm text-gray-300">
                        {JSON.stringify(device.shadow_desired, null, 2) || '{}'}
                    </pre>
                </div>
            </div>
        </div>
    )
}
