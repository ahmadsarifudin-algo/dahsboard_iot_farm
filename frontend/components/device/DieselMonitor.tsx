'use client'

import { Fuel, Battery, Gauge, Clock, Droplets, AlertCircle, Power } from 'lucide-react'
import { DieselUnit, DIESEL_UNITS_PER_FLOOR, DEFAULT_DIESEL_UNIT } from '@/lib/productConfig'

interface DieselMonitorProps {
    dieselUnits?: DieselUnit[]
    title?: string
}

export default function DieselMonitor({ dieselUnits, title = 'Diesel Monitoring' }: DieselMonitorProps) {
    // Generate default units if not provided
    const units = dieselUnits || Array.from({ length: DIESEL_UNITS_PER_FLOOR }, (_, i) => ({
        ...DEFAULT_DIESEL_UNIT,
        id: i + 1,
        name: `Diesel ${i + 1}`
    }))

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
                <Fuel className="w-5 h-5 mr-2 text-amber-400" />
                {title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {units.map(diesel => (
                    <div
                        key={diesel.id}
                        className={`p-4 rounded-xl border-2 transition-all ${diesel.isOn
                            ? 'bg-amber-500/10 border-amber-500/50'
                            : 'bg-dark-400 border-dark-100'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${diesel.isOn ? 'bg-amber-500/20' : 'bg-dark-300'
                                    }`}>
                                    <Fuel className={`w-5 h-5 ${diesel.isOn ? 'text-amber-400' : 'text-gray-500'}`} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-white">{diesel.name}</h4>
                                    <span className={`text-xs ${diesel.isOn ? 'text-amber-400' : 'text-gray-500'}`}>
                                        {diesel.isOn ? 'RUNNING' : 'OFF'}
                                    </span>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${diesel.isOn
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-dark-300 text-gray-500'
                                }`}>
                                {diesel.rpm} RPM
                            </div>
                        </div>

                        {/* Monitoring Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Operating Hours */}
                            <div className="bg-dark-300 p-2 rounded-lg text-center">
                                <Clock className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                                <p className="text-xs text-gray-500">OdoH</p>
                                <p className="text-sm font-medium text-white">{diesel.odoH}h</p>
                            </div>

                            {/* Fuel Level */}
                            <div className="bg-dark-300 p-2 rounded-lg text-center">
                                <Fuel className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                                <p className="text-xs text-gray-500">Fuel</p>
                                <p className={`text-sm font-medium ${diesel.fuelLevel < 20 ? 'text-red-400' :
                                    diesel.fuelLevel < 50 ? 'text-yellow-400' : 'text-green-400'
                                    }`}>{diesel.fuelLevel}%</p>
                            </div>

                            {/* Battery */}
                            <div className="bg-dark-300 p-2 rounded-lg text-center">
                                <Battery className="w-4 h-4 mx-auto mb-1 text-green-400" />
                                <p className="text-xs text-gray-500">Battery</p>
                                <p className={`text-sm font-medium ${diesel.batteryVolt < 11.5 ? 'text-red-400' : 'text-white'
                                    }`}>{diesel.batteryVolt}V</p>
                            </div>

                            {/* RPM */}
                            <div className="bg-dark-300 p-2 rounded-lg text-center">
                                <Gauge className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                                <p className="text-xs text-gray-500">RPM</p>
                                <p className="text-sm font-medium text-white">{diesel.rpm}</p>
                            </div>

                            {/* Coolant Status */}
                            <div className="bg-dark-300 p-2 rounded-lg text-center">
                                <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                                <p className="text-xs text-gray-500">Coolant</p>
                                <p className={`text-sm font-medium ${diesel.coolantOk ? 'text-green-400' : 'text-red-400'
                                    }`}>{diesel.coolantOk ? 'OK' : 'LOW'}</p>
                            </div>

                            {/* Oil Pressure */}
                            <div className="bg-dark-300 p-2 rounded-lg text-center">
                                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-orange-400" />
                                <p className="text-xs text-gray-500">Oil</p>
                                <p className={`text-sm font-medium ${diesel.oilPressOk ? 'text-green-400' : 'text-red-400'
                                    }`}>{diesel.oilPressOk ? 'OK' : 'LOW'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
