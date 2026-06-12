import { HttpStatus, Injectable } from '@nestjs/common';
import { AiOperationType, Plan, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis.service';
import { throwError } from 'src/common/utils/helpers';
import {
  AI_OPERATION_MULTIPLIERS,
  AiTrackingContext,
  AiUsageSummary,
  GeminiTokenUsage,
  MIN_COMPUTE_UNITS,
  PLAN_AI_LIMITS,
  TOKENS_PER_COMPUTE_UNIT,
} from '../constants/ai-usage.constants';

@Injectable()
export class AiUsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /** Start of the current UTC day (midnight). */
  getDailyWindowStart(now = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  /** Start of the current UTC week (Monday 00:00). */
  getWeeklyWindowStart(now = new Date()): Date {
    const day = now.getUTCDay(); // 0 = Sunday
    const daysSinceMonday = (day + 6) % 7;
    const monday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday),
    );
    return monday;
  }

  getLimits(plan: Plan) {
    return PLAN_AI_LIMITS[plan] ?? PLAN_AI_LIMITS.FREE;
  }

  calculateComputeUnits(totalTokens: number, operation: AiOperationType): number {
    const multiplier = AI_OPERATION_MULTIPLIERS[operation] ?? 1;
    const raw = (totalTokens / TOKENS_PER_COMPUTE_UNIT) * multiplier;
    const units = Math.max(MIN_COMPUTE_UNITS, raw);
    return Math.round(units * 100) / 100;
  }

  async getUsedUnits(userId: string, since: Date): Promise<number> {
    const result = await this.prisma.aiUsageLog.aggregate({
      where: { userId, createdAt: { gte: since } },
      _sum: { computeUnits: true },
    });
    return Math.round((result._sum.computeUnits ?? 0) * 100) / 100;
  }

  async getUsageSummary(userId: string, plan: Plan): Promise<AiUsageSummary> {
    const limits = this.getLimits(plan);
    const [dailyUsed, weeklyUsed] = await Promise.all([
      this.getUsedUnits(userId, this.getDailyWindowStart()),
      this.getUsedUnits(userId, this.getWeeklyWindowStart()),
    ]);

    return {
      dailyUsed,
      dailyLimit: limits.daily,
      weeklyUsed,
      weeklyLimit: limits.weekly,
    };
  }

  async assertQuota(userId: string, plan: Plan): Promise<AiUsageSummary> {
    const summary = await this.getUsageSummary(userId, plan);

    if (summary.dailyUsed >= summary.dailyLimit) {
      throw throwError(
        `Daily AI compute limit reached (${summary.dailyLimit} units). Resets at 12:00 AM UTC. Upgrade to PRO for higher limits.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (summary.weeklyUsed >= summary.weeklyLimit) {
      throw throwError(
        `Weekly AI compute limit reached (${summary.weeklyLimit} units). Resets Monday 12:00 AM UTC. Upgrade to PRO for higher limits.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return summary;
  }

  async assertQuotaForUser(userId: string): Promise<AiUsageSummary> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { plan: true },
    });
    return this.assertQuota(userId, user.plan);
  }

  async recordUsage(
    context: AiTrackingContext,
    usage: GeminiTokenUsage,
  ): Promise<{ computeUnits: number; summary: AiUsageSummary }> {
    const computeUnits = this.calculateComputeUnits(usage.totalTokens, context.operation);

    await this.prisma.aiUsageLog.create({
      data: {
        userId: context.userId,
        operation: context.operation,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        computeUnits,
        metadata: (context.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: context.userId },
      select: { plan: true },
    });

    const summary = await this.getUsageSummary(context.userId, user.plan);
    await this.redisService.deleteMany([
      `user:current:${context.userId}`,
      `user:profile:${context.userId}`,
    ]);
    return { computeUnits, summary };
  }
}
