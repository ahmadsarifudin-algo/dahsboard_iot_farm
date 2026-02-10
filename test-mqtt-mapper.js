/**
 * MQTT Topic Mapper Script
 * 
 * Subscribe to ALL topics for a device using wildcards:
 * - data/6833459276185437281/#
 * - cmd/6833459276185437281/#
 * 
 * Usage: node test-mqtt-mapper.js
 */

const mqtt = require('mqtt')

// Configuration
const config = {
    broker: 'broker.chickinindonesia.com',
    wssPort: 8084,
    username: 'dashboard',
    password: 'dashboard@123',
    partNumber: '6833459276185437281'
}

console.log('='.repeat(70))
console.log('MQTT Topic Mapper - Subscribe to ALL topics')
console.log('='.repeat(70))
console.log(`Broker: wss://${config.broker}:${config.wssPort}/mqtt`)
console.log(`Part Number: ${config.partNumber}`)
console.log('='.repeat(70))

// Connect
const client = mqtt.connect(`wss://${config.broker}:${config.wssPort}/mqtt`, {
    username: config.username,
    password: config.password,
    clientId: `mapper_${Math.random().toString(16).slice(2, 10)}`,
    protocolVersion: 5,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    keepalive: 60,
    rejectUnauthorized: false
})

// Track discovered topics
const discoveredTopics = new Map()

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker!')
    console.log('')

    // Subscribe to wildcard topics
    const wildcardTopics = [
        `data/${config.partNumber}/#`,
        `cmd/${config.partNumber}/#`
    ]

    console.log('Subscribing to wildcard topics:')
    wildcardTopics.forEach(topic => {
        client.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
                console.log(`  ❌ ${topic}`)
            } else {
                console.log(`  ✅ ${topic}`)
            }
        })
    })

    console.log('')
    console.log('Waiting for messages... (Press Ctrl+C to see summary)')
    console.log('-'.repeat(70))
})

client.on('message', (topic, message) => {
    const timestamp = new Date().toLocaleTimeString()

    // Track topic
    if (!discoveredTopics.has(topic)) {
        discoveredTopics.set(topic, { count: 0, lastPayload: null })
        console.log(`\n🆕 NEW TOPIC DISCOVERED: ${topic}`)
    }

    const topicData = discoveredTopics.get(topic)
    topicData.count++

    try {
        const payload = JSON.parse(message.toString())
        topicData.lastPayload = payload
        console.log(`📥 [${timestamp}] ${topic}`)
        console.log(`   Payload: ${JSON.stringify(payload)}`)
    } catch {
        topicData.lastPayload = message.toString()
        console.log(`📥 [${timestamp}] ${topic}`)
        console.log(`   Payload: ${message.toString()}`)
    }
})

client.on('error', (err) => {
    console.log('❌ MQTT Error:', err.message)
})

client.on('close', () => {
    console.log('🔌 Connection closed')
})

// Handle exit - show summary
process.on('SIGINT', () => {
    console.log('\n\n')
    console.log('='.repeat(70))
    console.log('TOPIC SUMMARY')
    console.log('='.repeat(70))

    const sortedTopics = Array.from(discoveredTopics.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    console.log(`\nTotal unique topics discovered: ${sortedTopics.length}\n`)

    sortedTopics.forEach(([topic, data]) => {
        console.log(`📌 ${topic}`)
        console.log(`   Messages: ${data.count}`)
        if (data.lastPayload) {
            console.log(`   Last: ${JSON.stringify(data.lastPayload)}`)
        }
        console.log('')
    })

    console.log('='.repeat(70))
    client.end()
    process.exit(0)
})
