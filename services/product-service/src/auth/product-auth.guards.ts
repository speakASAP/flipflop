import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, ROLES_KEY } from '@flipflop/shared';

@Injectable()
export class ProductJwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    try {
      request.user = await this.authService.validateToken(authHeader.substring(7));
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

@Injectable()
export class ProductRolesGuard implements CanActivate {
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    const rolesMetadata = this.reflector.getAllAndOverride<{
      roles: string[];
      requireAll?: boolean;
    }>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!rolesMetadata?.roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = Array.isArray(request.user?.roles) ? request.user.roles : [];
    const requiredRoles = rolesMetadata.roles;
    const requireAll = rolesMetadata.requireAll ?? false;
    const authorized = requireAll
      ? requiredRoles.every((role) => userRoles.includes(role))
      : requiredRoles.some((role) => userRoles.includes(role));

    if (!authorized) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
