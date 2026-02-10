'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '@/lib/api'

interface DeviceType {
    type: string
    total: number
    online: number
}

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function DeviceTypeChart() {
    const [data, setData] = useState<DeviceType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            try {
                const types = await api.getDevicesByType()
                setData(types as DeviceType[])
            } catch (err) {
                console.error('Failed to load device types:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading) {
        return (
            <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            </div>
        )
    }

    const chartData = data.map((d) => ({
        name: d.type,
        value: d.total,
        online: d.online,
    }))

    return (
        <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#151c2c',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#f1f5f9' }}
                        formatter={(value: number, name: string, props: any) => [
                            `${value} (${props.payload.online} online)`,
                            name,
                        ]}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
                {data.map((item, index) => (
                    <div key={item.type} className="flex items-center text-xs">
                        <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-gray-400 capitalize">{item.type}</span>
                        <span className="ml-auto text-white">{item.total}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
