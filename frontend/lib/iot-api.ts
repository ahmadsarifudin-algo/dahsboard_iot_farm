// IoT Service API Client
// Base URL: https://prod-iot.chickinindonesia.com/

import authService from './auth'

const IOT_BASE_URL = 'https://prod-iot.chickinindonesia.com'

// Types based on validated API response
export interface Flock {
    _id: string
    flock_id: string
    name: string
    type: string
    typeCode: number
    version: string
    versionCode: number
    partNumber: string
    connected: boolean
    isPairing: boolean
    enable: boolean
    deleted: boolean
    mode: string
    day: number
    lastUpdate: string
    actualTemperature: number
    idealTemperature: number
    humidity: number
    HSI: number
    co2: number
    amonia: number
    water: number
    wind: number
    lux: number
    calibrationTemperature: number
    warning: string
    serialNumber: string
    periode: string | null
    deviceName: string
    productId: string | null
    odooShedId: number
    kandang: string
    user: string
    location: {
        lat: number
        lon: number
    }
    updateTime: string
    createdAt: string
    updatedAt: string
    device: {
        [key: string]: {
            status: number | null
            setEnable: number | null
            setOff: number | null
            setOn: number | null
            inverterEnable: boolean | null
            inverterState: boolean | null
            inverterStatus: boolean | null
        }
    }
    targetTemperature: {
        [key: string]: {
            value: number
            hysteresis: number
            setEnable: number
        }
    }
    sensors: {
        temperature1: { value: number; calibration: number }
        temperature2: { value: number; calibration: number }
        temperature3: { value: number; calibration: number }
        temperatureOutside: { value: number; calibration: number }
        ammonia: { value: number; calibration: number }
        humidity: { value: number; calibration: number }
        co2: { value: number; calibration: number }
    }
    alarm: {
        min: { value: number; status: boolean }
        max: { value: number; status: boolean }
    }
    inverter: {
        value: number
        setEnable: boolean
    }
    lastConnected: {
        lastConnect: string
        timeAgo: string
        time: string
    }
    features: {
        version: {
            currentVersion: string
            latestVersion: string
        }
        list_features: Array<{ tag: string; name: string }>
        available_features: Array<{ tag: string; name: string }>
    }
    coop?: Kandang
}

export interface Kandang {
    _id: string
    coop_id: string
    idOdoo: number
    kode: string
    alamat: string
    tipe: number
    populasi: number
    jenisBudidaya: string
    province: string
    regency: string
    kota: string
    floor_count: number
    flock_count: number
    active: boolean
    isActive: boolean
    isMandiri: boolean
    fully_paired: boolean
    isDistributor: boolean
    deleted: boolean
    createdBy: string
    createdAt: string
    updatedAt: string
    flock: Array<{ _id: string; populasi: number; mortality?: number }>
    flocks: Flock[]
    diesel: any[]
}

export interface ListKandangResponse {
    message: string
    data: Kandang[]
}

class IoTApiClient {
    private baseUrl: string

    constructor() {
        this.baseUrl = IOT_BASE_URL
    }

    private getHeaders(): HeadersInit {
        const token = authService.getToken()
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        })

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, redirect to login
                authService.clearToken()
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'
                }
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    // List Kandang by User
    async getKandangList(): Promise<ListKandangResponse> {
        return this.request<ListKandangResponse>('/api/iot/v2/shed/user')
    }

    // Get Flock by ID
    async getFlockById(flockId: string): Promise<{ message: string; data: Flock }> {
        return this.request(`/api/iot/v2/flock/${flockId}`)
    }

    // Get Device Features
    async getDeviceFeatures(flockId: string): Promise<any> {
        return this.request(`/api/iot/v3/feature?flockId=${flockId}`)
    }

    // Get Flock Summary (for charts)
    async getFlockSummary(flockId: string): Promise<any> {
        return this.request(`/api/iot/flock/summary/${flockId}`)
    }

    // Get Chart Data with Custom Range
    async getChartData(flockId: string, startDate?: string, endDate?: string): Promise<any> {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        const query = params.toString()
        return this.request(`/api/v2/log/chart/custom/flock/${flockId}${query ? `?${query}` : ''}`)
    }

    // Get Log Activity
    async getLogActivity(
        flockId: string,
        options: {
            limit?: number
            lang?: string
            startDate?: string
            endDate?: string
            type?: string
            page?: number
            deviceType?: string
        } = {}
    ): Promise<any> {
        const {
            limit = 50,
            lang = 'id',
            startDate = '',
            endDate = '',
            type = '',
            page = 1,
            deviceType = 'default'
        } = options

        const params = new URLSearchParams({
            sort: '-1',
            startDate,
            endDate,
            page: page.toString(),
            type,
            limit: limit.toString(),
            lang,
            deviceType
        })

        return this.request(`/api/iot/v2/log-activity/flock/${flockId}?${params.toString()}`)
    }

    // Create Kandang
    async createKandang(data: {
        kode: string
        alamat: string
        tipe: number
        populasi: number
        jenisBudidaya: string
    }): Promise<any> {
        return this.request('/api/iot/v2/shed', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    // Delete Kandang
    async deleteKandang(kandangId: string): Promise<any> {
        return this.request(`/api/iot/v2/shed/${kandangId}`, {
            method: 'DELETE',
        })
    }

    // Add Flock (Pairing Device)
    async addFlock(data: any): Promise<any> {
        return this.request('/api/iot/v3/flock', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    // Delete Flock (Putuskan Perangkat)
    async deleteFlock(flockId: string): Promise<any> {
        return this.request(`/api/iot/flock/${flockId}`, {
            method: 'DELETE',
        })
    }
}

export const iotApi = new IoTApiClient()
export default iotApi
