// Error handling utilities for authentication and general app errors

export interface AppError {
    code: string;
    message: string;
    userMessage: string;
    retryable: boolean;
    action?: 'retry' | 'resend' | 'contact_support' | 'refresh_page';
}

// Authentication error codes and messages
export const AUTH_ERRORS = {
    // OTP Errors
    INVALID_OTP: {
        code: 'INVALID_OTP',
        message: 'Invalid or expired verification code',
        userMessage: 'The verification code is invalid or has expired. Please try again or request a new code.',
        retryable: true,
        action: 'resend' as const,
    },
    OTP_EXPIRED: {
        code: 'OTP_EXPIRED',
        message: 'Verification code has expired',
        userMessage: 'Your verification code has expired. Please request a new one.',
        retryable: true,
        action: 'resend' as const,
    },
    TOO_MANY_ATTEMPTS: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed verification attempts',
        userMessage: 'Too many failed attempts. Please wait before trying again or request a new code.',
        retryable: true,
        action: 'resend' as const,
    },

    // Rate Limiting
    RATE_LIMITED: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        userMessage: 'Too many requests. Please wait a moment before trying again.',
        retryable: true,
        action: 'retry' as const,
    },
    COOLDOWN_ACTIVE: {
        code: 'COOLDOWN_ACTIVE',
        message: 'Cooldown period active',
        userMessage: 'Please wait before requesting another verification code.',
        retryable: true,
        action: 'retry' as const,
    },

    // Email Delivery
    EMAIL_DELIVERY_FAILED: {
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'Failed to send verification email',
        userMessage: 'We couldn\'t send the verification email. Please check your email address and try again.',
        retryable: true,
        action: 'retry' as const,
    },
    INVALID_EMAIL: {
        code: 'INVALID_EMAIL',
        message: 'Invalid email address',
        userMessage: 'Please enter a valid email address.',
        retryable: false,
    },

    // Network Errors
    NETWORK_ERROR: {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        userMessage: 'Connection error. Please check your internet connection and try again.',
        retryable: true,
        action: 'retry' as const,
    },
    TIMEOUT: {
        code: 'TIMEOUT',
        message: 'Request timeout',
        userMessage: 'The request timed out. Please try again.',
        retryable: true,
        action: 'retry' as const,
    },

    // Server Errors
    SERVER_ERROR: {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        userMessage: 'Something went wrong on our end. Please try again in a moment.',
        retryable: true,
        action: 'retry' as const,
    },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        userMessage: 'The service is temporarily unavailable. Please try again later.',
        retryable: true,
        action: 'retry' as const,
    },

    // User Account Errors
    USER_NOT_FOUND: {
        code: 'USER_NOT_FOUND',
        message: 'User account not found',
        userMessage: 'No account found with this email address. Please sign up first.',
        retryable: false,
    },
    ACCOUNT_DISABLED: {
        code: 'ACCOUNT_DISABLED',
        message: 'User account is disabled',
        userMessage: 'Your account has been disabled. Please contact support for assistance.',
        retryable: false,
        action: 'contact_support' as const,
    },

    // Generic
    UNKNOWN_ERROR: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        userMessage: 'Something unexpected happened. Please try again or contact support if the problem persists.',
        retryable: true,
        action: 'retry' as const,
    },
} as const;

// Error classification function
export const classifyError = (error: unknown): AppError => {
    const errorMessage = (error as Error)?.message?.toLowerCase() || '';
    const errorCode = (error as any)?.code || '';

    // Supabase specific error handling
    if (errorMessage.includes('invalid') && errorMessage.includes('token')) {
        return AUTH_ERRORS.INVALID_OTP;
    }
    if (errorMessage.includes('expired')) {
        return AUTH_ERRORS.OTP_EXPIRED;
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        return AUTH_ERRORS.RATE_LIMITED;
    }
    if (errorMessage.includes('invalid email') || errorMessage.includes('email')) {
        return AUTH_ERRORS.INVALID_EMAIL;
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return AUTH_ERRORS.NETWORK_ERROR;
    }
    if (errorMessage.includes('timeout')) {
        return AUTH_ERRORS.TIMEOUT;
    }
    if (errorMessage.includes('server') || errorCode.startsWith('5')) {
        return AUTH_ERRORS.SERVER_ERROR;
    }
    if (errorMessage.includes('unavailable') || errorCode === '503') {
        return AUTH_ERRORS.SERVICE_UNAVAILABLE;
    }
    if (errorMessage.includes('not found') || errorMessage.includes('user')) {
        return AUTH_ERRORS.USER_NOT_FOUND;
    }
    if (errorMessage.includes('disabled') || errorMessage.includes('blocked')) {
        return AUTH_ERRORS.ACCOUNT_DISABLED;
    }

    return AUTH_ERRORS.UNKNOWN_ERROR;
};

// Retry utility with exponential backoff
export class RetryManager {
    private attempts = 0;
    private maxAttempts: number;
    private baseDelay: number;
    private maxDelay: number;

    constructor(maxAttempts = 3, baseDelay = 1000, maxDelay = 10000) {
        this.maxAttempts = maxAttempts;
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        while (this.attempts < this.maxAttempts) {
            try {
                const result = await operation();
                this.reset();
                return result;
            } catch (error) {
                this.attempts++;
                const classifiedError = classifyError(error);

                if (!classifiedError.retryable || this.attempts >= this.maxAttempts) {
                    this.reset();
                    throw error;
                }

                const delay = Math.min(
                    this.baseDelay * Math.pow(2, this.attempts - 1),
                    this.maxDelay
                );

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        this.reset();
        throw new Error('Max retry attempts exceeded');
    }

    reset() {
        this.attempts = 0;
    }

    getAttempts() {
        return this.attempts;
    }
}

// Error recovery suggestions
export const getRecoveryActions = (error: AppError) => {
    const actions = [];

    switch (error.action) {
        case 'retry':
            actions.push({
                label: 'Try Again',
                action: 'retry',
                primary: true,
            });
            break;
        case 'resend':
            actions.push({
                label: 'Request New Code',
                action: 'resend',
                primary: true,
            });
            break;
        case 'contact_support':
            actions.push({
                label: 'Contact Support',
                action: 'contact_support',
                primary: true,
            });
            break;
        case 'refresh_page':
            actions.push({
                label: 'Refresh Page',
                action: 'refresh_page',
                primary: true,
            });
            break;
    }

    // Always provide a way to go back
    actions.push({
        label: 'Go Back',
        action: 'go_back',
        primary: false,
    });

    return actions;
};

// Error logging utility
export const logError = (error: unknown, context: string, additionalData?: any) => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        context,
        error: {
            message: (error as Error)?.message,
            code: (error as any)?.code,
            stack: (error as Error)?.stack,
        },
        additionalData,
        userAgent: navigator.userAgent,
        url: window.location.href,
    };

    console.error(`[${context}] Error:`, errorInfo);

    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, or a custom endpoint
    if (process.env.NODE_ENV === 'production') {
        // Example: Send to error tracking service
        // errorTrackingService.captureError(errorInfo);
    }
};

// Network status utility
export const getNetworkStatus = () => {
    return {
        online: navigator.onLine,
        connection: (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection,
    };
};

// Error boundary helper
export const handleAsyncError = async <T>(
    operation: () => Promise<T>,
    context: string,
    onError?: (error: AppError) => void
): Promise<T | null> => {
    try {
        return await operation();
    } catch (error) {
        const classifiedError = classifyError(error);
        logError(error, context, { classifiedError });

        if (onError) {
            onError(classifiedError);
        }

        return null;
    }
};