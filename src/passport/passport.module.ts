import { Module } from '@nestjs/common';
import { PassportService } from './passport.service';
import { PassportVerifyController, VaultPassportController } from './passport.controller';
import { PrismaService } from 'src/common/services/prisma.service';

@Module({
  controllers: [VaultPassportController, PassportVerifyController],
  providers: [PassportService, PrismaService],
  exports: [PassportService],
})
export class PassportModule {}
