// Test IoT API - List Kandang By User
// Run with: node test-list-kandang.js

const IOT_BASE_URL = 'https://prod-iot.chickinindonesia.com';

// Token dari login sebelumnya
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJjb21wYW55Ijp7ImlkIjoiMiIsIm5hbWUiOiJQVCBDSElDS0lOIFNBSEFCQVQgUEVURVJOQUsifSwiaWRPZG9vIjoiOTIzMSIsImltYWdlIjpudWxsLCJwcm92aW5jZSI6eyJfaWQiOiI2MjM5YmY0NDYyOTdkZTBiZjk0ZjIwN2UiLCJjb2RlIjoiMzQiLCJuYW1lIjoiREFFUkFIIElTVElNRVdBIFlPR1lBS0FSVEEifSwicmVnZW5jeSI6eyJfaWQiOiI2MjM5YmY1YzYyOTdkZTBiZjk0ZjIxNzYiLCJjb2RlIjoiMzQwNCIsImNvZGVfcHJvdmluY2UiOiIzNCIsIm5hbWUiOiJLQUJVUEFURU4gU0xFTUFOIn0sImlzUFBMQWN0aXZlIjpudWxsLCJpc1BsYXNtYSI6ZmFsc2UsInRva2VuRXhwaXJlZEF0IjoiMjAyNi0wMS0yOVQxNjoxMzo0MS41NjVaIiwiX2lkIjoiNjk3ODYyZjY4MmZhNTIwMDI3MDJlMTU2IiwiZnVsbG5hbWUiOiJTVE4iLCJ1c2VybmFtZSI6InNvbHVzaXRlcm5hazEyMyIsImVtYWlsIjoiYWFuaGFzeWltMTYwNkBnbWFpbC5jb20iLCJwaG9uZU51bWJlciI6ODUxMjI3Njk3MTIsInJvbGUiOnsiX2lkIjoiNjFkNTYwOGQ0YTdiYTViMDVjOWM3YWU0IiwibmFtZSI6InBldGVybmFrIiwiZGVzYyI6IlBldGVybmFrIn19.h8U3bdZy6sLc3kRD6eURFnmqtXFyftE0q7lvE7PGYbA';

async function testListKandang() {
    console.log('='.repeat(60));
    console.log('TEST IoT API - List Kandang By User');
    console.log('='.repeat(60));
    console.log('URL:', `${IOT_BASE_URL}/api/iot/v2/shed/user`);
    console.log('Method: GET');
    console.log('Token (first 50 chars):', AUTH_TOKEN.substring(0, 50) + '...');
    console.log('='.repeat(60));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${IOT_BASE_URL}/api/iot/v2/shed/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Status Code:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('-'.repeat(60));

        const text = await response.text();

        try {
            const data = JSON.parse(text);
            console.log('Response:');
            console.log(JSON.stringify(data, null, 2));

            if (response.ok) {
                console.log('-'.repeat(60));
                console.log('✅ SUCCESS!');

                // Analyze response structure
                if (Array.isArray(data)) {
                    console.log(`Total Kandang: ${data.length}`);
                    if (data.length > 0) {
                        console.log('\nFirst Kandang Fields:');
                        Object.keys(data[0]).forEach(key => {
                            console.log(`  - ${key}: ${typeof data[0][key]}`);
                        });
                    }
                } else if (data.data && Array.isArray(data.data)) {
                    console.log(`Total Kandang: ${data.data.length}`);
                    if (data.data.length > 0) {
                        console.log('\nFirst Kandang Fields:');
                        Object.keys(data.data[0]).forEach(key => {
                            console.log(`  - ${key}: ${typeof data.data[0][key]}`);
                        });
                    }
                }
            } else {
                console.log('-'.repeat(60));
                console.log('❌ FAILED!');
                if (data.message) console.log('Message:', data.message);
                if (data.errors) console.log('Errors:', data.errors);
            }
        } catch (e) {
            console.log('Raw Response:', text.substring(0, 500));
        }

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.log('❌ TIMEOUT: Request exceeded 15 seconds');
        } else {
            console.log('❌ ERROR:', error.message);
        }
    }

    console.log('='.repeat(60));
}

testListKandang();
