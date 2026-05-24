import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/common/services/prisma.service';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & { user?: { id: string; email: string; name: string } };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException({ message: 'Unauthorized: no token provided' });
    }

    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET as string,
      })) as { id: string; email?: string };

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, name: true },
      });
      if (!user) {
        throw new WsException({ message: 'Unauthorized: user not found' });
      }

      (client as AuthenticatedSocket).data.user = user;
      return true;
    } catch (err: any) {
      throw new WsException({
        message: err.message || 'Unauthorized',
      });
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake?.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;

    const authHeader = client.handshake?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const cookieHeader = client.handshake?.headers?.cookie;
    if (typeof cookieHeader === 'string') {
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) return match[1].trim();
    }

    return null;
  }
}
