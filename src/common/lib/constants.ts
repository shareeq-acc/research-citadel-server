export const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5; // Maximum attempts for OTP verification
export const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
export const RATE_LIMIT_MAX_REQUESTS = 5; // Maximum requests in the rate limit window
export const OTP_RESEND_INTERVAL = 60 * 1000; // 1 minute
export const PASSWORD_RESET_TOKEN_EXPIRATION = 15 * 60 * 1000; // 15 minutes

export const EMAIL_TYPES = {
  VERIFY: 'verify',
  RESET: 'reset',
} as const;

export type EmailTypes = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES];

export const SERVICE_CONSTANTS = {
  DEFAULT_SEARCH_RADIUS_KM: 5, // Default radius for nearby services search
  MAX_SEARCH_RADIUS_KM: 50, // Maximum allowed search radius
  MIN_SEARCH_RADIUS_KM: 1, // Minimum search radius
  EARTH_RADIUS_KM: 6371, // Earth's radius in kilometers for Haversine formula
} as const;
