import axios from 'axios';
import { supabase } from '../supabaseClient';
import type { AuthUser } from '../types';

// Types for request/response
interface SignupRequest {
  email: string;
  password: string;
  username: string;
  signature_image_data_url: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  data?: {
    user?: AuthUser;
    session?: any;
  };
  error?: string;
}

/**
 * Register a new user using the auth_signup Edge Function
 */
export async function registerUser(userData: SignupRequest): Promise<AuthResponse> {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/auth_signup`,
      userData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      }
    );
    
    return { data: response.data.data };
  } catch (error) {
    console.error('Registration error:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data.error || 'Failed to register user' };
    }
    return { error: 'An unexpected error occurred during registration' };
  }
}

/**
 * Login a user using the auth_login Edge Function
 */
export async function loginUser(credentials: LoginRequest): Promise<AuthResponse> {
  try {
    console.log('Sending login request to:', `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/auth_login`);
    
    const response = await axios.post(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/auth_login`,
      credentials,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      }
    );
    
    console.log('Login API response:', response.data);
    
    // Also update the local session with Supabase client
    if (response.data && response.data.session) {
      // Set the session in the Supabase client
      const { data: authData } = await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token
      });
      
      console.log('Supabase session set:', authData);
    }
    
    return { data: response.data.data };
  } catch (error) {
    console.error('Login error details:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data.error || 'Failed to login' };
    }
    return { error: 'An unexpected error occurred during login' };
  }
}

/**
 * Logout a user using the auth_logout Edge Function
 */
export async function logoutUser(): Promise<AuthResponse> {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/auth_logout`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      }
    );
    
    // Also sign out locally using the Supabase client
    await supabase.auth.signOut();
    
    return { data: null };
  } catch (error) {
    console.error('Logout error:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data.error || 'Failed to logout' };
    }
    return { error: 'An unexpected error occurred during logout' };
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user;
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  return await supabase.auth.signOut();
}