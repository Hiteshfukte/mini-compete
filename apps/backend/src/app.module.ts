import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    CompetitionsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService], // ✅ moved PrismaService here
})
export class AppModule {}
