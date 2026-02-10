// Test API Flow: Login -> List Kandang
// Run with: node test-api-flow.js

const AUTH_BASE_URL = 'https://auth.chickinindonesia.com';
const IOT_BASE_URL = 'https://prod-iot.chickinindonesia.com';

// Credentials
const USERNAME = 'aanhasyim1606@gmail.com';
const PASSWORD = 'stn12345678';
const METHOD = 'Email';

async function login() {
    console.log('='.repeat(60));
    console.log('STEP 1: LOGIN');
    console.log('='.repeat(60));

    const basicAuth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    console.log('URL:', `${AUTH_BASE_URL}/auth/v1/login`);
    console.log('Username:', USERNAME);
    console.log('Method:', METHOD);
    console.log('-'.repeat(60));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${AUTH_BASE_URL}/auth/v1/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`
            },
            body: JSON.stringify({ method: METHOD }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Status:', response.status, response.statusText);

        const data = await response.json();

        if (data.data?.token) {
            console.log('✅ Login SUCCESS!');
            console.log('Token (first 50 chars):', data.data.token.substring(0, 50) + '...');
            return data.data.token;
        } else {
            console.log('❌ Login FAILED!');
            console.log('Response:', JSON.stringify(data, null, 2));
            return null;
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.log('❌ TIMEOUT');
        } else {
            console.log('❌ ERROR:', error.message);
        }
        return null;
    }
}

async function listKandang(token) {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('STEP 2: LIST KANDANG');
    console.log('='.repeat(60));

    console.log('URL:', `${IOT_BASE_URL}/api/iot/v2/shed/user`);
    console.log('Method: GET');
    console.log('-'.repeat(60));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${IOT_BASE_URL}/api/iot/v2/shed/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Status:', response.status, response.statusText);
        console.log('-'.repeat(60));

        const text = await response.text();

        try {
            const data = JSON.parse(text);
            console.log('Response:');
            console.log(JSON.stringify(data, null, 2));

            if (response.ok) {
                console.log('-'.repeat(60));
                console.log('✅ List Kandang SUCCESS!');

                // Analyze structure
                let kandangList = Array.isArray(data) ? data : (data.data || []);
                console.log(`Total Kandang: ${kandangList.length}`);

                if (kandangList.length > 0) {
                    console.log('\nKandang Fields:');
                    Object.keys(kandangList[0]).forEach(key => {
                        const val = kandangList[0][key];
                        const type = Array.isArray(val) ? 'array' : typeof val;
                        console.log(`  - ${key}: ${type}`);
                    });

                    console.log('\nKandang List:');
                    kandangList.forEach((k, i) => {
                        console.log(`  ${i + 1}. ${k.name || k.nama || 'Unknown'} - ${k.address || k.alamat || ''}`);
                    });
                }
            } else {
                console.log('-'.repeat(60));
                console.log('❌ List Kandang FAILED!');
            }
        } catch (e) {
            console.log('Raw Response:', text.substring(0, 1000));
        }

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.log('❌ TIMEOUT: Request exceeded 30 seconds');
        } else {
            console.log('❌ ERROR:', error.message);
        }
    }

    console.log('='.repeat(60));
}

async function main() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           API FLOW TEST: Login -> List Kandang             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Step 1: Login
    const token = await login();

    if (!token) {
        console.log('\n❌ Cannot proceed without token. Exiting.');
        return;
    }

    // Step 2: List Kandang
    await listKandang(token);

    console.log('\n✅ API Flow Test Complete!');
}

main();
