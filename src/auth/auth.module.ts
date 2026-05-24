import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/services/prisma.service';
import { MailerService } from 'src/mailer/mailer.service';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './constants/queue.constants';
import { EmailProcessor } from './processors/email.processor';
import { RedisService } from 'src/common/services/redis.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        const expiresIn = configService.getOrThrow<string>('JWT_EXPIRY');

        return {
          secret,
          signOptions: {
            expiresIn,
          } as any,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMAIL,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, MailerService, EmailProcessor, RedisService],
  exports: [AuthService],
})
export class AuthModule {}
