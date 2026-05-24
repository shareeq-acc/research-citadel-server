import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../services/redis.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST') || 'localhost';
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        return {
          connection: {
            host: redisHost,
            port: redisPort,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [BullModule, RedisService],
})
export class BullMQModule {}
