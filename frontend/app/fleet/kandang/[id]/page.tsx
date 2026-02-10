'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Thermometer,
    Droplets,
    Wind,
    Activity,
    Fan,
    Power,
    Clock,
    Target,
    AlertTriangle,
    BarChart3,
    X,
    TrendingUp,
    Bird,
    Users,
    Scale,
    Calendar,
    Layers,
    Wifi,
    WifiOff,
    Bell,
    Loader2,
    FileText,
    Filter,
    Search,
    Fuel
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area
} from 'recharts'
import { iotApi, Kandang, Flock } from '@/lib/iot-api'
import authService from '@/lib/auth'
import { useMqtt } from '@/lib/mqtt'
import { getProductConfigByType, ProductConfig } from '@/lib/productConfig'
import DieselMonitor from '@/components/device/DieselMonitor'
import DieselControlPanel from '@/components/device/DieselControl'

// Dummy kandang data
const DUMMY_KANDANG = {
    id: 'kandang-001',
    name: 'Kandang A1',
    region: 'Bogor',
    address: 'Jl. Raya Bogor No. 123',
    latitude: -6.5955,
    longitude: 106.7889
}

// Dummy chicken status data
const CHICKEN_STATUS = {
    age: 25, // hari
    population: {
        initial: 15000,
        current: 14850,
        mortality: 150
    },
    weight: {
        current: 1250, // gram
        target: 1300, // target bobot di umur ini
        fcr: 1.45
    }
}

// Generate dummy daily weight chart data
function generateDailyWeightData() {
    const data = []
    for (let day = 1; day <= CHICKEN_STATUS.age; day++) {
        // Growth curve simulation
        const baseWeight = 42 + (day * day * 1.8) + (day * 15)
        data.push({
            day: `Hari ${day}`,
            bobot: Math.round(baseWeight + (Math.random() - 0.5) * 30),
            target: Math.round(40 + (day * day * 1.9) + (day * 16))
        })
    }
    return data
}

// Dynamic sensor data based on product config
function generateSensors(config: ProductConfig | null) {
    const tempSensorCount = config?.tempSensors ?? 3
    const hasHumi = config?.humiSensor ?? true
    const hasNh3 = config?.nh3Sensor ?? false
    const hasWind = config?.windSensor ?? false

    return {
        temperature: Array.from({ length: tempSensorCount }, (_, i) => ({
            id: i + 1,
            name: `Suhu Zona ${i + 1}`,
            value: 28 + Math.random() * 2,
            unit: '°C'
        })),
        humidity: hasHumi ? Array.from({ length: tempSensorCount }, (_, i) => ({
            id: i + 1,
            name: `Kelembaban Zona ${i + 1}`,
            value: 60 + Math.floor(Math.random() * 10),
            unit: '%'
        })) : [],
        hsi: Array.from({ length: tempSensorCount }, (_, i) => ({
            id: i + 1,
            name: `HSI Zona ${i + 1}`,
            value: 140 + Math.floor(Math.random() * 20),
            status: 'normal'
        })),
        ammonia: hasNh3 ? { value: 10 + Math.random() * 5, unit: 'ppm', status: 'normal' } : null,
        windSpeed: hasWind ? { value: 1.5 + Math.random(), unit: 'm/s' } : null
    }
}

// Default sensors for initial render
const INITIAL_SENSORS = {
    temperature: [
        { id: 1, name: 'Suhu Zona 1', value: 28.5, unit: '°C' },
        { id: 2, name: 'Suhu Zona 2', value: 29.2, unit: '°C' },
        { id: 3, name: 'Suhu Zona 3', value: 27.8, unit: '°C' },
    ],
    humidity: [
        { id: 1, name: 'Kelembaban Zona 1', value: 65, unit: '%' },
        { id: 2, name: 'Kelembaban Zona 2', value: 68, unit: '%' },
        { id: 3, name: 'Kelembaban Zona 3', value: 62, unit: '%' },
    ],
    hsi: [
        { id: 1, name: 'HSI Zona 1', value: 145, status: 'normal' },
        { id: 2, name: 'HSI Zona 2', value: 152, status: 'warning' },
        { id: 3, name: 'HSI Zona 3', value: 138, status: 'normal' },
    ],
    ammonia: { value: 12.5, unit: 'ppm', status: 'normal' } as { value: number, unit: string, status: string } | null,
    windSpeed: { value: 2.3, unit: 'm/s' } as { value: number, unit: string } | null
}

// Generate dummy chart data
function generateChartData(hours: number = 24, baseValue: number, variance: number) {
    const now = new Date()
    const data = []
    for (let i = hours; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000)
        data.push({
            time: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            zona1: +(baseValue + (Math.random() - 0.5) * variance).toFixed(1),
            zona2: +(baseValue + 0.5 + (Math.random() - 0.5) * variance).toFixed(1),
            zona3: +(baseValue - 0.3 + (Math.random() - 0.5) * variance).toFixed(1),
        })
    }
    return data
}

// Dynamic fan states based on product config
function generateFans(config: ProductConfig | null) {
    const fanCount = config?.fans ?? 8
    return Array.from({ length: fanCount }, (_, i) => ({
        id: i + 1,
        name: `Fan ${i + 1}`,
        isOn: i < Math.floor(fanCount / 2),
        intermittent: {
            enabled: false,
            onTime: 30,
            offTime: 30
        },
        target: {
            enabled: false,
            temperature: 28,
            tolerance: 2
        }
    }))
}

// Initial fan states (fallback)
const INITIAL_FANS = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Fan ${i + 1}`,
    isOn: i < 4,
    intermittent: {
        enabled: false,
        onTime: 30,
        offTime: 30
    },
    target: {
        enabled: false,
        temperature: 28,
        tolerance: 2
    }
}))

// Chart Modal Component
interface ChartModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    icon: React.ReactNode
    chartType: 'temperature' | 'humidity' | 'hsi' | 'ammonia' | 'windSpeed' | 'weight'
}

function ChartModal({ isOpen, onClose, title, icon, chartType }: ChartModalProps) {
    const [chartData, setChartData] = useState<any[]>([])
    const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h')

    useEffect(() => {
        if (isOpen) {
            // Special handling for weight chart (daily data)
            if (chartType === 'weight') {
                setChartData(generateDailyWeightData())
                return
            }

            // Generate data based on type
            let hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168
            let baseValue = 0
            let variance = 0

            switch (chartType) {
                case 'temperature':
                    baseValue = 28
                    variance = 4
                    break
                case 'humidity':
                    baseValue = 65
                    variance = 15
                    break
                case 'hsi':
                    baseValue = 145
                    variance = 20
                    break
                case 'ammonia':
                    baseValue = 15
                    variance = 8
                    break
                case 'windSpeed':
                    baseValue = 2.5
                    variance = 1.5
                    break
            }

            setChartData(generateChartData(hours, baseValue, variance))
        }
    }, [isOpen, chartType, timeRange])

    if (!isOpen) return null

    const getYAxisDomain = () => {
        switch (chartType) {
            case 'temperature': return [20, 40]
            case 'humidity': return [40, 100]
            case 'hsi': return [100, 180]
            case 'ammonia': return [0, 50]
            case 'windSpeed': return [0, 5]
            case 'weight': return [0, 1500]
            default: return ['auto', 'auto']
        }
    }

    const getUnit = () => {
        switch (chartType) {
            case 'temperature': return '°C'
            case 'humidity': return '%'
            case 'hsi': return ''
            case 'ammonia': return 'ppm'
            case 'windSpeed': return 'm/s'
            case 'weight': return 'g'
            default: return ''
        }
    }

    const getColors = () => {
        switch (chartType) {
            case 'temperature': return { zona1: '#f97316', zona2: '#fb923c', zona3: '#fdba74' }
            case 'humidity': return { zona1: '#3b82f6', zona2: '#60a5fa', zona3: '#93c5fd' }
            case 'hsi': return { zona1: '#a855f7', zona2: '#c084fc', zona3: '#d8b4fe' }
            case 'ammonia': return { zona1: '#eab308', zona2: '#eab308', zona3: '#eab308' }
            case 'windSpeed': return { zona1: '#06b6d4', zona2: '#06b6d4', zona3: '#06b6d4' }
            case 'weight': return { zona1: '#22c55e', zona2: '#9ca3af', zona3: '#22c55e' }
            default: return { zona1: '#3b82f6', zona2: '#60a5fa', zona3: '#93c5fd' }
        }
    }

    const colors = getColors()
    const showMultiZone = ['temperature', 'humidity', 'hsi'].includes(chartType)
    const isWeightChart = chartType === 'weight'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-dark-300 border border-dark-100 rounded-xl w-full max-w-4xl p-6 shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        {icon}
                        <span className="ml-2">Grafik {title}</span>
                    </h2>
                    <div className="flex items-center space-x-4">
                        {/* Time Range Selector - hidden for weight chart */}
                        {!isWeightChart && (
                            <div className="flex items-center space-x-1 bg-dark-400 rounded-lg p-1">
                                {(['1h', '6h', '24h', '7d'] as const).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === range
                                            ? 'bg-primary-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        )}
                        {isWeightChart && (
                            <span className="text-sm text-gray-400">Data Harian (Hari 1 - {CHICKEN_STATUS.age})</span>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorZona1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.zona1} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.zona1} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorZona2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.zona2} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.zona2} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorZona3" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.zona3} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.zona3} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey={isWeightChart ? 'day' : 'time'}
                                stroke="#64748b"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis
                                domain={getYAxisDomain() as [number, number]}
                                stroke="#64748b"
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                unit={getUnit()}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#151c2c',
                                    border: '1px solid #1e293b',
                                    borderRadius: '8px',
                                    color: '#f1f5f9'
                                }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Legend />
                            {showMultiZone ? (
                                <>
                                    <Area
                                        type="monotone"
                                        dataKey="zona1"
                                        name="Zona 1"
                                        stroke={colors.zona1}
                                        fillOpacity={1}
                                        fill="url(#colorZona1)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="zona2"
                                        name="Zona 2"
                                        stroke={colors.zona2}
                                        fillOpacity={1}
                                        fill="url(#colorZona2)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="zona3"
                                        name="Zona 3"
                                        stroke={colors.zona3}
                                        fillOpacity={1}
                                        fill="url(#colorZona3)"
                                        strokeWidth={2}
                                    />
                                </>
                            ) : isWeightChart ? (
                                <>
                                    <Area
                                        type="monotone"
                                        dataKey="bobot"
                                        name="Bobot Aktual"
                                        stroke={colors.zona1}
                                        fillOpacity={1}
                                        fill="url(#colorZona1)"
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="target"
                                        name="Target"
                                        stroke={colors.zona2}
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </>
                            ) : (
                                <Area
                                    type="monotone"
                                    dataKey="zona1"
                                    name={title}
                                    stroke={colors.zona1}
                                    fillOpacity={1}
                                    fill="url(#colorZona1)"
                                    strokeWidth={2}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats Summary */}
                <div className="mt-4 grid grid-cols-4 gap-4">
                    <div className="bg-dark-400 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">{isWeightChart ? 'Hari 1' : 'Min'}</p>
                        <p className="text-lg font-bold text-green-400">
                            {chartData.length > 0 ? (isWeightChart ? chartData[0].bobot : Math.min(...chartData.map(d => d.zona1)).toFixed(1)) : '-'}{getUnit()}
                        </p>
                    </div>
                    <div className="bg-dark-400 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">{isWeightChart ? 'Terakhir' : 'Max'}</p>
                        <p className="text-lg font-bold text-orange-400">
                            {chartData.length > 0 ? (isWeightChart ? chartData[chartData.length - 1].bobot : Math.max(...chartData.map(d => d.zona1)).toFixed(1)) : '-'}{getUnit()}
                        </p>
                    </div>
                    <div className="bg-dark-400 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">{isWeightChart ? 'Target' : 'Rata-rata'}</p>
                        <p className="text-lg font-bold text-blue-400">
                            {chartData.length > 0 ? (isWeightChart ? chartData[chartData.length - 1].target : (chartData.reduce((a, b) => a + b.zona1, 0) / chartData.length).toFixed(1)) : '-'}{getUnit()}
                        </p>
                    </div>
                    <div className="bg-dark-400 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">{isWeightChart ? 'Selisih' : 'Terakhir'}</p>
                        <p className={`text-lg font-bold ${isWeightChart ? (chartData.length > 0 && chartData[chartData.length - 1].bobot >= chartData[chartData.length - 1].target ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                            {chartData.length > 0 ? (isWeightChart ? (chartData[chartData.length - 1].bobot - chartData[chartData.length - 1].target > 0 ? '+' : '') + (chartData[chartData.length - 1].bobot - chartData[chartData.length - 1].target) : chartData[chartData.length - 1].zona1) : '-'}{getUnit()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function KandangDetailPage() {
    const params = useParams()
    const router = useRouter()
    const kandangId = params.id as string

    // IoT API data
    const [kandang, setKandang] = useState<Kandang | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Floor/Flock selection (for multi-floor kandang)
    const [selectedFloorIndex, setSelectedFloorIndex] = useState(0)
    const [viewMode, setViewMode] = useState<'floor' | 'diesel'>('floor')
    const selectedFlock = viewMode === 'floor' ? (kandang?.flocks?.[selectedFloorIndex] || null) : null
    const floorCount = kandang?.floor_count || kandang?.flocks?.length || 1

    // Local state for sliders to prevent UI jumping
    const [localInverterSpeed, setLocalInverterSpeed] = useState<number | null>(null)

    // Diesel units state (4 fixed units per kandang - building utility)
    const [dieselUnits, setDieselUnits] = useState([
        { id: 1, name: 'Diesel 1', isOn: false, rpm: 0, odoH: 1245, fuelLevel: 78, batteryVolt: 12.8, coolantOk: true, oilPressOk: true },
        { id: 2, name: 'Diesel 2', isOn: true, rpm: 1800, odoH: 980, fuelLevel: 65, batteryVolt: 13.2, coolantOk: true, oilPressOk: true },
        { id: 3, name: 'Diesel 3', isOn: false, rpm: 0, odoH: 2100, fuelLevel: 45, batteryVolt: 12.6, coolantOk: true, oilPressOk: false },
        { id: 4, name: 'Diesel 4', isOn: false, rpm: 0, odoH: 560, fuelLevel: 92, batteryVolt: 12.9, coolantOk: true, oilPressOk: true },
    ])

    // MQTT real-time data - use partNumber from flock
    const {
        isConnected: mqttConnected,
        sensorData,
        deviceStates,
        alarmState,
        inverterState,
        calibrationState,
        syncState,
        controlDevice,
        setIntermittent,
        setTargetTemp,
        setAlarmEnable,
        setAlarmValue,
        setInverter,
        setCalibration,
        requestSync
    } = useMqtt(selectedFlock?.partNumber, selectedFloorIndex, floorCount)

    const [sensors, setSensors] = useState(INITIAL_SENSORS)
    const [fans, setFans] = useState(INITIAL_FANS)
    const [activeTab, setActiveTab] = useState<'control' | 'intermittent' | 'target' | 'alarm' | 'log'>('control')
    const [mqttStatus, setMqttStatus] = useState<'connected' | 'disconnected'>('disconnected')

    // Toast notification state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Show toast notification
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000) // Auto-hide after 3 seconds
    }

    // Loading state for devices
    const [loadingDevices, setLoadingDevices] = useState<Record<string, boolean>>({})

    // Log Activity state
    const [logData, setLogData] = useState<any[]>([])
    const [logLoading, setLogLoading] = useState(false)
    const [logDateFilter, setLogDateFilter] = useState<string>('')
    const [logCategoryFilter, setLogCategoryFilter] = useState<'all' | 'alarm' | 'setting' | 'alat'>('all')

    // Chart modal state
    const [chartModal, setChartModal] = useState<{
        isOpen: boolean
        type: 'temperature' | 'humidity' | 'hsi' | 'ammonia' | 'windSpeed' | 'weight'
        title: string
    }>({ isOpen: false, type: 'temperature', title: '' })

    // Product configuration based on device type
    const productConfig = selectedFlock
        ? getProductConfigByType(selectedFlock.type)
        : null

    // Check if any flock in this kandang is a diesel type (Ci-Touch624)
    const hasDiesel = kandang?.flocks?.some(flock => {
        const config = getProductConfigByType(flock.type)
        return config?.isDiesel
    }) ?? false

    // Update sensors and fans when productConfig changes
    useEffect(() => {
        if (productConfig) {
            setSensors(generateSensors(productConfig))
            setFans(generateFans(productConfig))
        }
    }, [productConfig?.name])

    // Helper: Get floor name
    function getFloorName(index: number, totalFloors: number): string {
        if (totalFloors === 1) return 'Dashboard'
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

    // Helper: Get kandang type
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

    // Load kandang data from IoT API
    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push('/login')
            return
        }
        loadKandangData()
    }, [kandangId, router])

    async function loadKandangData() {
        try {
            setLoading(true)
            setError(null)
            const response = await iotApi.getKandangList()
            // Find the kandang by ID
            const found = response.data?.find(k => k._id === kandangId || k.coop_id === kandangId)
            if (found) {
                setKandang(found)
                // Update sensors from flock data if available
                if (found.flocks && found.flocks.length > 0) {
                    updateSensorsFromFlock(found.flocks[0])
                }
            } else {
                setError('Kandang tidak ditemukan')
            }
        } catch (err: any) {
            console.error('Failed to load kandang:', err)
            setError(err.message || 'Gagal memuat data kandang')
        } finally {
            setLoading(false)
        }
    }

    // Update sensors when flock changes
    useEffect(() => {
        if (selectedFlock) {
            updateSensorsFromFlock(selectedFlock)
        }
    }, [selectedFloorIndex, kandang])

    function updateSensorsFromFlock(flock: Flock) {
        // Update sensor values from flock data
        const temp = flock.actualTemperature ? flock.actualTemperature / 10 : 28
        const hum = flock.humidity ? flock.humidity / 10 : 70

        setSensors(prev => ({
            ...prev,
            temperature: prev.temperature.map((s, i) => ({
                ...s,
                value: +(temp + (Math.random() - 0.5) * 2).toFixed(1)
            })),
            humidity: prev.humidity.map((s, i) => ({
                ...s,
                value: Math.round(hum + (Math.random() - 0.5) * 5)
            })),
            hsi: prev.hsi.map((s, i) => ({
                ...s,
                value: flock.HSI || 140,
                status: flock.HSI && flock.HSI > 160 ? 'danger' : flock.HSI && flock.HSI > 150 ? 'warning' : 'normal'
            })),
            ammonia: prev.ammonia ? {
                value: flock.amonia || 12,
                unit: 'ppm',
                status: (flock.amonia || 12) < 20 ? 'normal' : (flock.amonia || 12) < 35 ? 'warning' : 'danger'
            } : null,
            windSpeed: prev.windSpeed
        }))

        // Update MQTT status based on connection
        setMqttStatus(flock.connected ? 'connected' : 'disconnected')
    }

    // Update MQTT status from hook
    useEffect(() => {
        setMqttStatus(mqttConnected ? 'connected' : 'disconnected')
    }, [mqttConnected])

    // Update sensors from MQTT real-time data
    useEffect(() => {
        if (sensorData.temperature !== undefined || sensorData.humidity !== undefined) {
            setSensors(prev => ({
                ...prev,
                temperature: sensorData.temperature !== undefined
                    ? prev.temperature.map(s => ({ ...s, value: sensorData.temperature! }))
                    : prev.temperature,
                humidity: sensorData.humidity !== undefined
                    ? prev.humidity.map(s => ({ ...s, value: sensorData.humidity! }))
                    : prev.humidity
            }))
        }
    }, [sensorData])

    // Sync fan states from MQTT deviceStates
    useEffect(() => {
        if (Object.keys(deviceStates).length > 0) {
            console.log('DEBUG: deviceStates received:', deviceStates)
            setFans(prev => prev.map(fan => {
                const deviceKey = `B${fan.id}`
                const state = deviceStates[deviceKey]
                if (state) {
                    console.log(`DEBUG: Fan ${fan.id} (${deviceKey}) state:`, {
                        status: state.status,
                        intermittentEnabled: state.intermittent?.enabled,
                        intermittentOnDuration: state.intermittent?.onDuration,
                        intermittentOffDuration: state.intermittent?.offDuration,
                        targetEnabled: state.target?.enabled,
                        targetValue: state.target?.value,
                        targetTolerance: state.target?.tolerance
                    })
                    return {
                        ...fan,
                        isOn: state.status === 1,
                        intermittent: {
                            ...fan.intermittent,
                            enabled: state.intermittent?.enabled ?? fan.intermittent.enabled,
                            onTime: state.intermittent?.onDuration ?? fan.intermittent.onTime,
                            offTime: state.intermittent?.offDuration ?? fan.intermittent.offTime,
                        },
                        target: {
                            ...fan.target,
                            enabled: state.target?.enabled ?? fan.target.enabled,
                            temperature: state.target?.value ?? fan.target.temperature,
                            tolerance: state.target?.tolerance ?? fan.target.tolerance,
                        }
                    }
                }
                return fan
            }))
        }
    }, [deviceStates])

    // Simulate sensor updates
    useEffect(() => {
        const interval = setInterval(() => {
            setSensors(prev => ({
                ...prev,
                temperature: prev.temperature.map(s => ({
                    ...s,
                    value: +(s.value + (Math.random() - 0.5) * 0.5).toFixed(1)
                })),
                humidity: prev.humidity.map(s => ({
                    ...s,
                    value: Math.round(s.value + (Math.random() - 0.5) * 2)
                })),
                ammonia: prev.ammonia ? {
                    value: +(prev.ammonia.value + (Math.random() - 0.5) * 0.3).toFixed(1),
                    unit: 'ppm',
                    status: prev.ammonia.status
                } : null,
                windSpeed: prev.windSpeed ? {
                    value: +(prev.windSpeed.value + (Math.random() - 0.5) * 0.2).toFixed(1),
                    unit: 'm/s'
                } : null
            }))
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    // Fetch log activity when tab is active or filters change
    useEffect(() => {
        if (activeTab === 'log' && selectedFlock) {
            fetchLogActivity()
        }
    }, [activeTab, selectedFlock, logDateFilter, logCategoryFilter])

    async function fetchLogActivity() {
        if (!selectedFlock) return
        setLogLoading(true)
        try {
            // Map category filter to API type parameter
            const typeParam = logCategoryFilter === 'all' ? '' : logCategoryFilter

            const response = await iotApi.getLogActivity(selectedFlock._id, {
                limit: 50,
                lang: 'id',
                startDate: logDateFilter || '',
                endDate: logDateFilter || '',
                type: typeParam
            })

            // Flatten all logs from grouped data
            const allLogs: any[] = []
            if (response.data && Array.isArray(response.data)) {
                response.data.forEach((group: any) => {
                    if (group.logs && Array.isArray(group.logs)) {
                        allLogs.push(...group.logs)
                    }
                })
            }
            setLogData(allLogs)
        } catch (error) {
            console.error('Failed to fetch log activity:', error)
            showToast('Gagal memuat log aktivitas', 'error')
        } finally {
            setLogLoading(false)
        }
    }

    // Filter log data
    function getFilteredLogs() {
        return logData.filter(log => {
            // Date filter
            if (logDateFilter) {
                const logDate = new Date(log.time).toISOString().split('T')[0]
                if (logDate !== logDateFilter) return false
            }
            // Category filter
            if (logCategoryFilter !== 'all') {
                if (log.type?.toLowerCase() !== logCategoryFilter) return false
            }
            return true
        })
    }

    // Alert dialog state for blocked fan control
    const [alertDialog, setAlertDialog] = useState<{
        isOpen: boolean
        fanName: string
        mode: 'intermittent' | 'target' | 'both' | null
    }>({ isOpen: false, fanName: '', mode: null })

    // Fan control handlers
    function toggleFan(fanId: number) {
        const fan = fans.find(f => f.id === fanId)
        if (!fan) return

        // Check if intermittent or target is enabled
        if (fan.intermittent.enabled && fan.target.enabled) {
            setAlertDialog({ isOpen: true, fanName: fan.name, mode: 'both' })
            return
        }
        if (fan.intermittent.enabled) {
            setAlertDialog({ isOpen: true, fanName: fan.name, mode: 'intermittent' })
            return
        }
        if (fan.target.enabled) {
            setAlertDialog({ isOpen: true, fanName: fan.name, mode: 'target' })
            return
        }

        const newState = !fan.isOn
        // Send MQTT command: cmd/{partNumber}/{Lantai}/X/B{1-5}
        const deviceKey = `B${fanId}` // B1, B2, B3, B4, B5

        setLoadingDevices(prev => ({ ...prev, [deviceKey]: true }))

        controlDevice(deviceKey, newState ? 1 : 0,
            () => {
                // Success callback
                showToast(`${fan.name} berhasil ${newState ? 'dinyalakan' : 'dimatikan'}`, 'success')
                // Update local state on success
                setFans(prev => prev.map(f => f.id === fanId ? { ...f, isOn: newState } : f))
                setLoadingDevices(prev => ({ ...prev, [deviceKey]: false }))
            },
            () => {
                // Failure callback
                showToast(`Gagal mengontrol ${fan.name}. Timeout atau koneksi bermasalah.`, 'error')
                setLoadingDevices(prev => ({ ...prev, [deviceKey]: false }))
            }
        )
    }

    function toggleAllFans(state: boolean) {
        // Check if any fan has intermittent or target enabled
        const blockedFans = fans.filter(f => f.intermittent.enabled || f.target.enabled)
        if (blockedFans.length > 0) {
            setAlertDialog({
                isOpen: true,
                fanName: blockedFans.map(f => f.name).join(', '),
                mode: 'both'
            })
            return
        }

        fans.forEach((fan, index) => {
            const deviceKey = `B${fan.id}`
            const fanName = fan.name

            setLoadingDevices(prev => ({ ...prev, [deviceKey]: true }))

            controlDevice(deviceKey, state ? 1 : 0,
                () => {
                    // Success callback
                    setFans(prev => prev.map(f => f.id === fan.id ? { ...f, isOn: state } : f))
                    setLoadingDevices(prev => ({ ...prev, [deviceKey]: false }))
                    if (index === fans.length - 1) {
                        showToast(`Semua fan berhasil ${state ? 'dinyalakan' : 'dimatikan'}`, 'success')
                    }
                },
                () => {
                    // Failure callback
                    showToast(`Gagal mengontrol ${fanName}`, 'error')
                    setLoadingDevices(prev => ({ ...prev, [deviceKey]: false }))
                }
            )
        })
    }

    function updateIntermittent(fanId: number, field: string, value: any) {
        const deviceKey = `B${fanId}`

        setFans(prev => prev.map(fan => {
            if (fan.id === fanId) {
                const updated = { ...fan, intermittent: { ...fan.intermittent, [field]: value } }

                // Send MQTT commands based on field
                if (field === 'enabled') {
                    setIntermittent(deviceKey, value)
                } else if (field === 'onDuration') {
                    setIntermittent(deviceKey, fan.intermittent.enabled, value, undefined)
                } else if (field === 'offDuration') {
                    setIntermittent(deviceKey, fan.intermittent.enabled, undefined, value)
                }

                return updated
            }
            return fan
        }))
    }

    function updateTarget(fanId: number, field: string, value: any) {
        const deviceKey = `B${fanId}`

        setFans(prev => prev.map(fan => {
            if (fan.id === fanId) {
                const updated = { ...fan, target: { ...fan.target, [field]: value } }

                // Send MQTT commands based on field
                if (field === 'enabled') {
                    setTargetTemp(deviceKey, value)
                } else if (field === 'temperature') {
                    setTargetTemp(deviceKey, fan.target.enabled, value, undefined)
                } else if (field === 'tolerance') {
                    setTargetTemp(deviceKey, fan.target.enabled, undefined, value)
                }

                return updated
            }
            return fan
        }))
    }

    function getHSIColor(value: number) {
        if (value < 140) return 'text-green-400'
        if (value < 155) return 'text-yellow-400'
        return 'text-red-400'
    }

    function getHSIStatus(value: number) {
        if (value < 140) return 'Normal'
        if (value < 155) return 'Warning'
        return 'Danger'
    }

    function openChartModal(type: typeof chartModal.type, title: string) {
        setChartModal({ isOpen: true, type, title })
    }

    // Show loading while kandang data is being fetched
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
        )
    }

    // Show error state
    if (error || !kandang) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertTriangle className="w-12 h-12 text-red-400" />
                <p className="text-gray-400">{error || 'Kandang tidak ditemukan'}</p>
                <Link href="/fleet/kandang" className="btn-primary">
                    Kembali ke List
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                    <Link href="/fleet/kandang" className="p-2 text-gray-400 hover:text-white mt-1">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{kandang.kode}</h1>
                        <p className="text-gray-400">{kandang.alamat}, {kandang.regency}</p>
                        <div className="flex items-center mt-2 space-x-3 flex-wrap gap-2">
                            <span className="badge bg-primary-500/20 text-primary-400">
                                {getKandangType(kandang.tipe)}
                            </span>
                            <span className="badge bg-blue-500/20 text-blue-400">
                                {kandang.jenisBudidaya}
                            </span>
                            <span className={`badge ${mqttStatus === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                                {mqttStatus === 'connected' ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                                {mqttStatus}
                            </span>
                            <span className="badge bg-gray-500/20 text-gray-400">
                                <Users className="w-3 h-3 mr-1" />
                                {(() => {
                                    const totalCurrent = kandang.flock?.reduce((sum, f) => {
                                        const pop = f.populasi || 0
                                        const mort = f.mortality || 0
                                        return sum + (pop - mort)
                                    }, 0) || kandang.populasi
                                    return totalCurrent.toLocaleString()
                                })()} ekor
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floor/Diesel Tabs */}
            <div className="card">
                <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-primary-400" />
                    <span className="text-sm text-gray-400 mr-4">Pilih View:</span>
                    <div className="flex space-x-2">
                        {/* Floor tabs */}
                        {Array.from({ length: floorCount }, (_, i) => {
                            const flock = kandang.flocks?.[i]
                            const isOnline = flock?.connected || false
                            const isActive = viewMode === 'floor' && selectedFloorIndex === i
                            return (
                                <button
                                    key={`floor-${i}`}
                                    onClick={() => {
                                        setViewMode('floor')
                                        setSelectedFloorIndex(i)
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${isActive
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
                                        }`}
                                >
                                    {isOnline ? (
                                        <Wifi className="w-3 h-3 text-green-400" />
                                    ) : (
                                        <WifiOff className="w-3 h-3 text-gray-500" />
                                    )}
                                    <span>{getFloorName(i, floorCount)}</span>
                                </button>
                            )
                        })}

                        {/* Diesel tab - only show for Ci-Touch624 products */}
                        {hasDiesel && (
                            <button
                                onClick={() => setViewMode('diesel')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${viewMode === 'diesel'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-dark-300 text-gray-400 hover:bg-dark-200'
                                    }`}
                            >
                                <Fuel className="w-4 h-4" />
                                <span>Diesel</span>
                                <span className="text-xs bg-dark-400 px-1.5 py-0.5 rounded">4 Unit</span>
                            </button>
                        )}
                    </div>
                </div>
                {selectedFlock && (
                    <div className="mt-3 pt-3 border-t border-dark-100 flex items-center space-x-4 text-sm flex-wrap gap-y-2">
                        <span className="text-gray-500">Part Number:</span>
                        <span className="text-cyan-400 font-mono bg-dark-400 px-2 py-0.5 rounded">{selectedFlock.partNumber}</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-500">Device:</span>
                        <span className="text-white font-mono">{selectedFlock.name}</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-500">Type:</span>
                        <span className="text-white">{selectedFlock.type}</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-500">Day:</span>
                        <span className="text-white">{selectedFlock.day}</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-500">Populasi:</span>
                        <span className="text-white">
                            {(() => {
                                const flockData = kandang.flock?.[selectedFloorIndex]
                                if (!flockData) return '-'
                                const pop = flockData.populasi || 0
                                const mort = flockData.mortality || 0
                                const current = pop - mort
                                return (
                                    <>
                                        <span className="text-green-400">{current.toLocaleString()}</span>
                                        <span className="text-gray-500 text-xs ml-1">
                                            ({pop.toLocaleString()} - {mort.toLocaleString()})
                                        </span>
                                    </>
                                )
                            })()}
                        </span>
                    </div>
                )}
            </div>

            {/* Floor Content - Only show when viewMode is 'floor' */}
            {viewMode === 'floor' && selectedFlock && (
                <>
                    {/* Chicken Status Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Umur Ayam */}
                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mr-4">
                                        <Calendar className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Umur Ayam</p>
                                        <p className="text-3xl font-bold text-white">{CHICKEN_STATUS.age}</p>
                                        <p className="text-sm text-gray-500">hari</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Total Populasi */}
                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mr-4">
                                        <Bird className="w-6 h-6 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Total Populasi</p>
                                        {(() => {
                                            const flockData = kandang.flock?.[selectedFloorIndex]
                                            const pop = flockData?.populasi || 0
                                            const mort = flockData?.mortality || 0
                                            const current = pop - mort
                                            return (
                                                <>
                                                    <p className="text-3xl font-bold text-white">{current.toLocaleString()}</p>
                                                    <p className="text-sm text-gray-500">
                                                        ekor <span className="text-red-400">(-{mort.toLocaleString()} mortalitas)</span>
                                                    </p>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-dark-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Populasi Awal</span>
                                    <span className="text-gray-400">{CHICKEN_STATUS.population.initial.toLocaleString()} ekor</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-500">Tingkat Kelangsungan</span>
                                    <span className="text-green-400">
                                        {((CHICKEN_STATUS.population.current / CHICKEN_STATUS.population.initial) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bobot Ayam */}
                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mr-4">
                                        <Scale className="w-6 h-6 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Bobot Rata-rata</p>
                                        <p className="text-3xl font-bold text-white">{CHICKEN_STATUS.weight.current.toLocaleString()}</p>
                                        <p className="text-sm text-gray-500">gram</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openChartModal('weight', 'Bobot Ayam')}
                                    className="flex items-center px-3 py-1.5 bg-dark-400 hover:bg-dark-200 text-gray-400 hover:text-white rounded-lg transition-colors text-sm"
                                >
                                    <BarChart3 className="w-4 h-4 mr-1" />
                                    Grafik
                                </button>
                            </div>
                            <div className="mt-3 pt-3 border-t border-dark-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Target Bobot</span>
                                    <span className={CHICKEN_STATUS.weight.current >= CHICKEN_STATUS.weight.target ? 'text-green-400' : 'text-yellow-400'}>
                                        {CHICKEN_STATUS.weight.target.toLocaleString()} gram
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-500">FCR</span>
                                    <span className="text-blue-400">{CHICKEN_STATUS.weight.fcr}</span>
                                </div>
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Progress</span>
                                        <span>{((CHICKEN_STATUS.weight.current / CHICKEN_STATUS.weight.target) * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-dark-400 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${CHICKEN_STATUS.weight.current >= CHICKEN_STATUS.weight.target
                                                ? 'bg-green-500'
                                                : 'bg-orange-500'
                                                }`}
                                            style={{ width: `${Math.min((CHICKEN_STATUS.weight.current / CHICKEN_STATUS.weight.target) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sensor Monitoring */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Temperature & Humidity Grid */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center">
                                    <Thermometer className="w-5 h-5 mr-2 text-orange-400" />
                                    Suhu & Kelembaban
                                </h3>
                                <button
                                    onClick={() => openChartModal('temperature', 'Suhu')}
                                    className="flex items-center px-3 py-1.5 bg-dark-400 hover:bg-dark-200 text-gray-400 hover:text-white rounded-lg transition-colors text-sm"
                                >
                                    <BarChart3 className="w-4 h-4 mr-1" />
                                    Grafik
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {sensors.temperature.map((temp, idx) => (
                                    <div key={temp.id} className="bg-dark-400 rounded-lg p-4 text-center">
                                        <p className="text-xs text-gray-500 mb-1">Zona {idx + 1}</p>
                                        <div className="flex items-center justify-center space-x-2">
                                            <Thermometer className="w-4 h-4 text-orange-400" />
                                            <span className="text-2xl font-bold text-white">{temp.value}</span>
                                            <span className="text-sm text-gray-400">°C</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2 mt-2">
                                            <Droplets className="w-4 h-4 text-blue-400" />
                                            <span className="text-lg font-semibold text-white">{sensors.humidity[idx].value}</span>
                                            <span className="text-sm text-gray-400">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* HSI */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center">
                                    <Activity className="w-5 h-5 mr-2 text-purple-400" />
                                    Heat Stress Index (HSI)
                                </h3>
                                <button
                                    onClick={() => openChartModal('hsi', 'HSI')}
                                    className="flex items-center px-3 py-1.5 bg-dark-400 hover:bg-dark-200 text-gray-400 hover:text-white rounded-lg transition-colors text-sm"
                                >
                                    <BarChart3 className="w-4 h-4 mr-1" />
                                    Grafik
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {sensors.hsi.map((hsi, idx) => (
                                    <div key={hsi.id} className="bg-dark-400 rounded-lg p-4 text-center">
                                        <p className="text-xs text-gray-500 mb-1">Zona {idx + 1}</p>
                                        <span className={`text-3xl font-bold ${getHSIColor(hsi.value)}`}>
                                            {hsi.value}
                                        </span>
                                        <p className={`text-xs mt-1 ${getHSIColor(hsi.value)}`}>
                                            {getHSIStatus(hsi.value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                HSI = Suhu + Kelembaban. Normal &lt; 140, Warning 140-155, Danger &gt; 155
                            </p>
                        </div>

                        {/* Ammonia - Only show if product has NH3 sensor */}
                        {productConfig?.nh3Sensor && sensors.ammonia && (
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                                        Sensor Amonia
                                    </h3>
                                    <button
                                        onClick={() => openChartModal('ammonia', 'Amonia')}
                                        className="flex items-center px-3 py-1.5 bg-dark-400 hover:bg-dark-200 text-gray-400 hover:text-white rounded-lg transition-colors text-sm"
                                    >
                                        <BarChart3 className="w-4 h-4 mr-1" />
                                        Grafik
                                    </button>
                                </div>
                                <div className="flex items-center justify-center py-6">
                                    <div className="text-center">
                                        <span className={`text-5xl font-bold ${sensors.ammonia.value < 20 ? 'text-green-400' :
                                            sensors.ammonia.value < 35 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {sensors.ammonia.value.toFixed(1)}
                                        </span>
                                        <span className="text-xl text-gray-400 ml-2">ppm</span>
                                        <p className={`text-sm mt-2 ${sensors.ammonia.value < 20 ? 'text-green-400' :
                                            sensors.ammonia.value < 35 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {sensors.ammonia.value < 20 ? 'Aman' :
                                                sensors.ammonia.value < 35 ? 'Perhatian' : 'Bahaya'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                    Batas aman: &lt; 20 ppm | Perhatian: 20-35 ppm | Bahaya: &gt; 35 ppm
                                </p>
                            </div>
                        )}

                        {/* Wind Speed - Only show if product has wind sensor */}
                        {productConfig?.windSensor && sensors.windSpeed && (
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center">
                                        <Wind className="w-5 h-5 mr-2 text-cyan-400" />
                                        Kecepatan Angin
                                    </h3>
                                    <button
                                        onClick={() => openChartModal('windSpeed', 'Kecepatan Angin')}
                                        className="flex items-center px-3 py-1.5 bg-dark-400 hover:bg-dark-200 text-gray-400 hover:text-white rounded-lg transition-colors text-sm"
                                    >
                                        <BarChart3 className="w-4 h-4 mr-1" />
                                        Grafik
                                    </button>
                                </div>
                                <div className="flex items-center justify-center py-6">
                                    <div className="text-center">
                                        <span className="text-5xl font-bold text-cyan-400">
                                            {sensors.windSpeed.value.toFixed(1)}
                                        </span>
                                        <span className="text-xl text-gray-400 ml-2">m/s</span>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Rata-rata kecepatan udara dalam kandang
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Diesel monitoring and control now consolidated in Diesel tab - removed from floor view */}

                    {/* Fan Control Section - Only show if product has fans */}
                    {(productConfig?.fans ?? 0) > 0 && (
                        <div className="card">
                            {/* Tabs */}
                            <div className="flex items-center space-x-1 mb-6 border-b border-dark-100 pb-4">
                                <button
                                    onClick={() => setActiveTab('control')}
                                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === 'control'
                                        ? 'bg-primary-600 text-white'
                                        : 'text-gray-400 hover:bg-dark-300'
                                        }`}
                                >
                                    <Power className="w-4 h-4 mr-2" />
                                    Kontrol Fan
                                </button>
                                <button
                                    onClick={() => setActiveTab('intermittent')}
                                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === 'intermittent'
                                        ? 'bg-primary-600 text-white'
                                        : 'text-gray-400 hover:bg-dark-300'
                                        }`}
                                >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Setting Intermittent
                                </button>
                                <button
                                    onClick={() => setActiveTab('target')}
                                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === 'target'
                                        ? 'bg-primary-600 text-white'
                                        : 'text-gray-400 hover:bg-dark-300'
                                        }`}
                                >
                                    <Target className="w-4 h-4 mr-2" />
                                    Setting Target
                                </button>
                                <button
                                    onClick={() => setActiveTab('alarm')}
                                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === 'alarm'
                                        ? 'bg-primary-600 text-white'
                                        : 'text-gray-400 hover:bg-dark-300'
                                        }`}
                                >
                                    <Bell className="w-4 h-4 mr-2" />
                                    Alarm & Settings
                                </button>
                                <button
                                    onClick={() => setActiveTab('log')}
                                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === 'log'
                                        ? 'bg-primary-600 text-white'
                                        : 'text-gray-400 hover:bg-dark-300'
                                        }`}
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Log Activity
                                </button>
                            </div>

                            {/* Log Activity Tab */}
                            {activeTab === 'log' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-400 p-4 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <Filter className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium text-white">Filter Log</span>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            {/* Date Filter */}
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">Tanggal:</span>
                                                <input
                                                    type="date"
                                                    value={logDateFilter}
                                                    onChange={(e) => setLogDateFilter(e.target.value)}
                                                    className="input bg-dark-300 border-dark-200 text-white text-sm py-1"
                                                />
                                                {logDateFilter && (
                                                    <button
                                                        onClick={() => setLogDateFilter('')}
                                                        className="text-gray-500 hover:text-white"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Category Filter */}
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">Kategori:</span>
                                                <select
                                                    value={logCategoryFilter}
                                                    onChange={(e) => setLogCategoryFilter(e.target.value as any)}
                                                    className="input bg-dark-300 border-dark-200 text-white text-sm py-1"
                                                >
                                                    <option value="all">Semua</option>
                                                    <option value="alat">Alat</option>
                                                    <option value="setting">Setting</option>
                                                    <option value="alarm">Alarm</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {logLoading ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                                        </div>
                                    ) : getFilteredLogs().length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>Tidak ada log aktivitas ditemukan</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {getFilteredLogs().map((log, index) => (
                                                <div key={log._id || index} className="bg-dark-400 p-4 rounded-lg border border-dark-300 hover:border-dark-100 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`px-2 py-0.5 text-xs rounded-full border ${log.type === 'alat' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                log.type === 'alarm' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                                }`}>
                                                                {log.type?.toUpperCase() || 'SYSTEM'}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(log.time).toLocaleString('id-ID', {
                                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">{log.access}</span>
                                                    </div>
                                                    <h4 className="text-white font-medium mb-1">{log.deskripsi}</h4>
                                                    <p className="text-sm text-gray-400 mb-2">{log.status}</p>
                                                    {log.nilai && (
                                                        <div className="bg-dark-300 p-2 rounded text-xs text-gray-300 font-mono">
                                                            {log.nilai}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Control Tab */}
                            {activeTab === 'control' && (
                                <div>
                                    {/* Inverter Speed Control */}
                                    <div className="bg-dark-400 rounded-lg p-6 mb-6">
                                        <h4 className="text-md font-semibold text-white mb-4 flex items-center">
                                            <Activity className="w-4 h-4 mr-2 text-cyan-400" />
                                            Inverter Speed Control
                                        </h4>
                                        <div className="bg-dark-300 rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-white font-medium">Kecepatan</span>
                                                {loadingDevices['INV'] ? (
                                                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                                                ) : (
                                                    <span className="text-3xl font-bold text-cyan-400">
                                                        {inverterState.speed}%
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={localInverterSpeed ?? inverterState.speed}
                                                onChange={(e) => setLocalInverterSpeed(parseInt(e.target.value))}
                                                onMouseUp={() => {
                                                    if (localInverterSpeed !== null) {
                                                        setLoadingDevices(prev => ({ ...prev, INV: true }))
                                                        setInverter(
                                                            localInverterSpeed,
                                                            () => {
                                                                setLoadingDevices(prev => ({ ...prev, INV: false }))
                                                                showToast('Inverter updated', 'success')
                                                            },
                                                            () => {
                                                                setLoadingDevices(prev => ({ ...prev, INV: false }))
                                                                showToast('Failed to update inverter', 'error')
                                                                setLocalInverterSpeed(null)
                                                            }
                                                        )
                                                        setLocalInverterSpeed(null)
                                                    }
                                                }}
                                                onTouchEnd={() => {
                                                    if (localInverterSpeed !== null) {
                                                        setLoadingDevices(prev => ({ ...prev, INV: true }))
                                                        setInverter(
                                                            localInverterSpeed,
                                                            () => {
                                                                setLoadingDevices(prev => ({ ...prev, INV: false }))
                                                                showToast('Inverter updated', 'success')
                                                            },
                                                            () => {
                                                                setLoadingDevices(prev => ({ ...prev, INV: false }))
                                                                showToast('Failed to update inverter', 'error')
                                                                setLocalInverterSpeed(null)
                                                            }
                                                        )
                                                        setLocalInverterSpeed(null)
                                                    }
                                                }}
                                                className="w-full h-3 bg-dark-400 rounded-lg appearance-none cursor-pointer slider-thumb"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                                <span>0%</span>
                                                <span>25%</span>
                                                <span>50%</span>
                                                <span>75%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Heater and Cooler Controls */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {/* Heater Control - Only if product has heater */}
                                        {productConfig?.heater && (
                                            <div
                                                className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${deviceStates.H?.status === 1
                                                    ? 'bg-orange-500/10 border-orange-500/50'
                                                    : 'bg-dark-400 border-dark-100'
                                                    }`}
                                                onClick={() => {
                                                    const newState = deviceStates.H?.status === 1 ? 0 : 1
                                                    setLoadingDevices(prev => ({ ...prev, H: true }))
                                                    controlDevice('H', newState,
                                                        () => {
                                                            showToast(`Heater berhasil ${newState === 1 ? 'dinyalakan' : 'dimatikan'}`, 'success')
                                                            setLoadingDevices(prev => ({ ...prev, H: false }))
                                                        },
                                                        () => {
                                                            showToast('Gagal mengontrol Heater', 'error')
                                                            setLoadingDevices(prev => ({ ...prev, H: false }))
                                                        }
                                                    )
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center">
                                                        {loadingDevices.H ? (
                                                            <Loader2 className="w-8 h-8 mr-3 text-orange-400 animate-spin" />
                                                        ) : (
                                                            <Thermometer className={`w-8 h-8 mr-3 ${deviceStates.H?.status === 1 ? 'text-orange-400' : 'text-gray-500'}`} />
                                                        )}
                                                        <div>
                                                            <span className="font-semibold text-white text-lg">Heater</span>
                                                            <p className="text-xs text-gray-400">Pemanas Kandang</p>
                                                        </div>
                                                    </div>
                                                    <div className={`text-2xl font-bold ${deviceStates.H?.status === 1 ? 'text-orange-400' : 'text-gray-500'}`}>
                                                        {loadingDevices.H ? '...' : (deviceStates.H?.status === 1 ? 'ON' : 'OFF')}
                                                    </div>
                                                </div>
                                                {deviceStates.H?.intermittent?.enabled && (
                                                    <span className="badge badge-info text-xs">Intermittent</span>
                                                )}
                                                {deviceStates.H?.target?.enabled && (
                                                    <span className="badge badge-warning text-xs ml-1">Target</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Cooler Control - Only if product has cooler */}
                                        {productConfig?.cooler && (
                                            <div
                                                className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${deviceStates.C?.status === 1
                                                    ? 'bg-blue-500/10 border-blue-500/50'
                                                    : 'bg-dark-400 border-dark-100'
                                                    }`}
                                                onClick={() => {
                                                    const newState = deviceStates.C?.status === 1 ? 0 : 1
                                                    setLoadingDevices(prev => ({ ...prev, C: true }))
                                                    controlDevice('C', newState,
                                                        () => {
                                                            showToast(`Cooler berhasil ${newState === 1 ? 'dinyalakan' : 'dimatikan'}`, 'success')
                                                            setLoadingDevices(prev => ({ ...prev, C: false }))
                                                        },
                                                        () => {
                                                            showToast('Gagal mengontrol Cooler', 'error')
                                                            setLoadingDevices(prev => ({ ...prev, C: false }))
                                                        }
                                                    )
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center">
                                                        {loadingDevices.C ? (
                                                            <Loader2 className="w-8 h-8 mr-3 text-blue-400 animate-spin" />
                                                        ) : (
                                                            <Wind className={`w-8 h-8 mr-3 ${deviceStates.C?.status === 1 ? 'text-blue-400' : 'text-gray-500'}`} />
                                                        )}
                                                        <div>
                                                            <span className="font-semibold text-white text-lg">Cooler</span>
                                                            <p className="text-xs text-gray-400">Pendingin Kandang</p>
                                                        </div>
                                                    </div>
                                                    <div className={`text-2xl font-bold ${deviceStates.C?.status === 1 ? 'text-blue-400' : 'text-gray-500'}`}>
                                                        {loadingDevices.C ? '...' : (deviceStates.C?.status === 1 ? 'ON' : 'OFF')}
                                                    </div>
                                                </div>
                                                {deviceStates.C?.intermittent?.enabled && (
                                                    <span className="badge badge-info text-xs">Intermittent</span>
                                                )}
                                                {deviceStates.C?.target?.enabled && (
                                                    <span className="badge badge-warning text-xs ml-1">Target</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white flex items-center">
                                            <Fan className="w-5 h-5 mr-2 text-blue-400" />
                                            Kontrol {productConfig?.fans ?? 8} Fan
                                        </h3>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => toggleAllFans(true)}
                                                className="btn-primary text-sm"
                                            >
                                                Nyalakan Semua
                                            </button>
                                            <button
                                                onClick={() => toggleAllFans(false)}
                                                className="btn-secondary text-sm"
                                            >
                                                Matikan Semua
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {fans.map(fan => (
                                            <div
                                                key={fan.id}
                                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${fan.isOn
                                                    ? 'bg-green-500/10 border-green-500/50'
                                                    : 'bg-dark-400 border-dark-100'
                                                    }`}
                                                onClick={() => toggleFan(fan.id)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-white">{fan.name}</span>
                                                    {loadingDevices[`B${fan.id}`] ? (
                                                        <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                                                    ) : (
                                                        <Fan className={`w-6 h-6 ${fan.isOn ? 'text-green-400 animate-spin' : 'text-gray-500'
                                                            }`} style={{ animationDuration: '2s' }} />
                                                    )}
                                                </div>
                                                <div className={`text-sm font-medium ${fan.isOn ? 'text-green-400' : 'text-gray-500'
                                                    }`}>
                                                    {fan.isOn ? 'ON' : 'OFF'}
                                                </div>
                                                {fan.intermittent.enabled && (
                                                    <span className="badge badge-info text-xs mt-2">Intermittent</span>
                                                )}
                                                {fan.target.enabled && (
                                                    <span className="badge badge-warning text-xs mt-2 ml-1">Target</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Intermittent Tab */}
                            {activeTab === 'intermittent' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                        <Clock className="w-5 h-5 mr-2 text-blue-400" />
                                        Setting Intermittent (Heater, Cooler, 8 Fan)
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Atur waktu ON dan OFF untuk mode intermittent. Device akan menyala dan mati secara bergantian.
                                    </p>

                                    {/* Heater Intermittent */}
                                    <div className="mb-3 flex items-center justify-between p-4 bg-dark-400 rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <Thermometer className={`w-5 h-5 ${deviceStates.H?.intermittent?.enabled ? 'text-orange-400' : 'text-gray-500'}`} />
                                            <span className="font-medium text-white w-24">Heater</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={deviceStates.H?.intermittent?.enabled || false}
                                                    onChange={(e) => setIntermittent('H', e.target.checked, deviceStates.H?.intermittent?.onDuration, deviceStates.H?.intermittent?.offDuration)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-dark-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                                <span className="ml-2 text-sm text-gray-400">Enable</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">ON:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="300"
                                                    value={deviceStates.H?.intermittent?.onDuration || 30}
                                                    onChange={(e) => setIntermittent('H', deviceStates.H?.intermittent?.enabled || false, parseInt(e.target.value), deviceStates.H?.intermittent?.offDuration)}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.H?.intermittent?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">detik</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">OFF:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="300"
                                                    value={deviceStates.H?.intermittent?.offDuration || 30}
                                                    onChange={(e) => setIntermittent('H', deviceStates.H?.intermittent?.enabled || false, deviceStates.H?.intermittent?.onDuration, parseInt(e.target.value))}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.H?.intermittent?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">detik</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cooler Intermittent */}
                                    <div className="mb-3 flex items-center justify-between p-4 bg-dark-400 rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <Wind className={`w-5 h-5 ${deviceStates.C?.intermittent?.enabled ? 'text-blue-400' : 'text-gray-500'}`} />
                                            <span className="font-medium text-white w-24">Cooler</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={deviceStates.C?.intermittent?.enabled || false}
                                                    onChange={(e) => setIntermittent('C', e.target.checked, deviceStates.C?.intermittent?.onDuration, deviceStates.C?.intermittent?.offDuration)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-dark-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className="ml-2 text-sm text-gray-400">Enable</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">ON:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="300"
                                                    value={deviceStates.C?.intermittent?.onDuration || 30}
                                                    onChange={(e) => setIntermittent('C', deviceStates.C?.intermittent?.enabled || false, parseInt(e.target.value), deviceStates.C?.intermittent?.offDuration)}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.C?.intermittent?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">detik</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">OFF:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="300"
                                                    value={deviceStates.C?.intermittent?.offDuration || 30}
                                                    onChange={(e) => setIntermittent('C', deviceStates.C?.intermittent?.enabled || false, deviceStates.C?.intermittent?.onDuration, parseInt(e.target.value))}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.C?.intermittent?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">detik</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {fans.map(fan => (
                                            <div
                                                key={fan.id}
                                                className="flex items-center justify-between p-4 bg-dark-400 rounded-lg"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <Fan className={`w-5 h-5 ${fan.intermittent.enabled ? 'text-blue-400' : 'text-gray-500'}`} />
                                                    <span className="font-medium text-white w-16">{fan.name}</span>

                                                    {/* Enable Toggle */}
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={fan.intermittent.enabled}
                                                            onChange={(e) => updateIntermittent(fan.id, 'enabled', e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-dark-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                        <span className="ml-2 text-sm text-gray-400">Enable</span>
                                                    </label>
                                                </div>

                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-400">ON:</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="300"
                                                            value={fan.intermittent.onTime}
                                                            onChange={(e) => updateIntermittent(fan.id, 'onTime', parseInt(e.target.value))}
                                                            className="input w-20 text-center"
                                                            disabled={!fan.intermittent.enabled}
                                                        />
                                                        <span className="text-xs text-gray-500">detik</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-400">OFF:</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="300"
                                                            value={fan.intermittent.offTime}
                                                            onChange={(e) => updateIntermittent(fan.id, 'offTime', parseInt(e.target.value))}
                                                            className="input w-20 text-center"
                                                            disabled={!fan.intermittent.enabled}
                                                        />
                                                        <span className="text-xs text-gray-500">detik</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Target Tab */}
                            {activeTab === 'target' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                        <Target className="w-5 h-5 mr-2 text-yellow-400" />
                                        Setting Target Suhu (Heater, Cooler, 8 Fan)
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Device akan menyala otomatis jika suhu melebihi target + toleransi, dan mati jika di bawah target - toleransi.
                                    </p>

                                    {/* Heater Target */}
                                    <div className="mb-3 flex items-center justify-between p-4 bg-dark-400 rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <Thermometer className={`w-5 h-5 ${deviceStates.H?.target?.enabled ? 'text-orange-400' : 'text-gray-500'}`} />
                                            <span className="font-medium text-white w-24">Heater</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={deviceStates.H?.target?.enabled || false}
                                                    onChange={(e) => setTargetTemp('H', e.target.checked, deviceStates.H?.target?.value, deviceStates.H?.target?.tolerance)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-dark-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                                <span className="ml-2 text-sm text-gray-400">Enable</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">Target:</span>
                                                <input
                                                    type="number"
                                                    min="20"
                                                    max="40"
                                                    step="0.5"
                                                    value={(deviceStates.H?.target?.value || 280) / 10}
                                                    onChange={(e) => setTargetTemp('H', deviceStates.H?.target?.enabled || false, parseFloat(e.target.value) * 10, deviceStates.H?.target?.tolerance)}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.H?.target?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">°C</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">Toleransi:</span>
                                                <input
                                                    type="number"
                                                    min="0.5"
                                                    max="5"
                                                    step="0.5"
                                                    value={(deviceStates.H?.target?.tolerance || 20) / 10}
                                                    onChange={(e) => setTargetTemp('H', deviceStates.H?.target?.enabled || false, deviceStates.H?.target?.value, parseFloat(e.target.value) * 10)}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.H?.target?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">°C</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cooler Target */}
                                    <div className="mb-3 flex items-center justify-between p-4 bg-dark-400 rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <Wind className={`w-5 h-5 ${deviceStates.C?.target?.enabled ? 'text-blue-400' : 'text-gray-500'}`} />
                                            <span className="font-medium text-white w-24">Cooler</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={deviceStates.C?.target?.enabled || false}
                                                    onChange={(e) => setTargetTemp('C', e.target.checked, deviceStates.C?.target?.value, deviceStates.C?.target?.tolerance)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-dark-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className="ml-2 text-sm text-gray-400">Enable</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">Target:</span>
                                                <input
                                                    type="number"
                                                    min="20"
                                                    max="40"
                                                    step="0.5"
                                                    value={(deviceStates.C?.target?.value || 280) / 10}
                                                    onChange={(e) => setTargetTemp('C', deviceStates.C?.target?.enabled || false, parseFloat(e.target.value) * 10, deviceStates.C?.target?.tolerance)}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.C?.target?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">°C</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-400">Toleransi:</span>
                                                <input
                                                    type="number"
                                                    min="0.5"
                                                    max="5"
                                                    step="0.5"
                                                    value={(deviceStates.C?.target?.tolerance || 20) / 10}
                                                    onChange={(e) => setTargetTemp('C', deviceStates.C?.target?.enabled || false, deviceStates.C?.target?.value, parseFloat(e.target.value) * 10)}
                                                    className="input w-20 text-center"
                                                    disabled={!deviceStates.C?.target?.enabled}
                                                />
                                                <span className="text-xs text-gray-500">°C</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {fans.map(fan => (
                                            <div
                                                key={fan.id}
                                                className="flex items-center justify-between p-4 bg-dark-400 rounded-lg"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <Fan className={`w-5 h-5 ${fan.target.enabled ? 'text-yellow-400' : 'text-gray-500'}`} />
                                                    <span className="font-medium text-white w-16">{fan.name}</span>

                                                    {/* Enable Toggle */}
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={fan.target.enabled}
                                                            onChange={(e) => updateTarget(fan.id, 'enabled', e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-dark-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                                                        <span className="ml-2 text-sm text-gray-400">Enable</span>
                                                    </label>
                                                </div>

                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-400">Target:</span>
                                                        <input
                                                            type="number"
                                                            min="20"
                                                            max="40"
                                                            step="0.5"
                                                            value={fan.target.temperature}
                                                            onChange={(e) => updateTarget(fan.id, 'temperature', parseFloat(e.target.value))}
                                                            className="input w-20 text-center"
                                                            disabled={!fan.target.enabled}
                                                        />
                                                        <span className="text-xs text-gray-500">°C</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-400">Toleransi:</span>
                                                        <input
                                                            type="number"
                                                            min="0.5"
                                                            max="5"
                                                            step="0.5"
                                                            value={fan.target.tolerance}
                                                            onChange={(e) => updateTarget(fan.id, 'tolerance', parseFloat(e.target.value))}
                                                            className="input w-20 text-center"
                                                            disabled={!fan.target.enabled}
                                                        />
                                                        <span className="text-xs text-gray-500">°C</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Alarm & Settings Tab */}
                            {activeTab === 'alarm' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                                        <Bell className="w-5 h-5 mr-2 text-red-400" />
                                        Alarm & Pengaturan Lanjutan
                                    </h3>

                                    {/* Alarm Settings Section */}
                                    <div className="bg-dark-400 rounded-lg p-6 mb-6">
                                        <h4 className="text-md font-semibold text-white mb-4 flex items-center">
                                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                                            Alarm Suhu
                                        </h4>
                                        <p className="text-sm text-gray-400 mb-4">
                                            Sistem akan memberikan notifikasi jika suhu melewati batas minimum atau maksimum.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Min Temperature Alarm */}
                                            <div className="bg-dark-300 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="text-white font-medium">Alarm Suhu Minimum</h5>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={alarmState.minEnabled}
                                                            onChange={(e) => setAlarmEnable('min', e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-dark-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="number"
                                                        min="15"
                                                        max="35"
                                                        step="0.5"
                                                        value={alarmState.minTemp / 10}
                                                        onChange={(e) => setAlarmValue('min', parseFloat(e.target.value))}
                                                        className="input flex-1 text-center text-lg"
                                                        disabled={!alarmState.minEnabled}
                                                    />
                                                    <span className="text-xl text-gray-400">°C</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Alarm aktif jika suhu kurang dari nilai ini
                                                </p>
                                            </div>

                                            {/* Max Temperature Alarm */}
                                            <div className="bg-dark-300 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="text-white font-medium">Alarm Suhu Maksimum</h5>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={alarmState.maxEnabled}
                                                            onChange={(e) => setAlarmEnable('max', e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-dark-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="number"
                                                        min="20"
                                                        max="45"
                                                        step="0.5"
                                                        value={alarmState.maxTemp / 10}
                                                        onChange={(e) => setAlarmValue('max', parseFloat(e.target.value))}
                                                        className="input flex-1 text-center text-lg"
                                                        disabled={!alarmState.maxEnabled}
                                                    />
                                                    <span className="text-xl text-gray-400">°C</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Alarm aktif jika suhu melebihi nilai ini
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Temperature Calibration */}
                                    <div className="bg-dark-400 rounded-lg p-6">
                                        <h4 className="text-md font-semibold text-white mb-4 flex items-center">
                                            <Thermometer className="w-4 h-4 mr-2 text-orange-400" />
                                            Kalibrasi Sensor Suhu
                                        </h4>
                                        <p className="text-sm text-gray-400 mb-4">
                                            Sesuaikan offset pembacaan sensor suhu jika diperlukan kalibrasi.
                                        </p>

                                        <div className="bg-dark-300 rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-white font-medium">Offset Kalibrasi</span>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-2xl font-bold ${calibrationState.tempOffset >= 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                                                        {calibrationState.tempOffset >= 0 ? '+' : ''}{(calibrationState.tempOffset / 10).toFixed(1)}
                                                    </span>
                                                    <span className="text-gray-400">°C</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <button
                                                    onClick={() => setCalibration((calibrationState.tempOffset / 10) - 0.5)}
                                                    className="btn-secondary flex-1"
                                                >
                                                    - 0.5°C
                                                </button>
                                                <button
                                                    onClick={() => setCalibration(0)}
                                                    className="btn-secondary flex-1"
                                                >
                                                    Reset
                                                </button>
                                                <button
                                                    onClick={() => setCalibration((calibrationState.tempOffset / 10) + 0.5)}
                                                    className="btn-secondary flex-1"
                                                >
                                                    + 0.5°C
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-4 text-center">
                                                Offset akan diterapkan ke semua pembacaan sensor suhu
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </>
            )}

            {/* Diesel View - Only show when viewMode is 'diesel' and kandang has diesel products (Ci-Touch624) */}
            {hasDiesel && viewMode === 'diesel' && (
                <div className="space-y-6">
                    {/* Diesel Overview Header */}
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                    <Fuel className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Diesel Generator</h2>
                                    <p className="text-gray-400">4 Unit - Power Backup System</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-400">
                                        {dieselUnits.filter(d => d.isOn).length}
                                    </p>
                                    <p className="text-xs text-gray-500">Running</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-400">
                                        {dieselUnits.filter(d => !d.isOn).length}
                                    </p>
                                    <p className="text-xs text-gray-500">Standby</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Diesel Monitoring Component */}
                    <div className="card">
                        <DieselMonitor
                            dieselUnits={dieselUnits}
                            title="Status Monitoring"
                        />
                    </div>
                    {/* Diesel Control Component */}
                    <div className="card">
                        <DieselControlPanel title="Diesel Control" />
                    </div>
                </div>
            )}


            <ChartModal
                isOpen={chartModal.isOpen}
                onClose={() => setChartModal({ ...chartModal, isOpen: false })}
                title={chartModal.title}
                icon={
                    chartModal.type === 'temperature' ? <Thermometer className="w-5 h-5 text-orange-400" /> :
                        chartModal.type === 'humidity' ? <Droplets className="w-5 h-5 text-blue-400" /> :
                            chartModal.type === 'hsi' ? <Activity className="w-5 h-5 text-purple-400" /> :
                                chartModal.type === 'ammonia' ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> :
                                    <Wind className="w-5 h-5 text-cyan-400" />
                }
                chartType={chartModal.type}
            />

            {/* Alert Dialog for Blocked Fan Control */}
            {alertDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setAlertDialog({ isOpen: false, fanName: '', mode: null })}
                    />
                    <div className="relative bg-dark-300 border border-dark-100 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-slide-up">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-yellow-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Tidak Dapat Mengubah Status</h2>
                            <p className="text-gray-400 mb-4">
                                <strong className="text-white">{alertDialog.fanName}</strong> tidak dapat di ON/OFF secara manual.
                            </p>
                            <div className="bg-dark-400 rounded-lg p-3 mb-6">
                                <p className="text-sm text-gray-300">
                                    {alertDialog.mode === 'intermittent' && (
                                        <>Mode <span className="text-blue-400 font-semibold">Intermittent</span> sedang aktif. Fan akan menyala/mati otomatis berdasarkan timer.</>
                                    )}
                                    {alertDialog.mode === 'target' && (
                                        <>Mode <span className="text-yellow-400 font-semibold">Target</span> sedang aktif. Fan dikontrol otomatis berdasarkan suhu.</>
                                    )}
                                    {alertDialog.mode === 'both' && (
                                        <>Mode <span className="text-blue-400 font-semibold">Intermittent</span> dan <span className="text-yellow-400 font-semibold">Target</span> sedang aktif. Nonaktifkan terlebih dahulu untuk kontrol manual.</>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setAlertDialog({ isOpen: false, fanName: '', mode: null })}
                                className="btn-primary w-full"
                            >
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 animate-fade-in">
                    <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${toast.type === 'success'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                        }`}>
                        {toast.type === 'success' ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <X className="w-6 h-6" />
                        )}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
