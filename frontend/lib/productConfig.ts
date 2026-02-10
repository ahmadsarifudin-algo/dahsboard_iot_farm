// Product Configuration for Dynamic UI
// Maps product types to their capabilities

export interface ProductConfig {
    name: string
    typeCodes: number[]
    fans: number
    heater: boolean
    cooler: boolean
    inverter: boolean
    tempSensors: number
    humiSensor: boolean
    nh3Sensor: boolean
    windSensor: boolean
    maxFloors: number
    isDiesel: boolean
}

export const PRODUCT_CONFIGS: Record<string, ProductConfig> = {
    CITOUCH_BASIC: {
        name: 'Citouch Basic',
        typeCodes: [115, 125, 135],
        fans: 5,
        heater: true,
        cooler: true,
        inverter: true,
        tempSensors: 1,
        humiSensor: true,
        nh3Sensor: false,
        windSensor: false,
        maxFloors: 3,
        isDiesel: false
    },
    CITOUCH_PLUS: {
        name: 'Citouch Plus',
        typeCodes: [218, 228],
        fans: 8,
        heater: true,
        cooler: true,
        inverter: true,
        tempSensors: 3,
        humiSensor: true,
        nh3Sensor: true,
        windSensor: true,
        maxFloors: 2,
        isDiesel: false
    },
    CITOUCH_LITE: {
        name: 'Citouch Lite',
        typeCodes: [514],
        fans: 4,
        heater: true,
        cooler: false,
        inverter: false,
        tempSensors: 1,
        humiSensor: true,
        nh3Sensor: false,
        windSensor: false,
        maxFloors: 1,
        isDiesel: false
    },
    CI_SENSE: {
        name: 'Ci Sense',
        typeCodes: [0], // Placeholder - will match by type string
        fans: 0,
        heater: false,
        cooler: false,
        inverter: false,
        tempSensors: 1,
        humiSensor: true,
        nh3Sensor: true,
        windSensor: false,
        maxFloors: 2,
        isDiesel: false
    },
    CI_DIESEL: {
        name: 'Ci Diesel',
        typeCodes: [624],
        fans: 1,
        heater: true,
        cooler: true,
        inverter: true,
        tempSensors: 1,
        humiSensor: true,
        nh3Sensor: true,
        windSensor: true,
        maxFloors: 2,
        isDiesel: true
    }
}

// Diesel-specific configuration
export interface DieselUnit {
    id: number
    name: string
    // Monitoring
    odoH: number      // Operating hours
    rpm: number
    fuelLevel: number // Percentage
    batteryVolt: number
    coolantOk: boolean
    oilPressOk: boolean
    // Status
    isOn: boolean
}

export interface DieselControl {
    // Basic
    enabled: boolean
    targetRpm: number
    // Intermittent On/Off
    intermittent: {
        enabled: boolean
        onDuration: number
        offDuration: number
    }
    // Intermittent RPM (Low/High)
    intermittentRpm: {
        enabled: boolean
        lowRpm: number
        highRpm: number
        lowDuration: number
        highDuration: number
    }
    // Target Mode
    target: {
        enabled: boolean
        targetTemp: number
        rpmMax: number
        rpmMin: number
        deltaTemp: number
        deltaRpm: number
        tempReference: 'avg' | 'top' | 'bottom'
    }
}

export const DIESEL_UNITS_PER_FLOOR = 4

export const DEFAULT_DIESEL_UNIT: DieselUnit = {
    id: 1,
    name: 'Diesel 1',
    odoH: 0,
    rpm: 0,
    fuelLevel: 100,
    batteryVolt: 12.6,
    coolantOk: true,
    oilPressOk: true,
    isOn: false
}

export const DEFAULT_DIESEL_CONTROL: DieselControl = {
    enabled: false,
    targetRpm: 1500,
    intermittent: {
        enabled: false,
        onDuration: 30,
        offDuration: 30
    },
    intermittentRpm: {
        enabled: false,
        lowRpm: 1000,
        highRpm: 2000,
        lowDuration: 30,
        highDuration: 30
    },
    target: {
        enabled: false,
        targetTemp: 28,
        rpmMax: 2500,
        rpmMin: 800,
        deltaTemp: 2,
        deltaRpm: 100,
        tempReference: 'avg'
    }
}

/**
 * Get product config by typeCode
 */
export function getProductConfig(typeCode: number): ProductConfig {
    for (const config of Object.values(PRODUCT_CONFIGS)) {
        if (config.typeCodes.includes(typeCode)) {
            return config
        }
    }
    // Default to Citouch Basic if not found
    return PRODUCT_CONFIGS.CITOUCH_BASIC
}

/**
 * Get product config by type string (e.g., "CI Sense", "SmartFarm")
 */
export function getProductConfigByType(type: string): ProductConfig {
    const typeLower = type.toLowerCase()

    if (typeLower.includes('sense')) {
        return PRODUCT_CONFIGS.CI_SENSE
    }
    if (typeLower.includes('diesel') || typeLower.includes('624') || typeLower.includes('touch624') || typeLower.includes('ci-touch624')) {
        return PRODUCT_CONFIGS.CI_DIESEL
    }
    if (typeLower.includes('lite') || typeLower.includes('514')) {
        return PRODUCT_CONFIGS.CITOUCH_LITE
    }
    if (typeLower.includes('plus') || typeLower.includes('218') || typeLower.includes('228')) {
        return PRODUCT_CONFIGS.CITOUCH_PLUS
    }

    // Default to basic
    return PRODUCT_CONFIGS.CITOUCH_BASIC
}
