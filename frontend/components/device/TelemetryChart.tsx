'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '@/lib/api'

interface TelemetryChartProps {
    deviceId: string
}

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function TelemetryChart({ deviceId }: TelemetryChartProps) {
    const [data, setData] = useState<any[]>([])
    const [metrics, setMetrics] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [interval, setInterval] = useState('5m')

    useEffect(() => {
        loadTelemetry()
    }, [deviceId, interval])

    async function loadTelemetry() {
        try {
            setLoading(true)
            const response = await api.getDeviceTelemetry(deviceId, { interval })

            // Transform data for Recharts
            const metricsData = (response as any).metrics || {}
            const metricNames = Object.keys(metricsData)
            setMetrics(metricNames)

            // Merge all metrics by time
            const timeMap: Record<string, any> = {}

            for (const [metric, points] of Object.entries(metricsData)) {
                for (const point of points as any[]) {
                    if (!timeMap[point.time]) {
                        timeMap[point.time] = { time: new Date(point.time).toLocaleTimeString() }
                    }
                    timeMap[point.time][metric] = point.avg
                }
            }

            const chartData = Object.values(timeMap).sort((a: any, b: any) =>
                new Date(a.time).getTime() - new Date(b.time).getTime()
            )

            setData(chartData)
        } catch (err) {
            console.error('Failed to load telemetry:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Telemetry Data</h3>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Interval:</span>
                    <select
                        className="input text-sm"
                        value={interval}
                        onChange={(e) => setInterval(e.target.value)}
                    >
                        <option value="1m">1 minute</option>
                        <option value="5m">5 minutes</option>
                        <option value="15m">15 minutes</option>
                        <option value="1h">1 hour</option>
                        <option value="6h">6 hours</option>
                        <option value="1d">1 day</option>
                    </select>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[400px]">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        No telemetry data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey="time"
                                stroke="#64748b"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#64748b"
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#151c2c',
                                    border: '1px solid #1e293b',
                                    borderRadius: '8px',
                                }}
                                labelStyle={{ color: '#f1f5f9' }}
                                itemStyle={{ color: '#94a3b8' }}
                            />
                            <Legend />
                            {metrics.map((metric, index) => (
                                <Line
                                    key={metric}
                                    type="monotone"
                                    dataKey={metric}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    name={metric}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
