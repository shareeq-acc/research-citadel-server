import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../services/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('Unauthorized Access');

    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET as string,
      })) as any;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, name: true },
      });
      if (!user) throw new UnauthorizedException('Unauthorized Access');

      (request as any).user = user;

      return true;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new UnauthorizedException(error.message || 'Unauthorized Access');
    }
  }

  private extractToken(request: Request): string | null {
    let token = '';
    if (request.cookies?.token) {
      token = request.cookies.token;
    }

    const authorization = request.headers['authorization'];
    if (!token && authorization && authorization.startsWith('Bearer ')) {
      token = authorization.replace('Bearer ', '');
    }

    return token;
  }
}
