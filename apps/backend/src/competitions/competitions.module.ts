import { Module } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { CompetitionsController } from './competitions.controller';
import { PrismaModule } from '../prisma/prisma.module';  // ✅ Import the MODULE
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],  // ✅ PrismaModule, NOT PrismaService
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}