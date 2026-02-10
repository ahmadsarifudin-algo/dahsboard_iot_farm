'use client'

import { useState } from 'react'
import { Fuel, Power, Clock, Gauge, Target, Settings } from 'lucide-react'
import { DieselControl, DEFAULT_DIESEL_CONTROL, DIESEL_UNITS_PER_FLOOR } from '@/lib/productConfig'

interface DieselControlPanelProps {
    dieselControls?: DieselControl[]
    onControlChange?: (dieselId: number, control: DieselControl) => void
    title?: string
}

export default function DieselControlPanel({
    dieselControls,
    onControlChange,
    title = 'Diesel Control'
}: DieselControlPanelProps) {
    // Generate default controls if not provided
    const [controls, setControls] = useState<DieselControl[]>(
        dieselControls || Array.from({ length: DIESEL_UNITS_PER_FLOOR }, () => ({ ...DEFAULT_DIESEL_CONTROL }))
    )

    const [expandedDiesel, setExpandedDiesel] = useState<number | null>(null)

    const updateControl = (dieselId: number, updates: Partial<DieselControl>) => {
        setControls(prev => prev.map((ctrl, i) =>
            i === dieselId ? { ...ctrl, ...updates } : ctrl
        ))
        if (onControlChange) {
            onControlChange(dieselId, { ...controls[dieselId], ...updates })
        }
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
                <Settings className="w-5 h-5 mr-2 text-amber-400" />
                {title}
            </h3>

            <div className="space-y-3">
                {controls.map((control, dieselId) => (
                    <div key={dieselId} className="bg-dark-400 rounded-xl overflow-hidden">
                        {/* Diesel Header */}
                        <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-300 transition-colors"
                            onClick={() => setExpandedDiesel(expandedDiesel === dieselId ? null : dieselId)}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${control.enabled ? 'bg-amber-500/20' : 'bg-dark-300'
                                    }`}>
                                    <Fuel className={`w-5 h-5 ${control.enabled ? 'text-amber-400' : 'text-gray-500'}`} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-white">Diesel {dieselId + 1}</h4>
                                    <span className="text-xs text-gray-500">
                                        {control.enabled ? `${control.targetRpm} RPM` : 'OFF'}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Toggle */}
                            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={control.enabled}
                                    onChange={(e) => updateControl(dieselId, { enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-dark-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                            </label>
                        </div>

                        {/* Expanded Controls */}
                        {expandedDiesel === dieselId && (
                            <div className="p-4 pt-0 space-y-4 border-t border-dark-300">
                                {/* RPM Slider */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-400">Target RPM</span>
                                        <span className="text-amber-400 font-mono">{control.targetRpm}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="500"
                                        max="3000"
                                        step="50"
                                        value={control.targetRpm}
                                        onChange={(e) => updateControl(dieselId, { targetRpm: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-dark-300 rounded-lg appearance-none cursor-pointer"
                                        disabled={!control.enabled}
                                    />
                                </div>

                                {/* Intermittent On/Off */}
                                <div className="bg-dark-300 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-blue-400" />
                                            <span className="text-sm text-white">Intermittent On/Off</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={control.intermittent.enabled}
                                                onChange={(e) => updateControl(dieselId, {
                                                    intermittent: { ...control.intermittent, enabled: e.target.checked }
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-dark-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    {control.intermittent.enabled && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500">ON (detik)</label>
                                                <input
                                                    type="number"
                                                    value={control.intermittent.onDuration}
                                                    onChange={(e) => updateControl(dieselId, {
                                                        intermittent: { ...control.intermittent, onDuration: parseInt(e.target.value) }
                                                    })}
                                                    className="input w-full text-center mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">OFF (detik)</label>
                                                <input
                                                    type="number"
                                                    value={control.intermittent.offDuration}
                                                    onChange={(e) => updateControl(dieselId, {
                                                        intermittent: { ...control.intermittent, offDuration: parseInt(e.target.value) }
                                                    })}
                                                    className="input w-full text-center mt-1"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Intermittent RPM */}
                                <div className="bg-dark-300 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <Gauge className="w-4 h-4 text-cyan-400" />
                                            <span className="text-sm text-white">Intermittent RPM</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={control.intermittentRpm.enabled}
                                                onChange={(e) => updateControl(dieselId, {
                                                    intermittentRpm: { ...control.intermittentRpm, enabled: e.target.checked }
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-dark-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                                        </label>
                                    </div>
                                    {control.intermittentRpm.enabled && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500">Low RPM</label>
                                                <input
                                                    type="number"
                                                    value={control.intermittentRpm.lowRpm}
                                                    onChange={(e) => updateControl(dieselId, {
                                                        intermittentRpm: { ...control.intermittentRpm, lowRpm: parseInt(e.target.value) }
                                                    })}
                                                    className="input w-full text-center mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">High RPM</label>
                                                <input
                                                    type="number"
                                                    value={control.intermittentRpm.highRpm}
                                                    onChange={(e) => updateControl(dieselId, {
                                                        intermittentRpm: { ...control.intermittentRpm, highRpm: parseInt(e.target.value) }
                                                    })}
                                                    className="input w-full text-center mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Low Duration (s)</label>
                                                <input
                                                    type="number"
                                                    value={control.intermittentRpm.lowDuration}
                                                    onChange={(e) => updateControl(dieselId, {
                                                        intermittentRpm: { ...control.intermittentRpm, lowDuration: parseInt(e.target.value) }
                                                    })}
                                                    className="input w-full text-center mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">High Duration (s)</label>
                                                <input
                                                    type="number"
                                                    value={control.intermittentRpm.highDuration}
                                                    onChange={(e) => updateControl(dieselId, {
                                                        intermittentRpm: { ...control.intermittentRpm, highDuration: parseInt(e.target.value) }
                                                    })}
                                                    className="input w-full text-center mt-1"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Target Mode */}
                                <div className="bg-dark-300 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <Target className="w-4 h-4 text-yellow-400" />
                                            <span className="text-sm text-white">Target Mode</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={control.target.enabled}
                                                onChange={(e) => updateControl(dieselId, {
                                                    target: { ...control.target, enabled: e.target.checked }
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-dark-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-600"></div>
                                        </label>
                                    </div>
                                    {control.target.enabled && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-500">Target Suhu (°C)</label>
                                                    <input
                                                        type="number"
                                                        value={control.target.targetTemp}
                                                        onChange={(e) => updateControl(dieselId, {
                                                            target: { ...control.target, targetTemp: parseFloat(e.target.value) }
                                                        })}
                                                        className="input w-full text-center mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Referensi Suhu</label>
                                                    <select
                                                        value={control.target.tempReference}
                                                        onChange={(e) => updateControl(dieselId, {
                                                            target: { ...control.target, tempReference: e.target.value as any }
                                                        })}
                                                        className="input w-full mt-1"
                                                    >
                                                        <option value="avg">Average</option>
                                                        <option value="top">Atas</option>
                                                        <option value="bottom">Bawah</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-500">RPM Max</label>
                                                    <input
                                                        type="number"
                                                        value={control.target.rpmMax}
                                                        onChange={(e) => updateControl(dieselId, {
                                                            target: { ...control.target, rpmMax: parseInt(e.target.value) }
                                                        })}
                                                        className="input w-full text-center mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">RPM Min</label>
                                                    <input
                                                        type="number"
                                                        value={control.target.rpmMin}
                                                        onChange={(e) => updateControl(dieselId, {
                                                            target: { ...control.target, rpmMin: parseInt(e.target.value) }
                                                        })}
                                                        className="input w-full text-center mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-500">Delta Temp (°C)</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={control.target.deltaTemp}
                                                        onChange={(e) => updateControl(dieselId, {
                                                            target: { ...control.target, deltaTemp: parseFloat(e.target.value) }
                                                        })}
                                                        className="input w-full text-center mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Delta RPM</label>
                                                    <input
                                                        type="number"
                                                        value={control.target.deltaRpm}
                                                        onChange={(e) => updateControl(dieselId, {
                                                            target: { ...control.target, deltaRpm: parseInt(e.target.value) }
                                                        })}
                                                        className="input w-full text-center mt-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
