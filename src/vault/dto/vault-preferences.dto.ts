import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class VaultPreferencesDto {
  @ApiProperty({ description: 'When true, notifications for this vault are silenced' })
  muted: boolean;
}

export class UpdateVaultPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  muted?: boolean;
}

export function parseVaultPreferences(raw: unknown): VaultPreferencesDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { muted: false };
  }
  return { muted: (raw as Record<string, unknown>).muted === true };
}

export function mergeVaultPreferences(
  current: unknown,
  update: UpdateVaultPreferencesDto,
): VaultPreferencesDto {
  const base = parseVaultPreferences(current);
  return {
    muted: update.muted !== undefined ? update.muted : base.muted,
  };
}
