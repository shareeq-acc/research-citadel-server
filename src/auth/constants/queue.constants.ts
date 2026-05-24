export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const EMAIL_QUEUE_JOBS = {
  SEND_OTP_EMAIL: 'send-otp-email',
} as const;

export type EmailQueueJob = (typeof EMAIL_QUEUE_JOBS)[keyof typeof EMAIL_QUEUE_JOBS];
