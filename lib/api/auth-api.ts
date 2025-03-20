/**
 * Auth API Client
 * 
 * Provides client-side functions for interacting with the authentication API endpoints
 */

/**
 * Types for authentication API interactions
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Login failed',
    };
  }

  return {
    success: true,
    user: data.user,
  };
}

/**
 * Register a new user
 */
export async function register(userData: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Registration failed',
    };
  }

  return {
    success: true,
    user: data.user,
  };
}

/**
 * Logout the current user
 */
export async function logout(): Promise<{success: boolean}> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Logout error: ${error}`);
  }
  
  return { success: true };
}