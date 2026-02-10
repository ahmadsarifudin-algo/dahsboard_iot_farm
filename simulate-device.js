
const mqtt = require('mqtt')

// Config
const BROKER_URL = 'wss://broker.chickinindonesia.com:8084/mqtt'
const USERNAME = 'dashboard'
const PASSWORD = 'dashboardpassword2023'

const client = mqtt.connect(BROKER_URL, {
    username: USERNAME,
    password: PASSWORD,
    protocolVersion: 5,
    keepalive: 60,
    rejectUnauthorized: false,
    clientId: 'simulator_' + Math.random().toString(16).substr(2, 8)
})

client.on('connect', () => {
    console.log('✅ DEVICE SIMULATOR Connected!')
    client.subscribe('cmd/#', (err) => {
        if (err) console.error('Subscription error:', err)
        else console.log('✅ Subscribed to cmd/#')
    })
})

client.on('message', (topic, message) => {
    console.log('\n📩 RECEIVED COMMAND:', topic)
    console.log('Payload:', message.toString())

    const parts = topic.split('/')
    // Support TWO formats:
    // 1. cmd/{pn}/{lantai}/X/{device}/8883 (for B1-B5, H, C)
    // 2. cmd/{pn}/{lantai}/{device}/8883 (for INV, ALARM, CALVAL)

    if (parts[0] === 'cmd') {
        let pn, lantai, device

        // Check if topic has /X/
        if (parts[3] === 'X') {
            // Format: cmd/{pn}/{lantai}/X/{device}/8883
            pn = parts[1]
            lantai = parts[2]
            device = parts[4]
        } else {
            // Format: cmd/{pn}/{lantai}/{device}/...
            pn = parts[1]
            lantai = parts[2]
            device = parts[3]
        }

        let msgObj
        try {
            msgObj = JSON.parse(message.toString())
        } catch (e) {
            console.error('Failed to parse payload')
            return
        }

        // Handle nested payload struct if needed, or direct status
        let status
        if (msgObj.payload && msgObj.payload.status) {
            status = msgObj.payload.status
        } else {
            status = msgObj.status
        }

        // Log "Processing" only if it's one of our target devices to reduce noise
        const targetDevices = ['INV', 'H', 'C', 'B1', 'B2', 'B3', 'B4', 'B5', 'ALARM', 'CALVAL']

        if (targetDevices.includes(device)) {
            console.log(`Processing ${device} -> ${status}...`)
        } else {
            return
        }

        setTimeout(() => {
            // Construct reply topic
            // Standard: data/{pn}/{lantai}/{device}/8883

            let replyDevice = device

            // Special handling for compound types (ALARM/MIN, INV/SET, etc)
            // If command was ALARM/MIN: parts might be [..., 'ALARM', 'MIN', '8883']
            // Check if next part after device is not '8883'

            const deviceIndex = parts[3] === 'X' ? 4 : 3
            const nextPart = parts[deviceIndex + 1]

            if (nextPart && nextPart !== '8883') {
                replyDevice = `${device}/${nextPart}`
            }

            const replyTopic = `data/${pn}/${lantai}/${replyDevice}/8883`

            const replyPayload = JSON.stringify({
                status: status,
                _groupName: msgObj._groupName || `${lantai.replace('Lantai', 'L')}_S_${device}`,
                _terminalTime: new Date().toISOString()
            })

            console.log(`📤 SENDING REPLY:`, replyTopic)
            console.log(`Payload:`, replyPayload)

            client.publish(replyTopic, replyPayload, { qos: 0 }, (err) => {
                if (err) console.error('Publish error:', err)
                else console.log('✅ Reply sent!')
            })

        }, 1000) // 1 second delay
    }
})

client.on('error', (err) => {
    console.error('Connection error:', err)
})
