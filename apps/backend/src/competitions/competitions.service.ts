import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class CompetitionsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,  
  ) {}

  // Create competition
async create(dto: CreateCompetitionDto, organizerId: string) {
  return this.prisma.competition.create({
    data: {
      title: dto.title,
      description: dto.description,
      tags: dto.tags || [],
      capacity: dto.capacity,
      regDeadline: new Date(dto.regDeadline),
      organizer: {
        connect: { id: organizerId }, // ✅ connect to existing user
      },
    },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
}


  // Get all competitions
  async findAll() {
    return this.prisma.competition.findMany({
      where: { deletedAt: null },
      include: {
        organizer: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get single competition
  async findOne(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true, role: true },
        },
        registrations: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!competition || competition.deletedAt) {
      throw new NotFoundException('Competition not found');
    }

    return competition;
  }

  // Update competition
  async update(id: string, dto: UpdateCompetitionDto, userId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    if (competition.createdById !== userId) {
      throw new ForbiddenException('You can only update your own competitions');
    }

    return this.prisma.competition.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.capacity && { capacity: dto.capacity }),
        ...(dto.regDeadline && { regDeadline: new Date(dto.regDeadline) }),
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  // Register for competition with concurrency control
async register(competitionId: string, userId: string, idempotencyKey?: string) {
  // Check for idempotency
  if (idempotencyKey) {
    const existing = await this.prisma.registration.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing; // Return cached result
    }
  }

  // Use transaction with row lock to prevent race conditions
  const registration = await this.prisma.$transaction(async (tx) => {
    // Lock the competition row
    const competition = await tx.competition.findUnique({
      where: { id: competitionId },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    if (!competition || competition.deletedAt) {
      throw new NotFoundException('Competition not found');
    }

    // Check deadline
    if (new Date() > competition.regDeadline) {
      throw new BadRequestException('Registration deadline has passed');
    }

    // Check capacity
    if (competition._count.registrations >= competition.capacity) {
      throw new ConflictException('Competition is full');
    }

    // Check if already registered
    const existingReg = await tx.registration.findUnique({
      where: {
        userId_competitionId: {
          userId,
          competitionId,
        },
      },
    });

    if (existingReg) {
      throw new ConflictException('Already registered for this competition');
    }

    // Create registration
    return await tx.registration.create({
      data: {
        userId,
        competitionId,
        idempotencyKey,
      },
      include: {
        competition: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  });

  // ✅ ADD THIS: Enqueue confirmation email AFTER transaction succeeds
  try {
    await this.queueService.addConfirmationEmail(
      registration.id,
      userId,
      competitionId,
    );
  } catch (error) {
    // Log error but don't fail registration if email queue fails
    console.error('Failed to enqueue confirmation email:', error);
  }

  return registration;
}

  // Get user's registrations
  async getMyRegistrations(userId: string) {
    return this.prisma.registration.findMany({
      where: { userId, deletedAt: null },
      include: {
        competition: {
          include: {
            organizer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  // Get competition participants
  async getParticipants(competitionId: string, userId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    if (competition.createdById !== userId) {
      throw new ForbiddenException('Only the organizer can view participants');
    }

    return this.prisma.registration.findMany({
      where: { competitionId, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }
}