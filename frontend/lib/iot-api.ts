// IoT Service API Client
// Migrated: getKandangList and getFlockById now go through local backend adapter.
// Remaining endpoints still call Chickin directly until their adapters are built.

import authService from './auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
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
    population?: number
    weight?: {
        current: number
        target: number
        fcr: number | string
    }
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

// Normalized coop from backend adapter
export interface NormalizedCoop {
    external_id: string
    code: string
    name: string
    address?: string
    coop_type: number
    population: number
    cultivation_type: string
    province?: string
    regency?: string
    city?: string
    floor_count: number
    flock_count: number
    active: boolean
    fully_paired: boolean
    is_mandiri: boolean
    is_distributor: boolean
    flocks: Array<{
        external_id: string
        name: string
        population: number
        connected: boolean
    }>
}

export interface ListKandangResponse {
    message: string
    data: Kandang[]
}

class IoTApiClient {
    private iotBaseUrl: string
    private apiBase: string

    constructor() {
        this.iotBaseUrl = IOT_BASE_URL
        this.apiBase = API_BASE
    }

    private getHeaders(): HeadersInit {
        const token = authService.getToken()
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    }

    // Direct request to Chickin IoT (for endpoints not yet migrated)
    private async directRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.iotBaseUrl}${endpoint}`, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        })

        if (!response.ok) {
            if (response.status === 401) {
                authService.clearToken()
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'
                }
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    // Request via local backend adapter
    private async adapterRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        })

        if (!response.ok) {
            if (response.status === 401) {
                authService.clearToken()
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'
                }
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    // List Kandang by User - NOW VIA LOCAL BACKEND ADAPTER
    async getKandangList(): Promise<ListKandangResponse> {
        const normalized = await this.adapterRequest<NormalizedCoop[]>(
            '/integrations/chickin/coops'
        )

        // Map normalized response back to Kandang shape for backward compatibility
        const kandangList: Kandang[] = normalized.map(c => ({
            _id: c.external_id,
            coop_id: c.external_id,
            idOdoo: 0,
            kode: c.code,
            alamat: c.address || '',
            tipe: c.coop_type,
            populasi: c.population,
            jenisBudidaya: c.cultivation_type,
            province: c.province || '',
            regency: c.regency || '',
            kota: c.city || '',
            floor_count: c.floor_count,
            flock_count: c.flock_count,
            active: c.active,
            isActive: c.active,
            isMandiri: c.is_mandiri,
            fully_paired: c.fully_paired,
            isDistributor: c.is_distributor,
            deleted: false,
            createdBy: '',
            createdAt: '',
            updatedAt: '',
            flock: c.flocks.map(f => ({
                _id: f.external_id,
                populasi: f.population,
            })),
            flocks: c.flocks.map(f => ({
                _id: f.external_id,
                flock_id: f.external_id,
                name: f.name,
                type: f.name || 'Ci-Touch',
                typeCode: 0,
                version: '',
                versionCode: 0,
                partNumber: (f as any).part_number || '',
                connected: f.connected,
                isPairing: false,
                enable: true,
                deleted: false,
                mode: '',
                day: 0,
                lastUpdate: '',
                actualTemperature: 0,
                idealTemperature: 0,
                humidity: 0,
                HSI: 0,
                co2: 0,
                amonia: 0,
                water: 0,
                wind: 0,
                lux: 0,
                calibrationTemperature: 0,
                warning: '',
                serialNumber: '',
                periode: null,
                deviceName: f.name,
                productId: null,
                odooShedId: 0,
                kandang: '',
                user: '',
                location: { lat: 0, lon: 0 },
                updateTime: '',
                createdAt: '',
                updatedAt: '',
                device: {},
                targetTemperature: {},
                sensors: {} as any,
                alarm: { min: { value: 0, status: false }, max: { value: 0, status: false } },
                inverter: { value: 0, setEnable: false },
                lastConnected: { lastConnect: '', timeAgo: '', time: '' },
                features: { version: { currentVersion: '', latestVersion: '' }, list_features: [], available_features: [] },
            } as Flock)),
            diesel: [],
        }))

        return { message: 'OK', data: kandangList }
    }

    // Get Flock by ID - NOW VIA LOCAL BACKEND ADAPTER
    async getFlockById(flockId: string): Promise<{ message: string; data: Flock }> {
        const normalized = await this.adapterRequest<any>(
            `/integrations/chickin/flocks/${flockId}`
        )

        // Map normalized response back to Flock shape for backward compatibility
        const flock: Flock = {
            _id: normalized.external_id,
            flock_id: normalized.external_id,
            name: normalized.name,
            type: normalized.type || 'Ci-Touch',
            typeCode: normalized.type_code || 0,
            version: normalized.version || '',
            versionCode: normalized.version_code || 0,
            partNumber: normalized.part_number || '',
            connected: normalized.connected,
            isPairing: false,
            enable: true,
            deleted: false,
            mode: normalized.mode || '',
            day: normalized.day || 0,
            lastUpdate: '',
            actualTemperature: normalized.actual_temperature ? normalized.actual_temperature * 10 : 0,
            idealTemperature: normalized.ideal_temperature ? normalized.ideal_temperature * 10 : 0,
            humidity: normalized.humidity || 0,
            HSI: normalized.hsi || 0,
            co2: normalized.co2 || 0,
            amonia: normalized.ammonia || 0,
            water: 0,
            wind: 0,
            lux: 0,
            calibrationTemperature: 0,
            warning: '',
            serialNumber: '',
            periode: null,
            deviceName: normalized.device_name || '',
            productId: null,
            odooShedId: 0,
            kandang: '',
            user: '',
            location: { lat: 0, lon: 0 },
            updateTime: '',
            createdAt: '',
            updatedAt: '',
            device: normalized.device_state || {},
            targetTemperature: normalized.target_temperature || {},
            sensors: normalized.sensors || {} as any,
            alarm: normalized.alarm_config || { min: { value: 0, status: false }, max: { value: 0, status: false } },
            inverter: normalized.inverter || { value: 0, setEnable: false },
            lastConnected: { lastConnect: '', timeAgo: '', time: '' },
            features: normalized.features || { version: { currentVersion: '', latestVersion: '' }, list_features: [], available_features: [] },
            coop: normalized.coop ? {
                _id: normalized.coop.external_id,
                coop_id: normalized.coop.external_id,
                kode: normalized.coop.code || '',
            } as any : undefined,
        }

        return { message: 'OK', data: flock }
    }

    // --- Remaining endpoints still use direct Chickin calls ---

    // Get Device Features
    async getDeviceFeatures(flockId: string): Promise<any> {
        return this.directRequest(`/api/iot/v3/feature?flockId=${flockId}`)
    }

    // Get Flock Summary (for charts)
    async getFlockSummary(flockId: string): Promise<any> {
        return this.directRequest(`/api/iot/flock/summary/${flockId}`)
    }

    // Get Chart Data with Custom Range
    async getChartData(flockId: string, startDate?: string, endDate?: string): Promise<any> {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        const query = params.toString()
        return this.directRequest(`/api/v2/log/chart/custom/flock/${flockId}${query ? `?${query}` : ''}`)
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

        return this.directRequest(`/api/iot/v2/log-activity/flock/${flockId}?${params.toString()}`)
    }

    // Create Kandang
    async createKandang(data: {
        kode: string
        alamat: string
        tipe: number
        populasi: number
        jenisBudidaya: string
    }): Promise<any> {
        return this.directRequest('/api/iot/v2/shed', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    // Delete Kandang
    async deleteKandang(kandangId: string): Promise<any> {
        return this.directRequest(`/api/iot/v2/shed/${kandangId}`, {
            method: 'DELETE',
        })
    }

    // Add Flock (Pairing Device)
    async addFlock(data: any): Promise<any> {
        return this.directRequest('/api/iot/v3/flock', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    // Delete Flock (Putuskan Perangkat)
    async deleteFlock(flockId: string): Promise<any> {
        return this.directRequest(`/api/iot/flock/${flockId}`, {
            method: 'DELETE',
        })
    }
}

export const iotApi = new IoTApiClient()
export default iotApi
