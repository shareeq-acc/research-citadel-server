import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AlertPreferencesDto {
  @ApiProperty({ description: 'Notify when @mentioned in colloquium chat' })
  chatMentions: boolean;

  @ApiProperty({ description: 'Notify on vault membership, invitations, and account security events' })
  securityAlerts: boolean;

  @ApiProperty({ description: 'Notify on AI job completion and platform announcements' })
  systemUpdates: boolean;
}

export class UpdateAlertPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chatMentions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferencesDto = {
  chatMentions: true,
  securityAlerts: true,
  systemUpdates: true,
};

export function parseAlertPreferences(raw: unknown): AlertPreferencesDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_ALERT_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  return {
    chatMentions: obj.chatMentions !== false,
    securityAlerts: obj.securityAlerts !== false,
    systemUpdates: obj.systemUpdates !== false,
  };
}

export function mergeAlertPreferences(
  current: unknown,
  update: UpdateAlertPreferencesDto,
): AlertPreferencesDto {
  const base = parseAlertPreferences(current);
  return {
    chatMentions: update.chatMentions !== undefined ? update.chatMentions : base.chatMentions,
    securityAlerts: update.securityAlerts !== undefined ? update.securityAlerts : base.securityAlerts,
    systemUpdates: update.systemUpdates !== undefined ? update.systemUpdates : base.systemUpdates,
  };
}

export type AlertPreferenceKey = keyof AlertPreferencesDto;
