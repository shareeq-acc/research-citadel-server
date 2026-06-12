import { AiOperationType } from '@prisma/client';
import { AiTrackingContext } from '../constants/ai-usage.constants';

export function buildTracking(
  userId: string,
  operation: AiOperationType,
  metadata?: Record<string, unknown>,
): AiTrackingContext {
  return { userId, operation, metadata };
}
