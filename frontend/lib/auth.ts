// Auth Service - Handles authentication with Chickin Auth API
const AUTH_BASE_URL = 'https://auth.chickinindonesia.com';

export interface LoginResponse {
    data?: {
        token: string;
    };
    message: string;
    errors?: Array<{
        code?: number;
        message: string;
        type: string;
    }>;
}

export interface User {
    _id: string;
    fullname: string;
    username: string;
    email: string;
    phoneNumber?: number;
    role: {
        _id: string;
        name: string;
        desc: string;
    };
    company?: {
        id: string;
        name: string;
    };
    province?: {
        _id: string;
        code: string;
        name: string;
    };
    regency?: {
        _id: string;
        code: string;
        name: string;
    };
    image?: {
        _id: string;
        path: string;
    } | null;
}

export type LoginMethod = 'Email' | 'Username' | 'Phone';

class AuthService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = AUTH_BASE_URL;
    }

    // Login with Basic Auth + Method
    async login(identifier: string, password: string, method: LoginMethod = 'Email'): Promise<LoginResponse> {
        // Create Basic Auth header
        const basicAuth = btoa(`${identifier}:${password}`);

        const response = await fetch(`${this.baseUrl}/auth/v1/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`
            },
            body: JSON.stringify({ method })
        });

        const data = await response.json();
        return data;
    }

    // Logout
    async logout(): Promise<void> {
        const token = this.getToken();
        if (token) {
            try {
                await fetch(`${this.baseUrl}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        this.clearToken();
    }

    // Get current user from token
    async getCurrentUser(): Promise<User | null> {
        const token = this.getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${this.baseUrl}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.data;
            }
            return null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    // Token management
    saveToken(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
        }
    }

    getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auth_token');
        }
        return null;
    }

    clearToken(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
        }
    }

    // User data management
    saveUser(user: User): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('user_data', JSON.stringify(user));
        }
    }

    getUser(): User | null {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user_data');
            if (userData) {
                try {
                    return JSON.parse(userData);
                } catch {
                    return null;
                }
            }
        }
        return null;
    }

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    // Decode JWT token to get user info
    decodeToken(token: string): User | null {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Token decode error:', error);
            return null;
        }
    }
}

export const authService = new AuthService();
export default authService;
