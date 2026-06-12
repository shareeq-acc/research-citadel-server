import { ApiProperty } from '@nestjs/swagger';
import { Plan } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpgradePlanDto {
  @IsNotEmpty({ message: 'Plan is required' })
  @IsEnum(Plan, { message: 'Plan must be FREE or PRO' })
  @ApiProperty({ enum: Plan, example: Plan.PRO })
  plan: Plan;
}
