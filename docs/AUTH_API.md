# Auth Service API Documentation

## Base URL
```
https://auth.chickinindonesia.com/
```

## Endpoints

### Authentication

| Endpoint | Method | URL | Trigger |
|----------|--------|-----|---------|
| Login | POST | `/auth/v1/login` | Button Login |
| Logout | POST | `/auth/v1/logout` | Button Logout on Profile Page |
| Register | POST | `/api/signup` | Button "Buat Akun" on Register Page |
| Forgot Password | POST | `/api/users/forgot` | Link "Lupa Password" on Login Page |

### User Management

| Endpoint | Method | URL | Trigger |
|----------|--------|-----|---------|
| Get Current User | PUT | `/api/users/me` | When user opens Home Page (Halaman List Kandang) |
| Edit User | POST | `/api/users/:userId` | Save Button on Change Profile Page |
| Update FCM Token | PUT | `/api/users/:userId` | When user opens Home Page (Halaman List Kandang) |
| Add User Image | POST | `/api/user-image/upload` | Save Button on Change Profile Page |

### Location Data

| Endpoint | Method | URL | Trigger |
|----------|--------|-----|---------|
| Get Province List | GET | `/province` | When user opens Province List Page |
| Get Regency List | GET | `/regency` | When user opens Regency List Page |

---

## Login API Detail (Verified ✅)

### Authentication Method: HTTP Basic Auth + JSON Body

Login menggunakan kombinasi:
1. **HTTP Basic Auth** di header untuk credentials
2. **JSON Body** untuk menentukan method login

### Request Format

```javascript
// Method 1: Login dengan Email
const basicAuth = btoa('email@example.com:password123');

fetch('https://auth.chickinindonesia.com/auth/v1/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
    },
    body: JSON.stringify({
        method: 'Email'
    })
});
```

```javascript
// Method 2: Login dengan Username
const basicAuth = btoa('username123:password123');

fetch('https://auth.chickinindonesia.com/auth/v1/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
    },
    body: JSON.stringify({
        method: 'Username'
    })
});
```

```javascript
// Method 3: Login dengan Phone Number
const basicAuth = btoa('08123456789:password123');

fetch('https://auth.chickinindonesia.com/auth/v1/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
    },
    body: JSON.stringify({
        method: 'Phone'
    })
});
```

### Important Notes:
- `btoa()` = Base64 encode di browser
- `Buffer.from().toString('base64')` = Base64 encode di Node.js
- Format: `Basic base64(username:password)`

---

## Response Examples

### Success (200)
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJjb21wYW55Ijp7ImlkIjoiMiIsIm5hbWUiOiJQVCBDSElDS0lOIn0..."
  },
  "message": "success"
}
```

### Token Payload (Decoded)
```json
{
  "_id": "697862f682fa52002702e156",
  "fullname": "STN",
  "username": "solusiternak123",
  "email": "aanhasyim1606@gmail.com",
  "phoneNumber": 8512276712,
  "role": {
    "_id": "61d5608d4a7ba5b05c9c7ae4",
    "name": "peternak",
    "desc": "Peternak"
  },
  "company": {
    "id": "2",
    "name": "PT CHICKIN SAHABAT PETERNAK"
  },
  "province": {
    "code": "34",
    "name": "DAERAH ISTIMEWA YOGYAKARTA"
  },
  "regency": {
    "code": "3404",
    "name": "KABUPATEN SLEMAN"
  }
}
```

---

## Error Responses

### Method Required (400)
```json
{
  "message": "Bad Request",
  "errors": [
    {
      "message": "Method is required, please choose method between Phone, Username, or Email",
      "type": "ValidationException"
    }
  ]
}
```

### Wrong Password (422)
```json
{
  "errors": [
    {
      "code": 1024,
      "message": "Password salah",
      "type": "AuthException"
    }
  ]
}
```

### Username/Email Not Found (422)
```json
{
  "errors": [
    {
      "code": 1023,
      "message": "Username / phone number tidak terdaftar",
      "type": "AuthException"
    }
  ]
}
```

### Unauthorized (401)
```json
Unauthorized
```
Terjadi ketika tidak mengirim Authorization header atau format Basic Auth salah.

---

## Test Script

File: `test-login.js`

```javascript
const testLogin = async () => {
    const url = 'https://auth.chickinindonesia.com/auth/v1/login';
    const username = 'aanhasyim1606@gmail.com';
    const password = 'stn12345678';
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`
        },
        body: JSON.stringify({ method: 'Email' })
    });

    const data = await response.json();
    console.log(data);
};

testLogin();
```

Run with: `node test-login.js`
