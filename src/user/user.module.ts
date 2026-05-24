import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { RedisService } from 'src/common/services/redis.service';
import { StorageService } from 'src/storage/storage.service';
@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, RedisService, StorageService],
  exports: [UserService],
})
export class UserModule {}
