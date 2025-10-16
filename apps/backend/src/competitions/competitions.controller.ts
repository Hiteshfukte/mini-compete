import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('competitions')
@UseGuards(JwtAuthGuard)
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Post()
  @Roles(Role.ORGANIZER)
  @UseGuards(RolesGuard)
  create(@Body() createCompetitionDto: CreateCompetitionDto, @Request() req) {
    return this.competitionsService.create(createCompetitionDto, req.user.id);  // ← Change here
  }

  @Get()
  findAll() {
    return this.competitionsService.findAll();
  }

  @Get('my-registrations')
  getMyRegistrations(@Request() req) {
    return this.competitionsService.getMyRegistrations(req.user.id);  // ← Change here
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @Post(':id/register')
  @Roles(Role.PARTICIPANT)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  register(
    @Param('id') id: string,
    @Body() registerDto: RegisterDto,
    @Request() req,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.competitionsService.register(id, req.user.id, idempotencyKey);  // ← Change here
  }
}