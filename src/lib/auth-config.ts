import { supabase } from "@/integrations/supabase/client";
import { classifyError, logError, RetryManager, handleAsyncError } from "./error-handling";

// Authentication configuration constants
export const AUTH_CONFIG = {
  OTP_EXPIRY_MINUTES: 60,
  MAX_OTP_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
  RATE_LIMIT_WINDOW_MINUTES: 15,
  MAX_REQUESTS_PER_WINDOW: 5,
} as const;

// Email template configuration for Supabase
export const EMAIL_TEMPLATE_CONFIG = {
  subject: "Your Municipal Portal Verification Code",
  template: `
    <h2>Your Login Code</h2>
    <p>Hi there!</p>
    <p>Here's your 6-digit verification code to login to Municipal Portal:</p>
    <h1 style="font-size: 32px; font-weight: bold; text-align: center; background: #f5f5f5; padding: 20px; border-radius: 8px; letter-spacing: 8px;">{{ .Token }}</h1>
    <p>This code will expire in 60 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
    <hr>
    <p style="font-size: 12px; color: #666;">
      This email was sent from the Municipal Complaint Management System.
      <br>
      If you have any questions, please contact your local municipal office.
    </p>
  `,
};

// Rate limiting storage keys
const RATE_LIMIT_KEY = (email: string) => `otp_rate_limit_${email}`;
const ATTEMPT_COUNT_KEY = (email: string) => `otp_attempts_${email}`;
const LAST_SENT_KEY = (email: string) => `otp_last_sent_${email}`;

// Rate limiting utilities
export const rateLimitUtils = {
  canSendOTP: (email: string): { allowed: boolean; remainingTime?: number } => {
    const lastSent = localStorage.getItem(LAST_SENT_KEY(email));
    if (!lastSent) return { allowed: true };

    const lastSentTime = parseInt(lastSent);
    const now = Date.now();
    const timeSinceLastSent = now - lastSentTime;
    const cooldownMs = AUTH_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;

    if (timeSinceLastSent < cooldownMs) {
      return {
        allowed: false,
        remainingTime: Math.ceil((cooldownMs - timeSinceLastSent) / 1000),
      };
    }

    return { allowed: true };
  },

  recordOTPSent: (email: string) => {
    localStorage.setItem(LAST_SENT_KEY(email), Date.now().toString());
  },

  incrementAttempts: (email: string): number => {
    const current = parseInt(localStorage.getItem(ATTEMPT_COUNT_KEY(email)) || "0");
    const newCount = current + 1;
    localStorage.setItem(ATTEMPT_COUNT_KEY(email), newCount.toString());
    return newCount;
  },

  getAttemptCount: (email: string): number => {
    return parseInt(localStorage.getItem(ATTEMPT_COUNT_KEY(email)) || "0");
  },

  resetAttempts: (email: string) => {
    localStorage.removeItem(ATTEMPT_COUNT_KEY(email));
    localStorage.removeItem(LAST_SENT_KEY(email));
  },

  isBlocked: (email: string): boolean => {
    return rateLimitUtils.getAttemptCount(email) >= AUTH_CONFIG.MAX_OTP_ATTEMPTS;
  },
};

// Enhanced OTP sending function with retry logic
export const sendOTP = async (
  email: string,
  options?: {
    isSignUp?: boolean;
    userData?: {
      full_name?: string;
      phone?: string;
      role?: string;
      council_id?: string;
    };
  }
) => {
  // Check rate limiting
  const rateLimitCheck = rateLimitUtils.canSendOTP(email);
  if (!rateLimitCheck.allowed) {
    const error = new Error(
      `Please wait ${rateLimitCheck.remainingTime} seconds before requesting another code.`
    );
    (error as any).code = 'COOLDOWN_ACTIVE';
    throw error;
  }

  // Check if user is blocked
  if (rateLimitUtils.isBlocked(email)) {
    const error = new Error(
      "Too many failed attempts. Please try again later or contact support."
    );
    (error as any).code = 'TOO_MANY_ATTEMPTS';
    throw error;
  }

  const retryManager = new RetryManager(3, 1000, 5000);
  
  return await retryManager.execute(async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: options?.userData || {},
        },
      });

      if (error) {
        logError(error, 'sendOTP', { email, isSignUp: options?.isSignUp });
        
        // Classify and throw appropriate error
        const classifiedError = classifyError(error);
        const newError = new Error(classifiedError.userMessage);
        (newError as any).code = classifiedError.code;
        throw newError;
      }

      // Record successful OTP send
      rateLimitUtils.recordOTPSent(email);
      
      return { success: true };
    } catch (error: any) {
      // Don't retry certain errors
      if (error.code === 'INVALID_EMAIL' || error.code === 'COOLDOWN_ACTIVE') {
        retryManager.reset();
        throw error;
      }
      throw error;
    }
  });
};

// Enhanced OTP verification function with better error handling
export const verifyOTP = async (email: string, token: string) => {
  return await handleAsyncError(async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      // Increment failed attempts
      const attempts = rateLimitUtils.incrementAttempts(email);
      
      logError(error, 'verifyOTP', { email, attempts });
      
      // Handle specific verification errors
      if (error.message.includes('invalid') || error.message.includes('expired')) {
        const remainingAttempts = AUTH_CONFIG.MAX_OTP_ATTEMPTS - attempts;
        if (remainingAttempts > 0) {
          const newError = new Error(
            `Invalid or expired code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
          );
          (newError as any).code = 'INVALID_OTP';
          throw newError;
        } else {
          const newError = new Error(
            'Too many failed attempts. Please request a new code.'
          );
          (newError as any).code = 'TOO_MANY_ATTEMPTS';
          throw newError;
        }
      }
      
      // Classify other errors
      const classifiedError = classifyError(error);
      const newError = new Error(classifiedError.userMessage);
      (newError as any).code = classifiedError.code;
      throw newError;
    }

    // Reset attempts on successful verification
    rateLimitUtils.resetAttempts(email);
    
    return { data, success: true };
  }, 'verifyOTP');
};

// Production admin authentication - uses OTP flow only
export const signInAdmin = async (email: string) => {
  // Validate admin email domain for security
  if (!email.endsWith('@bennett.edu.in')) {
    const error = new Error('Admin access not authorized for this email domain');
    (error as any).code = 'UNAUTHORIZED';
    throw error;
  }

  // Use the standard OTP flow for admin authentication
  return await sendOTP(email);
};