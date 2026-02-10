'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from './store'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null)
    const { setWsConnected, updateDeviceStatus, addAlarm, setStats } = useStore()

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        const ws = new WebSocket(WS_URL)

        ws.onopen = () => {
            console.log('WebSocket connected')
            setWsConnected(true)

            // Subscribe to all events
            ws.send(JSON.stringify({ action: 'subscribe', topics: ['all'] }))
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                handleMessage(data)
            } catch (err) {
                console.error('WebSocket message parse error:', err)
            }
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected')
            setWsConnected(false)

            // Reconnect after 3 seconds
            setTimeout(connect, 3000)
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        wsRef.current = ws
    }, [setWsConnected])

    const handleMessage = useCallback((data: { type: string; payload: any }) => {
        switch (data.type) {
            case 'status':
                updateDeviceStatus(data.payload.device_id, data.payload.status)
                break

            case 'alarm':
                addAlarm(data.payload)
                break

            case 'stats':
                setStats(data.payload)
                break

            case 'telemetry':
                // Telemetry handled by charts/device detail page
                // Could dispatch to specific device subscribers
                break

            default:
                console.log('Unknown WebSocket event:', data.type)
        }
    }, [updateDeviceStatus, addAlarm, setStats])

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
    }, [])

    useEffect(() => {
        connect()
        return () => disconnect()
    }, [connect, disconnect])

    return {
        isConnected: useStore((state) => state.wsConnected),
        send: (data: object) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(data))
            }
        },
    }
}
