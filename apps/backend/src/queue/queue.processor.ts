import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface EmailJob {
  registrationId: string;
  userId: string;
  competitionId: string;
  type: 'confirmation' | 'reminder';
}

@Processor('email')  // ✅ MUST BE 'email' not 'registration'
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process('sendConfirmation')
  async handleConfirmation(job: Job<EmailJob>) {
    this.logger.log(`Processing confirmation email for registration ${job.data.registrationId}`);

    try {
      const registration = await this.prisma.registration.findUnique({
        where: { id: job.data.registrationId },
        include: {
          user: true,
          competition: true,
        },
      });

      if (!registration) {
        throw new Error('Registration not found');
      }

      await this.prisma.mailBox.create({
        data: {
          userId: job.data.userId,
          to: registration.user.email,
          subject: `Registration Confirmed: ${registration.competition.title}`,
          body: `Dear ${registration.user.name},\n\nYou have successfully registered for ${registration.competition.title}.\n\nBest regards,\nMini Compete Team`,
          jobId: job.id?.toString(),
        },
      });

      this.logger.log(`Confirmation email sent for registration ${job.data.registrationId}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send confirmation email: ${error.message}`);
      
      await this.prisma.failedJob.create({
        data: {
          jobName: 'sendConfirmation',
          jobData: job.data as any,
          error: error.message,
          attempts: job.attemptsMade,
        },
      });

      throw error;
    }
  }
}