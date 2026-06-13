import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { PassportService } from './passport.service';
import { PassportResponseDto, PassportVerificationDto, UpdatePassportDto } from './dto';

@ApiTags('Passport')
@Controller('vault/:vaultId/passport')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class VaultPassportController {
  constructor(private readonly passportService: PassportService) {}

  @Get()
  @ApiOperation({ summary: 'Get or create the current user passport for a vault' })
  @ApiParam({ name: 'vaultId', type: String })
  async getPassport(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
  ): Promise<ApiResponse<PassportResponseDto>> {
    return this.passportService.getOrCreate(user, vaultId);
  }

  @Put()
  @ApiOperation({ summary: 'Update editable passport fields (alias, role, motto)' })
  @ApiParam({ name: 'vaultId', type: String })
  async updatePassport(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
    @Body() dto: UpdatePassportDto,
  ): Promise<ApiResponse<PassportResponseDto>> {
    return this.passportService.update(user, vaultId, dto);
  }
}

@ApiTags('Passport')
@Controller('passport')
export class PassportVerifyController {
  constructor(private readonly passportService: PassportService) {}

  @Get('verify/:barcode')
  @ApiOperation({ summary: 'Public passport verification by barcode (no auth required)' })
  @ApiParam({ name: 'barcode', type: String })
  async verify(
    @Param('barcode') barcode: string,
  ): Promise<ApiResponse<PassportVerificationDto>> {
    return this.passportService.verifyByBarcode(barcode);
  }
}
