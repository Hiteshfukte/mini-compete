import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,  // ✅ Fixed: 'email' not 'registration'
  ) {}

  async addConfirmationEmail(registrationId: string, userId: string, competitionId: string) {
    const job = await this.emailQueue.add(
      'sendConfirmation',
      {
        registrationId,
        userId,
        competitionId,
        type: 'confirmation',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Confirmation email job added: ${job.id}`);
    return job;
  }

  async addReminderEmail(registrationId: string, userId: string, competitionId: string) {
    const job = await this.emailQueue.add(
      'sendReminder',
      {
        registrationId,
        userId,
        competitionId,
        type: 'reminder',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    this.logger.log(`Reminder email job added: ${job.id}`);
    return job;
  }
}