// Test Login API Script - Basic Auth + Method Body
// Run with: node test-login.js

const testLogin = async () => {
    const url = 'https://auth.chickinindonesia.com/auth/v1/login';
    const username = 'aanhasyim1606@gmail.com';
    const password = 'stn12345678';

    // Basic Auth = Base64(username:password)
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    // Method: "Username", "Phone", atau "Email"
    const method = 'Email';

    console.log('='.repeat(50));
    console.log('TEST LOGIN API (Basic Auth + Method)');
    console.log('='.repeat(50));
    console.log('URL:', url);
    console.log('Username:', username);
    console.log('Method:', method);
    console.log('Auth Header:', `Basic ${basicAuth.substring(0, 20)}...`);
    console.log('Timeout: 10 seconds');
    console.log('='.repeat(50));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`
            },
            body: JSON.stringify({ method }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Status Code:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('-'.repeat(50));

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
            console.log('Response:');
            console.log(JSON.stringify(data, null, 2));

            if (data.token) {
                console.log('-'.repeat(50));
                console.log('✅ LOGIN SUCCESS!');
                console.log('Token (first 80 chars):', data.token.substring(0, 80) + '...');
                if (data.user) {
                    console.log('-'.repeat(50));
                    console.log('User Info:');
                    console.log('  ID:', data.user._id);
                    console.log('  Username:', data.user.username);
                    console.log('  Email:', data.user.email);
                }
            } else if (data.errors) {
                console.log('-'.repeat(50));
                console.log('❌ LOGIN FAILED!');
                data.errors.forEach(err => {
                    console.log('  Message:', err.message);
                    console.log('  Type:', err.type);
                });
            } else if (data.message && data.message !== 'success' && !data.token) {
                console.log('-'.repeat(50));
                console.log('❌ LOGIN FAILED!');
                console.log('Message:', data.message);
            }
        } catch (e) {
            console.log('Raw Response:', text);
        }

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.log('❌ TIMEOUT: Request exceeded 10 seconds');
        } else {
            console.log('❌ ERROR:', error.message);
        }
    }

    console.log('='.repeat(50));
};

testLogin();
