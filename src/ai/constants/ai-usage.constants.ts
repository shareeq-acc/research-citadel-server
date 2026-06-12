import { AiOperationType, Plan } from '@prisma/client';

/** Tokens per compute unit before operation multiplier is applied. */
export const TOKENS_PER_COMPUTE_UNIT = 1000;

/** Minimum compute units charged per AI call. */
export const MIN_COMPUTE_UNITS = 0.1;

/** Plan-based daily and weekly compute unit limits. */
export const PLAN_AI_LIMITS: Record<Plan, { daily: number; weekly: number }> = {
  FREE: { daily: 10, weekly: 30 },
  PRO: { daily: 500, weekly: 3000 },
};

/**
 * Operation multipliers reflect relative cost/complexity of each AI task.
 * Higher multiplier = more compute units consumed per token.
 */
export const AI_OPERATION_MULTIPLIERS: Record<AiOperationType, number> = {
  SUMMARIZATION: 1.5,
  INSIGHTS: 2.0,
  QA: 1.0,
  MARKDOWN_ENHANCE: 0.5,
};

export interface AiUsageSummary {
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
}

export interface GeminiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiTrackingContext {
  userId: string;
  operation: AiOperationType;
  metadata?: Record<string, unknown>;
}
