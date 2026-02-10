'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import mqtt, { MqttClient, IClientOptions } from 'mqtt'

// MQTT Broker Configuration
const MQTT_CONFIG = {
    broker: 'broker.chickinindonesia.com',
    wsPort: 8083,
    wssPort: 8084,
    path: '/mqtt',
    username: 'iotChickinServerNode',
    password: '60zJ23n*eVCQ',
    protocolVersion: 5, // MQTT v5
    keepalive: 60,
    cleanStart: true,
    sessionExpiry: 0
}

// Build WebSocket URL (non-SSL for compatibility)
const MQTT_URL = typeof window !== 'undefined'
    ? `ws://${MQTT_CONFIG.broker}:${MQTT_CONFIG.wsPort}/mqtt`
    : ''

// Topic suffix
const TOPIC_SUFFIX = '8883'

// Default device state to avoid undefined properties on partial updates
const DEFAULT_DEVICE_STATE: DeviceState = {
    status: 0,
    intermittent: {
        enabled: false,
        onDuration: 30,
        offDuration: 30
    },
    target: {
        enabled: false,
        value: 280,
        tolerance: 20
    }
}

export interface MqttMessage {
    topic: string
    payload: any
    timestamp: Date
}

export interface SensorData {
    temperature?: number
    humidity?: number
}

export interface DeviceState {
    status: number  // 0=OFF, 1=ON
    terminalTime?: string
    groupName?: string
    intermittent: {
        enabled: boolean
        onDuration: number
        offDuration: number
    }
    target: {
        enabled: boolean
        value: number
        tolerance: number
    }
    inverter?: {
        enabled: boolean
        state: boolean
        status: boolean
    }
}

export interface AlarmState {
    minTemp: number
    minEnabled: boolean
    maxTemp: number
    maxEnabled: boolean
}

export interface InverterState {
    speed: number  // 0-100%
}

export interface CalibrationState {
    tempOffset: number  // in 0.1°C units
}

export interface SyncState {
    age?: string
    version?: string
    enable?: string
    // Device states
    deviceB1Status?: string
    deviceB2Status?: string
    deviceB3Status?: string
    deviceB4Status?: string
    deviceB5Status?: string
    deviceHStatus?: string
    deviceCStatus?: string
    // Intermittent settings
    deviceB1SetEnable?: string
    deviceB1SetOn?: string
    deviceB1SetOff?: string
    deviceB2SetEnable?: string
    deviceB2SetOn?: string
    deviceB2SetOff?: string
    deviceB3SetEnable?: string
    deviceB3SetOn?: string
    deviceB3SetOff?: string
    deviceB4SetEnable?: string
    deviceB4SetOn?: string
    deviceB4SetOff?: string
    deviceB5SetEnable?: string
    deviceB5SetOn?: string
    deviceB5SetOff?: string
    deviceHSetEnable?: string
    deviceHSetOn?: string
    deviceHSetOff?: string
    deviceCSetEnable?: string
    deviceCSetOn?: string
    deviceCSetOff?: string
    // Target temp settings
    targetTempB1SetEnable?: string
    targetTempB1Value?: string
    targetTempB1His?: string
    targetTempB2SetEnable?: string
    targetTempB2Value?: string
    targetTempB2His?: string
    targetTempB3SetEnable?: string
    targetTempB3Value?: string
    targetTempB3His?: string
    targetTempB4SetEnable?: string
    targetTempB4Value?: string
    targetTempB4His?: string
    targetTempB5SetEnable?: string
    targetTempB5Value?: string
    targetTempB5His?: string
    targetTempHSetEnable?: string
    targetTempHValue?: string
    targetTempHHis?: string
    targetTempCSetEnable?: string
    targetTempCValue?: string
    targetTempCHis?: string
    // Inverter
    inverter?: string
    inverterSetEnable?: string
    // Alarms
    alarmMinValue?: string
    alarmMinStatus?: string
    alarmMaxValue?: string
    alarmMaxStatus?: string
}

// Helper: Get Lantai ID from floor index and total floors
export function getLantaiId(floorIndex: number, totalFloors: number): string {
    if (totalFloors === 1) return 'Lantai1'
    if (totalFloors === 2) {
        return floorIndex === 0 ? 'Lantai1' : 'Lantai2'
    }
    if (totalFloors === 3) {
        if (floorIndex === 0) return 'Lantai1'
        if (floorIndex === 1) return 'Lantai2'
        return 'Lantai3'
    }
    return `Lantai${floorIndex + 1}`
}

// Build SUBSCRIBE topic (data/ prefix, no /X/)
export function buildDataTopic(partNumber: string, lantai: string, type: string): string {
    return `data/${partNumber}/${lantai}/${type}/${TOPIC_SUFFIX}`
}

// Build PUBLISH/COMMAND topic (cmd/ prefix, with /X/ for devices, direct for INV/ALARM/etc)
export function buildCmdTopic(partNumber: string, lantai: string, type: string): string {
    // Exceptions for topics that don't need /X/
    if (type.startsWith('INV') || type.startsWith('ALARM') || type.startsWith('CALVAL')) {
        return `cmd/${partNumber}/${lantai}/${type}/${TOPIC_SUFFIX}`
    }
    // Default: use /X/ for control devices (B1-B5, H, C)
    return `cmd/${partNumber}/${lantai}/X/${type}/${TOPIC_SUFFIX}`
}

// Build REQ topic for requesting SYNC
export function buildReqTopic(partNumber: string): string {
    return `cmd/${partNumber}/REQ/${TOPIC_SUFFIX}`
}

// Build command payload
// Format: {"payload":{"_terminalTime":"...","status":"0"},"type":"set_var"}
export function buildPayload(groupName: string, status: string | number): object {
    const now = new Date()
    const terminalTime = now.toISOString().replace('T', ' ').replace('Z', '').substring(0, 23)
    return {
        type: 'set_var',
        payload: {
            _terminalTime: terminalTime,
            status: status.toString()
        }
    }
}

// Build group name (e.g., L1_S_B1 = Lantai1_Sensor_Blower1)
export function buildGroupName(lantai: string, prefix: string, device: string): string {
    const lantaiNum = lantai.replace('Lantai', 'L')
    return `${lantaiNum}_${prefix}_${device}`
}

// Feedback callback type
type FeedbackCallback = {
    device: string
    expectedValue: number
    timeout: NodeJS.Timeout
    onSuccess: () => void
    onFailure: () => void
}

export function useMqtt(partNumber?: string, floorIndex: number = 0, totalFloors: number = 1) {
    const clientRef = useRef<MqttClient | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [lastMessage, setLastMessage] = useState<MqttMessage | null>(null)
    const [sensorData, setSensorData] = useState<SensorData>({})
    const [deviceStates, setDeviceStates] = useState<Record<string, DeviceState>>({})
    const [alarmState, setAlarmState] = useState<AlarmState>({
        minTemp: 0,
        minEnabled: false,
        maxTemp: 0,
        maxEnabled: false
    })
    const [inverterState, setInverterState] = useState<InverterState>({ speed: 0 })
    const [calibrationState, setCalibrationState] = useState<CalibrationState>({ tempOffset: 0 })
    const [syncState, setSyncState] = useState<SyncState | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Track pending feedback callbacks
    const feedbackCallbacksRef = useRef<Map<string, FeedbackCallback>>(new Map())

    const lantai = getLantaiId(floorIndex, totalFloors)

    const connect = useCallback(() => {
        if (typeof window === 'undefined') return
        if (clientRef.current?.connected) return

        const options: IClientOptions = {
            username: MQTT_CONFIG.username,
            password: MQTT_CONFIG.password,
            clientId: `dashboard_${Math.random().toString(16).slice(2, 10)}`,
            protocolVersion: MQTT_CONFIG.protocolVersion as 5,
            clean: MQTT_CONFIG.cleanStart,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
            keepalive: MQTT_CONFIG.keepalive,
            rejectUnauthorized: false,
            properties: {
                sessionExpiryInterval: MQTT_CONFIG.sessionExpiry
            }
        }

        console.log('MQTT: Connecting to', MQTT_URL)
        const client = mqtt.connect(MQTT_URL, options)

        client.on('connect', () => {
            console.log('MQTT: Connected to broker')
            setIsConnected(true)
            setError(null)

            // Subscribe to topics if partNumber is provided
            if (partNumber) {
                subscribeToDevice(client, partNumber, lantai)
            }
        })

        client.on('message', (topic, message) => {
            try {
                const payload = message.toString()
                let parsedPayload: any
                try {
                    parsedPayload = JSON.parse(payload)
                } catch {
                    parsedPayload = payload
                }

                const msg: MqttMessage = {
                    topic,
                    payload: parsedPayload,
                    timestamp: new Date()
                }
                setLastMessage(msg)
                handleMessage(topic, parsedPayload)
            } catch (err) {
                console.error('MQTT: Failed to parse message', err)
            }
        })

        client.on('error', (err) => {
            console.error('MQTT: Error', err)
            setError(err.message)
        })

        client.on('close', () => {
            console.log('MQTT: Connection closed')
            setIsConnected(false)
        })

        client.on('reconnect', () => {
            console.log('MQTT: Reconnecting...')
        })

        clientRef.current = client
    }, [partNumber, lantai])

    const subscribeToDevice = (client: MqttClient, pn: string, lt: string) => {
        // Subscribe to sensor topics (data/ prefix)
        const topics: string[] = [
            buildDataTopic(pn, lt, 'SENSOR/TEMP'),
            buildDataTopic(pn, lt, 'SENSOR/HUMI'),
            buildDataTopic(pn, lt, 'SYNC'),  // Complete device state
        ]

        // Subscribe to device status topics (B1-B5, H, C)
        const devices = ['B1', 'B2', 'B3', 'B4', 'B5', 'H', 'C']
        devices.forEach(device => {
            // Status feedback (no /X/)
            topics.push(buildDataTopic(pn, lt, device))
            // Intermittent and target states
            topics.push(buildDataTopic(pn, lt, `ITMEN/${device}`))
            topics.push(buildDataTopic(pn, lt, `ITMON/${device}`))
            topics.push(buildDataTopic(pn, lt, `ITMOFF/${device}`))
            topics.push(buildDataTopic(pn, lt, `TAREN/${device}`))
            topics.push(buildDataTopic(pn, lt, `TARVAL/${device}`))
            topics.push(buildDataTopic(pn, lt, `TARHIS/${device}`))
        })

        // Subscribe to alarm topics
        topics.push(buildDataTopic(pn, lt, 'ALARM/MIN'))
        topics.push(buildDataTopic(pn, lt, 'ALARM/MINEN'))
        topics.push(buildDataTopic(pn, lt, 'ALARM/MAX'))
        topics.push(buildDataTopic(pn, lt, 'ALARM/MAXEN'))

        // Subscribe to inverter topics
        topics.push(buildDataTopic(pn, lt, 'INV/VAL'))
        topics.push(buildDataTopic(pn, lt, 'INV/SET'))

        // Subscribe to calibration
        topics.push(buildDataTopic(pn, lt, 'CALVAL/TEMP'))

        // Subscribe to inverter status for blowers
        devices.filter(d => d.startsWith('B')).forEach(device => {
            topics.push(buildDataTopic(pn, lt, `INVSTATUS/${device}`))
            topics.push(buildDataTopic(pn, lt, `INVSTATE/${device}`))
            topics.push(buildDataTopic(pn, lt, `INVEN/${device}`))
        })

        topics.forEach(topic => {
            client.subscribe(topic, { qos: 0 }, (err) => {
                if (err) {
                    console.error(`MQTT: Failed to subscribe to ${topic}`, err)
                } else {
                    console.log(`MQTT: Subscribed to ${topic}`)
                }
            })
        })

        // Request SYNC after subscribing
        setTimeout(() => {
            requestSync(pn)
        }, 500)
    }

    const handleMessage = (topic: string, payload: any) => {
        // Parse topic: data/{partNumber}/{Lantai}/{TYPE...}[/8883]
        const parts = topic.split('/')
        if (parts.length < 4) return // Min: data/pn/L1/TYPE

        // Determine if last part is suffix (numeric or '8883')
        const lastPart = parts[parts.length - 1]
        const hasSuffix = lastPart === TOPIC_SUFFIX || /^\d+$/.test(lastPart)

        // Skip first part (data) and optional last part (8883)
        const typeStart = 3
        const typeEnd = hasSuffix ? parts.length - 1 : parts.length
        const typeParts = parts.slice(typeStart, typeEnd)
        const type = typeParts.join('/')

        console.log('MQTT Message:', { topic, type, payload })

        // Parse payload
        const status = typeof payload === 'object' ? payload.status : payload
        const statusNum = parseInt(status)

        // Check if this is a feedback for a pending command
        // Format: data/{pn}/{lantai}/{device}/8883 (e.g., data/xxx/Lantai1/B2/8883)
        const deviceType = typeParts[0] // e.g., "B2", "H", "C"
        if (deviceType && !deviceType.includes('/')) {
            const feedbackKey = `${lantai}_${deviceType}`
            const callback = feedbackCallbacksRef.current.get(feedbackKey)
            if (callback) {
                // Check if status matches expected value
                if (statusNum === callback.expectedValue) {
                    clearTimeout(callback.timeout)
                    feedbackCallbacksRef.current.delete(feedbackKey)
                    callback.onSuccess()
                    console.log(`MQTT: Feedback success for ${deviceType}`, statusNum)
                }
            }
        }

        if (type === 'SENSOR/TEMP') {
            // Temperature: status "234" means 23.4°C (divide by 10)
            const rawValue = typeof payload === 'object' ? parseInt(payload.status) : parseInt(payload)
            const temp = rawValue / 10
            console.log('MQTT: Temperature', { raw: rawValue, celsius: temp })
            setSensorData(prev => ({ ...prev, temperature: temp }))
        } else if (type === 'SENSOR/HUMI') {
            // Humidity: status "750" means 75.0% (divide by 10)
            const rawValue = typeof payload === 'object' ? parseInt(payload.status) : parseInt(payload)
            const humi = rawValue / 10
            console.log('MQTT: Humidity', { raw: rawValue, percent: humi })
            setSensorData(prev => ({ ...prev, humidity: humi }))
        } else if (type.match(/^B[1-5]$/) || type === 'H' || type === 'C') {
            // Device status
            setDeviceStates(prev => {
                const currentState = prev[type] || DEFAULT_DEVICE_STATE
                return {
                    ...prev,
                    [type]: {
                        ...currentState,
                        status: statusNum,
                        terminalTime: payload._terminalTime,
                        groupName: payload._groupName
                    }
                }
            })
        } else if (type.startsWith('ITMEN/')) {
            const device = typeParts[1]
            setDeviceStates(prev => {
                const currentState = prev[device] || DEFAULT_DEVICE_STATE
                return {
                    ...prev,
                    [device]: {
                        ...currentState,
                        intermittent: { ...currentState.intermittent, enabled: statusNum === 1 }
                    }
                }
            })
        } else if (type.startsWith('ITMON/')) {
            const device = typeParts[1]
            setDeviceStates(prev => {
                const currentState = prev[device] || DEFAULT_DEVICE_STATE
                return {
                    ...prev,
                    [device]: {
                        ...currentState,
                        intermittent: { ...currentState.intermittent, onDuration: statusNum }
                    }
                }
            })
        } else if (type.startsWith('ITMOFF/')) {
            const device = typeParts[1]
            setDeviceStates(prev => {
                const currentState = prev[device] || DEFAULT_DEVICE_STATE
                return {
                    ...prev,
                    [device]: {
                        ...currentState,
                        intermittent: { ...currentState.intermittent, offDuration: statusNum }
                    }
                }
            })
        } else if (type.startsWith('TAREN/')) {
            const device = typeParts[1]
            setDeviceStates(prev => {
                const currentState = prev[device] || DEFAULT_DEVICE_STATE
                return {
                    ...prev,
                    [device]: {
                        ...currentState,
                        target: { ...currentState.target, enabled: statusNum === 1 }
                    }
                }
            })
        } else if (type.startsWith('TARVAL/')) {
            const device = typeParts[1]
            setDeviceStates(prev => {
                const currentState = prev[device] || DEFAULT_DEVICE_STATE
                return {
                    ...prev,
                    [device]: {
                        ...currentState,
                        target: { ...currentState.target, value: statusNum }
                    }
                }
            })
        } else if (type.startsWith('TARHIS/')) {
            const device = typeParts[1]
            setDeviceStates(prev => {
                const currentState = prev[device] || DEFAULT_DEVICE_STATE
                return {
                    ...prev,
                    [device]: {
                        ...currentState,
                        target: { ...currentState.target, tolerance: statusNum }
                    }
                }
            })
        } else if (type === 'SYNC') {
            // Complete device state sync
            console.log('MQTT: Received SYNC', payload)
            setSyncState(payload as SyncState)

            // Parse SYNC payload to populate other states
            const sync = payload as SyncState

            // 1. Update Device States (B1-B5, H, C)
            const devices = ['B1', 'B2', 'B3', 'B4', 'B5', 'H', 'C']
            setDeviceStates(prev => {
                const newStates = { ...prev }

                devices.forEach(dev => {
                    // Map device name to sync keys (e.g., B1 -> deviceB1...)
                    const p = payload as any // Use any for direct access

                    if (!newStates[dev]) {
                        newStates[dev] = {
                            ...DEFAULT_DEVICE_STATE,
                            intermittent: { ...DEFAULT_DEVICE_STATE.intermittent },
                            target: { ...DEFAULT_DEVICE_STATE.target }
                        }
                    } else {
                        // Clone nested objects to avoid mutation issues
                        newStates[dev] = {
                            ...newStates[dev],
                            intermittent: { ...newStates[dev].intermittent },
                            target: { ...newStates[dev].target }
                        }
                    }

                    // Update Status
                    const statusVal = p[`device${dev}Status`]
                    if (statusVal !== undefined) {
                        newStates[dev].status = parseInt(statusVal)
                    }

                    // Update Intermittent
                    const enableVal = p[`device${dev}SetEnable`]
                    const onVal = p[`device${dev}SetOn`]
                    const offVal = p[`device${dev}SetOff`]

                    if (enableVal !== undefined) {
                        newStates[dev].intermittent.enabled = enableVal === '1'
                    }
                    if (onVal !== undefined) {
                        newStates[dev].intermittent.onDuration = parseInt(onVal)
                    }
                    if (offVal !== undefined) {
                        newStates[dev].intermittent.offDuration = parseInt(offVal)
                    }

                    // Update Target
                    const targetEnable = p[`targetTemp${dev}SetEnable`]
                    const targetValue = p[`targetTemp${dev}Value`]
                    const targetHis = p[`targetTemp${dev}His`]

                    if (targetEnable !== undefined) {
                        newStates[dev].target.enabled = targetEnable === '1'
                    }
                    if (targetValue !== undefined) {
                        newStates[dev].target.value = parseInt(targetValue)
                    }
                    if (targetHis !== undefined) {
                        newStates[dev].target.tolerance = parseInt(targetHis)
                    }
                })

                return newStates
            })

            // 2. Update Alarm State
            if (sync.alarmMinStatus && sync.alarmMinValue) {
                setAlarmState(prev => ({
                    ...prev,
                    minEnabled: sync.alarmMinStatus === '1',
                    minTemp: parseInt(sync.alarmMinValue as string)
                }))
            }
            if (sync.alarmMaxStatus && sync.alarmMaxValue) {
                setAlarmState(prev => ({
                    ...prev,
                    maxEnabled: sync.alarmMaxStatus === '1',
                    maxTemp: parseInt(sync.alarmMaxValue as string)
                }))
            }

            // 3. Update Inverter State
            if (sync.inverter) {
                setInverterState({ speed: parseInt(sync.inverter) })
            }

            // 4. Update Calibration (CALVAL/TEMP not in SyncState interface but might be added or we assume default 0)
            // If it's not in sync payload, we leave it as is or default.

        } else if (type === 'INV/VAL' || type === 'INV') {
            // Inverter current value (INV/VAL or INV)
            setInverterState({ speed: statusNum })

            // Check for pending INV feedback callback
            const feedbackKey = `${lantai}_INV`
            const callback = feedbackCallbacksRef.current.get(feedbackKey)
            if (callback && statusNum === callback.expectedValue) {
                clearTimeout(callback.timeout)
                feedbackCallbacksRef.current.delete(feedbackKey)
                callback.onSuccess()
                console.log(`MQTT: Feedback success for INV`, statusNum)
            }
        } else if (type === 'ALARM/MIN') {
            // Min alarm temperature value
            setAlarmState(prev => ({ ...prev, minTemp: statusNum }))
        } else if (type === 'ALARM/MINEN') {
            // Min alarm enabled
            setAlarmState(prev => ({ ...prev, minEnabled: statusNum === 1 }))
        } else if (type === 'ALARM/MAX') {
            // Max alarm temperature value
            setAlarmState(prev => ({ ...prev, maxTemp: statusNum }))
        } else if (type === 'ALARM/MAXEN') {
            // Max alarm enabled
            setAlarmState(prev => ({ ...prev, maxEnabled: statusNum === 1 }))
        } else if (type === 'CALVAL/TEMP') {
            // Temperature calibration offset
            setCalibrationState({ tempOffset: statusNum })
        }
    }

    // Publish command to topic (uses cmd/ prefix with /X/)
    const publishCommand = useCallback((type: string, status: string | number) => {
        if (!partNumber || !clientRef.current?.connected) {
            console.warn('MQTT: Not connected or no partNumber')
            return
        }

        const topic = buildCmdTopic(partNumber, lantai, type)
        const groupName = buildGroupName(lantai, 'S', type)
        const payload = buildPayload(groupName, status)
        const message = JSON.stringify(payload)

        clientRef.current.publish(topic, message, { qos: 0 }, (err) => {
            if (err) {
                console.error('MQTT: Publish error', err)
            } else {
                console.log(`MQTT: Published to ${topic}`, payload)
            }
        })
    }, [partNumber, lantai])

    // Control device (Fan, Heater, Cooler) with feedback
    const controlDevice = useCallback((device: string, state: 0 | 1, onSuccess?: () => void, onFailure?: () => void) => {
        if (!partNumber || !clientRef.current?.connected) {
            console.warn('MQTT: Not connected or no partNumber')
            onFailure?.()
            return
        }

        const topic = buildCmdTopic(partNumber, lantai, device)
        const groupName = buildGroupName(lantai, 'S', device)
        const payload = buildPayload(groupName, state)
        const message = JSON.stringify(payload)

        // Setup feedback callback
        const feedbackKey = `${lantai}_${device}`
        const timeout = setTimeout(() => {
            // Timeout after 10 seconds
            feedbackCallbacksRef.current.delete(feedbackKey)
            console.error(`MQTT: Timeout waiting for feedback on ${device}`)
            onFailure?.()
        }, 10000)

        feedbackCallbacksRef.current.set(feedbackKey, {
            device,
            expectedValue: state,
            timeout,
            onSuccess: () => {
                console.log(`MQTT: Control ${device} success`)
                onSuccess?.()
            },
            onFailure: () => {
                console.error(`MQTT: Control ${device} failed`)
                onFailure?.()
            }
        })

        // Publish command
        clientRef.current.publish(topic, message, { qos: 0 }, (err) => {
            if (err) {
                clearTimeout(timeout)
                feedbackCallbacksRef.current.delete(feedbackKey)
                console.error('MQTT: Publish error', err)
                onFailure?.()
            } else {
                console.log(`MQTT: Published to ${topic}`, payload)
            }
        })
    }, [partNumber, lantai])

    // Set intermittent mode
    const setIntermittent = useCallback((device: string, enabled: boolean, onDuration?: number, offDuration?: number) => {
        publishCommand(`ITMEN/${device}`, enabled ? 1 : 0)
        if (onDuration !== undefined) {
            publishCommand(`ITMON/${device}`, onDuration)
        }
        if (offDuration !== undefined) {
            publishCommand(`ITMOFF/${device}`, offDuration)
        }
    }, [publishCommand])

    // Set target temperature mode
    const setTargetTemp = useCallback((device: string, enabled: boolean, value?: number, tolerance?: number) => {
        publishCommand(`TAREN/${device}`, enabled ? 1 : 0)
        if (value !== undefined) {
            publishCommand(`TARVAL/${device}`, value)
        }
        if (tolerance !== undefined) {
            publishCommand(`TARHIS/${device}`, tolerance)
        }
    }, [publishCommand])

    // Set alarm
    const setAlarmEnable = useCallback((type: 'min' | 'max', enabled: boolean) => {
        const topicType = type === 'min' ? 'ALARM/MINEN' : 'ALARM/MAXEN'
        publishCommand(topicType, enabled ? 1 : 0)
    }, [publishCommand])

    // Set alarm value (temperature in 0.1°C units)
    const setAlarmValue = useCallback((type: 'min' | 'max', value: number) => {
        const topicType = type === 'min' ? 'ALARM/MIN' : 'ALARM/MAX'
        publishCommand(topicType, Math.round(value * 10)) // Convert to integer
    }, [publishCommand])

    // Set inverter speed (0-100%)
    const setInverter = useCallback((speed: number, onSuccess?: () => void, onFailure?: () => void) => {
        if (!partNumber || !clientRef.current?.connected) {
            console.warn('MQTT: Not connected or no partNumber')
            onFailure?.()
            return
        }

        const clampedSpeed = Math.max(0, Math.min(100, speed))

        // Setup feedback callback if needed
        if (onSuccess || onFailure) {
            const feedbackKey = `${lantai}_INV`
            const timeout = setTimeout(() => {
                feedbackCallbacksRef.current.delete(feedbackKey)
                console.error(`MQTT: Timeout waiting for feedback on INV`)
                onFailure?.()
            }, 10000)

            feedbackCallbacksRef.current.set(feedbackKey, {
                device: 'INV',
                expectedValue: clampedSpeed,
                timeout,
                onSuccess: () => {
                    console.log(`MQTT: Control INV success`)
                    onSuccess?.()
                },
                onFailure: () => {
                    console.error(`MQTT: Control INV failed`)
                    onFailure?.()
                }
            })
        }

        // Manually build and publish command since publishCommand doesn't support callbacks
        const topic = buildCmdTopic(partNumber, lantai, 'INV/SET')
        const groupName = buildGroupName(lantai, 'S', 'INV/SET') // Uses S usually? Or Device specific?
        // Wait, lines 617-619: helper functions exist.
        // But what GROUP NAME?
        // buildGroupName(lantai, 'S', type)
        // INV/SET ?
        // Usually device like 'B1' has group 'S'.
        // Let's assume 'S' is correct default or verify.
        // Actually buildGroupName logic: `return '${lantai}/${prefix}/${type}'`

        const payload = buildPayload(groupName, clampedSpeed)
        const message = JSON.stringify(payload)

        clientRef.current.publish(topic, message, { qos: 0 }, (err) => {
            if (err) {
                if (onSuccess || onFailure) {
                    const feedbackKey = `${lantai}_INV`
                    const callback = feedbackCallbacksRef.current.get(feedbackKey)
                    if (callback) clearTimeout(callback.timeout)
                    feedbackCallbacksRef.current.delete(feedbackKey)
                }
                console.error('MQTT: Publish error', err)
                onFailure?.()
            } else {
                console.log(`MQTT: Published to ${topic}`, payload)
            }
        })
    }, [partNumber, lantai])

    // Set temperature calibration offset (in 0.1°C units)
    const setCalibration = useCallback((offset: number) => {
        publishCommand('CALVAL/TEMP', Math.round(offset * 10)) // Convert to integer
    }, [publishCommand])

    // Request complete device sync
    const requestSync = useCallback((pn?: string) => {
        const targetPn = pn || partNumber
        if (!targetPn || !clientRef.current?.connected) {
            console.warn('MQTT: Not connected or no partNumber for SYNC')
            return
        }
        // Use buildReqTopic: cmd/{pn}/REQ (no /8883)
        const topic = buildReqTopic(targetPn)
        const payload = {
            type: 'set_var',
            payload: {
                _groupTag: lantai,
                _terminalTime: new Date().toISOString().replace('T', ' ').replace('Z', '').substring(0, 23),
                status: '1'
            }
        }
        clientRef.current.publish(topic, JSON.stringify(payload), { qos: 0 }, (err) => {
            if (err) {
                console.error('MQTT: Sync request error', err)
            } else {
                console.log(`MQTT: Requested sync for ${lantai}`)
            }
        })
    }, [partNumber, lantai])

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.end()
            clientRef.current = null
            setIsConnected(false)
        }
    }, [])

    useEffect(() => {
        connect()
        return () => disconnect()
    }, [connect, disconnect])

    // Reconnect when partNumber or floor changes
    useEffect(() => {
        if (clientRef.current?.connected && partNumber) {
            subscribeToDevice(clientRef.current, partNumber, lantai)
        }
    }, [partNumber, lantai])

    return {
        isConnected,
        lastMessage,
        sensorData,
        deviceStates,
        alarmState,
        inverterState,
        calibrationState,
        syncState,
        error,
        publishCommand,
        controlDevice,
        setIntermittent,
        setTargetTemp,
        setAlarmEnable,
        setAlarmValue,
        setInverter,
        setCalibration,
        requestSync,
        connect,
        disconnect,
        // Helper to get topics
        getDataTopic: (type: string) => partNumber ? buildDataTopic(partNumber, lantai, type) : '',
        getCmdTopic: (type: string) => partNumber ? buildCmdTopic(partNumber, lantai, type) : ''
    }
}

export default useMqtt
