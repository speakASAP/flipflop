/**
 * Roles Guard - checks request.user.roles (set by JwtAuthGuard) against @Roles().
 * Use after JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('...')
 *
 * Undecorated routes are denied (SERVICE_IDENTITY_CONSUMER_STANDARD.md).
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  /** Own instance avoids DI token mismatch when multiple @nestjs/core copies exist (e.g. shared vs service node_modules). */
  private readonly reflector = new Reflector();
  private readonly logger = new Logger(RolesGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const rolesMetadata = this.reflector.getAllAndOverride<{
      roles: string[];
      requireAll?: boolean;
    }>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest();
    const path = request.url || request.path || 'unknown';
    const method = request.method || 'UNKNOWN';

    if (!rolesMetadata?.roles?.length) {
      this.logger.error(
        `Undecorated route denied (RolesGuard without @Roles): ${method} ${path}`,
      );
      throw new ForbiddenException('Route missing required role declaration');
    }

    const user = request.user;
    const userRoles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    const requiredRoles = rolesMetadata.roles;
    const requireAll = rolesMetadata.requireAll ?? false;

    if (requireAll) {
      const hasAll = requiredRoles.every((r) => userRoles.includes(r));
      if (!hasAll) {
        throw new ForbiddenException('Insufficient permissions');
      }
    } else {
      const hasAny = requiredRoles.some((r) => userRoles.includes(r));
      if (!hasAny) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
    return true;
  }
}
