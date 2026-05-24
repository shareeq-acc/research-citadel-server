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

@Processor(QUEUE_NAMES.EMAIL)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<SendOtpEmailJobData, void, string>): Promise<void> {
    const { email, otp, type } = job.data;

    this.logger.log(`Processing email job ${job.id} for ${email} (${type})`);

    try {
      await this.mailerService.sendOtpEmail(email, otp, type);
      this.logger.log(`Successfully sent OTP email to ${email} for ${type}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}: ${error.message}`, error.stack);
      throw error; // Re-throw to mark job as failed
    }
  }
}
