import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // IMPORTANT: must match AuthModule secret
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-12345',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Return the shape you want on req.user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}