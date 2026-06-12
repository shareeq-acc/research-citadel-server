import { Module } from '@nestjs/common';
import { InvitationController, VaultInvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [MailerModule],
  controllers: [InvitationController, VaultInvitationController],
  providers: [InvitationService, PrismaService],
  exports: [InvitationService],
})
export class InvitationModule {}
