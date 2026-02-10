/**
 * Password Reset Service
 * Real backend integration for password reset functionality
 * Calls actual backend APIs at /api/auth/*
 */

import api from '../api/axios';

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Request password reset — calls POST /api/auth/forgot-password
 */
export const requestPasswordReset = async (
  email: string
): Promise<PasswordResetResponse> => {
  try {
    if (!email || !email.includes('@')) {
      return {
        success: false,
        message: 'Please provide a valid email address',
      };
    }

    const response = await api.post('/auth/forgot-password', { email });
    return {
      success: response.data.success ?? true,
      message: response.data.message || 'Password reset email sent successfully',
    };
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        'Failed to send reset email. Please try again.',
    };
  }
};

/**
 * Validate reset token — calls POST /api/auth/validate-reset-token
 * Falls back gracefully if the endpoint doesn't exist
 */
export const validateResetToken = async (
  token: string
): Promise<{ valid: boolean; message: string; email?: string }> => {
  try {
    const response = await api.post('/auth/validate-reset-token', { token });
    return {
      valid: response.data.valid ?? response.data.success ?? true,
      message: response.data.message || 'Valid reset token',
      email: response.data.email,
    };
  } catch (error: any) {
    // If the endpoint doesn't exist yet, assume token is valid
    // and let the actual reset call validate it
    if (error.response?.status === 404) {
      return {
        valid: true,
        message: 'Token will be validated on reset',
      };
    }
    return {
      valid: false,
      message:
        error.response?.data?.message || 'Unable to validate token',
    };
  }
};

/**
 * Reset password — calls POST /api/auth/reset-password
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long',
      };
    }

    const response = await api.post('/auth/reset-password', {
      token,
      password: newPassword,
    });

    return {
      success: response.data.success ?? true,
      message: response.data.message || 'Password has been reset successfully',
    };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        'Failed to reset password. Please try again.',
    };
  }
};

/**
 * Check if user can request a reset (client-side rate limiting)
 * Uses localStorage to track recent requests
 */
export const canRequestReset = (email: string): boolean => {
  const lastRequestTime = localStorage.getItem(`reset_request_${email}`);

  if (!lastRequestTime) {
    return true;
  }

  const lastRequest = new Date(lastRequestTime).getTime();
  const now = Date.now();
  const cooldownPeriod = 5 * 60 * 1000; // 5 minutes cooldown

  return now - lastRequest > cooldownPeriod;
};

/**
 * Track reset request timestamp for client-side rate limiting
 */
export const trackResetRequest = (email: string): void => {
  localStorage.setItem(`reset_request_${email}`, new Date().toISOString());
};