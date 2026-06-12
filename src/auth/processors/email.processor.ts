import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from 'src/mailer/mailer.service';
import { QUEUE_NAMES } from '../constants/queue.constants';
import { OtpType } from '@prisma/client';

export interface SendOtpEmailJobData {
  email: string;
  otp: string;
  type: OtpType;
}

export interface SendEmailVerificationLinkJobData {
  email: string;
  name: string;
  token: string;
}

@Processor(QUEUE_NAMES.EMAIL)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<SendOtpEmailJobData | SendEmailVerificationLinkJobData, void, string>): Promise<void> {
    this.logger.log(`Processing email job ${job.id} (${job.name})`);

    try {
      if (job.name === 'send-email-verification-link') {
        const { email, name, token } = job.data as SendEmailVerificationLinkJobData;
        await this.mailerService.sendEmailVerificationEmail(email, name, token);
        this.logger.log(`Successfully sent email verification link to ${email}`);
        return;
      }

      const { email, otp, type } = job.data as SendOtpEmailJobData;
      await this.mailerService.sendOtpEmail(email, otp, type);
      this.logger.log(`Successfully sent OTP email to ${email} for ${type}`);
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
