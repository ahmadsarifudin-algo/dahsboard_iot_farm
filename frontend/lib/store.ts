import { create } from 'zustand'

interface OverviewStats {
    totalDevices: number
    onlineDevices: number
    offlineDevices: number
    activeAlarms: number
    criticalAlarms: number
    warningAlarms: number
    messageRate: number
    totalSites: number
}

interface Device {
    id: string
    device_key: string
    name: string
    type: string
    site_id: string | null
    firmware: string | null
    status: string
    last_seen: string | null
}

interface Alarm {
    id: string
    device_id: string
    severity: string
    message: string
    ts_open: string
    ts_close: string | null
    acknowledged: boolean
}

interface Site {
    id: string
    name: string
    latitude: number
    longitude: number
    region: string | null
    devices?: Device[]
}

interface Store {
    // Stats
    stats: OverviewStats
    setStats: (stats: OverviewStats) => void

    // Devices
    devices: Device[]
    setDevices: (devices: Device[]) => void
    updateDeviceStatus: (deviceId: string, status: string) => void

    // Alarms
    alarms: Alarm[]
    setAlarms: (alarms: Alarm[]) => void
    addAlarm: (alarm: Alarm) => void

    // Sites
    sites: Site[]
    setSites: (sites: Site[]) => void

    // WebSocket
    wsConnected: boolean
    setWsConnected: (connected: boolean) => void
}

export const useStore = create<Store>((set) => ({
    // Initial stats
    stats: {
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        activeAlarms: 0,
        criticalAlarms: 0,
        warningAlarms: 0,
        messageRate: 0,
        totalSites: 0,
    },
    setStats: (stats) => set({ stats }),

    // Devices
    devices: [],
    setDevices: (devices) => set({ devices }),
    updateDeviceStatus: (deviceId, status) =>
        set((state) => ({
            devices: state.devices.map((d) =>
                d.id === deviceId ? { ...d, status } : d
            ),
        })),

    // Alarms
    alarms: [],
    setAlarms: (alarms) => set({ alarms }),
    addAlarm: (alarm) =>
        set((state) => ({
            alarms: [alarm, ...state.alarms],
            stats: {
                ...state.stats,
                activeAlarms: state.stats.activeAlarms + 1,
                criticalAlarms:
                    alarm.severity === 'critical'
                        ? state.stats.criticalAlarms + 1
                        : state.stats.criticalAlarms,
                warningAlarms:
                    alarm.severity === 'warning'
                        ? state.stats.warningAlarms + 1
                        : state.stats.warningAlarms,
            },
        })),

    // Sites
    sites: [],
    setSites: (sites) => set({ sites }),

    // WebSocket
    wsConnected: false,
    setWsConnected: (wsConnected) => set({ wsConnected }),
}))
