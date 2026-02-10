const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

class ApiClient {
    private baseUrl: string

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        })

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`)
        }

        return response.json()
    }

    // Stats
    async getOverviewStats() {
        return this.request('/stats/overview')
    }

    async getDevicesByType() {
        return this.request('/stats/devices/by-type')
    }

    async getDevicesBySite() {
        return this.request('/stats/devices/by-site')
    }

    // Sites
    async getSites(params?: { region?: string }) {
        const query = params?.region ? `?region=${params.region}` : ''
        return this.request(`/sites${query}`)
    }

    async getSite(id: string) {
        return this.request(`/sites/${id}`)
    }

    async getSitesMapData() {
        return this.request('/sites/map/data')
    }

    // Devices
    async getDevices(params?: {
        site_id?: string
        type?: string
        status?: string
        search?: string
        limit?: number
    }) {
        const query = new URLSearchParams()
        if (params?.site_id) query.set('site_id', params.site_id)
        if (params?.type) query.set('type', params.type)
        if (params?.status) query.set('status', params.status)
        if (params?.search) query.set('search', params.search)
        if (params?.limit) query.set('limit', params.limit.toString())

        const queryStr = query.toString()
        return this.request(`/devices${queryStr ? `?${queryStr}` : ''}`)
    }

    async getDevice(id: string) {
        return this.request(`/devices/${id}`)
    }

    async getDeviceTypes() {
        return this.request('/devices/types')
    }

    async sendCommand(deviceId: string, command: { command_type: string; payload: object }) {
        return this.request(`/devices/${deviceId}/commands`, {
            method: 'POST',
            body: JSON.stringify(command),
        })
    }

    async getDeviceCommands(deviceId: string) {
        return this.request(`/devices/${deviceId}/commands`)
    }

    // Telemetry
    async getDeviceTelemetry(
        deviceId: string,
        params?: { metric?: string; start?: string; end?: string; interval?: string }
    ) {
        const query = new URLSearchParams()
        if (params?.metric) query.set('metric', params.metric)
        if (params?.start) query.set('start', params.start)
        if (params?.end) query.set('end', params.end)
        if (params?.interval) query.set('interval', params.interval)

        const queryStr = query.toString()
        return this.request(`/telemetry/devices/${deviceId}${queryStr ? `?${queryStr}` : ''}`)
    }

    async getLatestTelemetry(deviceId: string) {
        return this.request(`/telemetry/latest/${deviceId}`)
    }

    // Alarms
    async getAlarms(params?: {
        device_id?: string
        severity?: string
        active_only?: boolean
        acknowledged?: boolean
        limit?: number
    }) {
        const query = new URLSearchParams()
        if (params?.device_id) query.set('device_id', params.device_id)
        if (params?.severity) query.set('severity', params.severity)
        if (params?.active_only !== undefined) query.set('active_only', params.active_only.toString())
        if (params?.acknowledged !== undefined) query.set('acknowledged', params.acknowledged.toString())
        if (params?.limit) query.set('limit', params.limit.toString())

        const queryStr = query.toString()
        return this.request(`/alarms${queryStr ? `?${queryStr}` : ''}`)
    }

    async getAlarmsSummary() {
        return this.request('/alarms/summary')
    }

    async acknowledgeAlarm(alarmId: string, acknowledgedBy: string) {
        return this.request(`/alarms/${alarmId}/acknowledge`, {
            method: 'PATCH',
            body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
        })
    }

    async closeAlarm(alarmId: string) {
        return this.request(`/alarms/${alarmId}/close`, {
            method: 'PATCH',
        })
    }

    // Device CRUD
    async createDevice(device: {
        device_key: string
        name: string
        type: string
        site_id?: string | null
        firmware?: string | null
    }) {
        return this.request('/devices', {
            method: 'POST',
            body: JSON.stringify(device),
        })
    }

    async updateDevice(deviceId: string, updates: Partial<{
        name: string
        type: string
        site_id: string | null
        firmware: string | null
        shadow_desired: Record<string, any>
    }>) {
        return this.request(`/devices/${deviceId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        })
    }

    async deleteDevice(deviceId: string) {
        return this.request(`/devices/${deviceId}`, {
            method: 'DELETE',
        })
    }
}

export const api = new ApiClient(API_BASE)
