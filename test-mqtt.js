/**
 * MQTT Connection Test Script
 * 
 * Tests MQTT connection to broker.chickinindonesia.com
 * and subscribes to device topics
 * 
 * Usage: node test-mqtt.js
 */

const mqtt = require('mqtt')

// Configuration
const config = {
    broker: 'broker.chickinindonesia.com',
    wsPort: 8083,
    wssPort: 8084,
    username: 'dashboard',
    password: 'dashboard@123',
    // Test device
    partNumber: '6833459276185437281',
    lantai: 'Lantai1'
}

// Build topics
const buildDataTopic = (type) => `data/${config.partNumber}/${config.lantai}/${type}/8883`
const buildCmdTopic = (type) => `cmd/${config.partNumber}/${config.lantai}/X/${type}/8883`

// Build payload
const buildPayload = (groupName, status) => ({
    _terminalTime: new Date().toISOString().replace('T', ' ').replace('Z', '').substring(0, 23),
    _groupName: groupName,
    status: status.toString()
})

console.log('='.repeat(60))
console.log('MQTT Connection Test')
console.log('='.repeat(60))
console.log(`Broker: wss://${config.broker}:${config.wssPort}/mqtt`)
console.log(`Part Number: ${config.partNumber}`)
console.log(`Lantai: ${config.lantai}`)
console.log('='.repeat(60))

// Connect
const client = mqtt.connect(`wss://${config.broker}:${config.wssPort}/mqtt`, {
    username: config.username,
    password: config.password,
    clientId: `test_${Math.random().toString(16).slice(2, 10)}`,
    protocolVersion: 5, // MQTT v5
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    keepalive: 60,
    rejectUnauthorized: false
})

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker!')
    console.log('')

    // Subscribe to topics
    const topics = [
        buildDataTopic('SENSOR/TEMP'),
        buildDataTopic('SENSOR/HUMI'),
        buildDataTopic('B1'),
        buildDataTopic('B2'),
        buildDataTopic('H'),
        buildDataTopic('C'),
        buildDataTopic('ITMEN/B1'),
        buildDataTopic('TAREN/B1'),
    ]

    console.log('Subscribing to topics:')
    topics.forEach(topic => {
        client.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
                console.log(`  ❌ ${topic}`)
            } else {
                console.log(`  ✅ ${topic}`)
            }
        })
    })

    console.log('')
    console.log('Waiting for messages... (Press Ctrl+C to exit)')
    console.log('-'.repeat(60))

    // Test publish after 3 seconds
    setTimeout(() => {
        console.log('')
        console.log('📤 Testing publish command...')
        const topic = buildCmdTopic('B1')
        const payload = buildPayload('L1_S_B1', '1')
        console.log(`  Topic: ${topic}`)
        console.log(`  Payload: ${JSON.stringify(payload)}`)

        client.publish(topic, JSON.stringify(payload), { qos: 0 }, (err) => {
            if (err) {
                console.log('  ❌ Publish failed:', err.message)
            } else {
                console.log('  ✅ Publish successful!')
            }
        })
        console.log('-'.repeat(60))
    }, 3000)
})

client.on('message', (topic, message) => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`\n📥 [${timestamp}] Message received:`)
    console.log(`  Topic: ${topic}`)
    try {
        const payload = JSON.parse(message.toString())
        console.log(`  Payload: ${JSON.stringify(payload, null, 2)}`)
    } catch {
        console.log(`  Payload: ${message.toString()}`)
    }
})

client.on('error', (err) => {
    console.log('❌ MQTT Error:', err.message)
})

client.on('close', () => {
    console.log('🔌 Connection closed')
})

client.on('reconnect', () => {
    console.log('🔄 Reconnecting...')
})

// Handle exit
process.on('SIGINT', () => {
    console.log('\n\nClosing connection...')
    client.end()
    process.exit(0)
})
