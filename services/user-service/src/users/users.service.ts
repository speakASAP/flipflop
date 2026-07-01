/**
 * Users Service
 * Handles user profile and address management
 */

import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService, AuthUser, PrismaService } from '@flipflop/shared';
import { LoggerService } from '@flipflop/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly authService: AuthService,
  ) {}

  private async ensureLocalUser(authUser: AuthUser, authorization?: string) {
    authUser = await this.resolveCanonicalAuthUser(authUser, authorization);

    const existingById = await this.prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (existingById) {
      return this.refreshLocalUserFromAuth(existingById, authUser);
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: authUser.email },
    });

    if (existingByEmail) {
      return this.refreshLocalUserFromAuth(existingByEmail, authUser);
    }

    const user = await this.prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email,
        password: `magic-link-pending:${randomUUID()}`,
        firstName: authUser.firstName || null,
        lastName: authUser.lastName || null,
        phone: this.authPhone(authUser) || null,
        isEmailVerified: Boolean(authUser.isVerified),
        isAdmin: this.hasAdminRole(authUser),
        preferences: this.buildAuthPreferences(null, authUser),
      },
    });

    this.logger.log('Created local FlipFlop profile from Auth user', {
      userId: user.id,
      authUserId: authUser.id,
    });
    return user;
  }

  private async resolveCanonicalAuthUser(authUser: AuthUser, authorization?: string): Promise<AuthUser> {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      return authUser;
    }

    try {
      return await this.authService.getProfile(token);
    } catch (error: any) {
      this.logger.warn('Falling back to validated Auth token claims for local profile sync', {
        authUserId: authUser.id,
        error: error.message,
      });
      return authUser;
    }
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    return authorization.slice('Bearer '.length);
  }

  private async refreshLocalUserFromAuth(user: any, authUser: AuthUser) {
    const authPhone = this.authPhone(authUser);
    const data = {
      firstName: authUser.firstName || user.firstName || null,
      lastName: authUser.lastName || user.lastName || null,
      phone: authPhone || user.phone || null,
      isEmailVerified: Boolean(authUser.isVerified) || user.isEmailVerified,
      isAdmin: this.hasAdminRole(authUser) || user.isAdmin,
      preferences: this.buildAuthPreferences(user.preferences, authUser),
      updatedAt: new Date(),
    };

    return this.prisma.user.update({
      where: { id: user.id },
      data,
    });
  }

  private buildAuthPreferences(existing: unknown, authUser: AuthUser) {
    const base = existing && typeof existing === 'object' && !Array.isArray(existing)
      ? existing as Record<string, unknown>
      : {};
    const existingSources = base.authSources && typeof base.authSources === 'object' && !Array.isArray(base.authSources)
      ? base.authSources as Record<string, unknown>
      : {};

    return {
      ...base,
      authUserId: authUser.id,
      authSources: {
        ...existingSources,
        ...this.extractAuthSources(authUser),
        flipflop: true,
      },
      lastAuthProfileSyncAt: new Date().toISOString(),
    };
  }

  private authPhone(authUser: AuthUser): string | null {
    if (authUser.phone) {
      return authUser.phone;
    }

    const primaryPhone = authUser.contactInfo?.find((contact) => contact.type === 'phone' && contact.isPrimary)?.value;
    if (primaryPhone) {
      return primaryPhone;
    }

    return authUser.contactInfo?.find((contact) => contact.type === 'phone')?.value || null;
  }

  private extractAuthSources(authUser: AuthUser): Record<string, unknown> {
    const preferences = authUser.perApplicationPreferences;
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      return {};
    }

    const sources = preferences.authSources;
    return sources && typeof sources === 'object' && !Array.isArray(sources)
      ? sources as Record<string, unknown>
      : {};
  }

  private hasAdminRole(authUser: AuthUser): boolean {
    return Boolean(authUser.roles?.some((role) => (
      role === 'admin' ||
      role === 'flipflop:admin' ||
      role === 'app:flipflop:admin'
    )));
  }

  private toProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isAdmin: user.isAdmin,
    };
  }

  /**
   * Get user profile
   */
  async getProfile(authUser: AuthUser, authorization?: string) {
    const user = await this.ensureLocalUser(authUser, authorization);
    return this.toProfile(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(authUser: AuthUser, authorization: string | undefined, dto: any) {
    const localUser = await this.ensureLocalUser(authUser, authorization);
    const user = await this.prisma.user.update({
      where: { id: localUser.id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });

    this.logger.log('User profile updated', { userId: user.id, authUserId: authUser.id });
    return this.toProfile(user);
  }

  /**
   * Get user's delivery addresses
   */
  async getAddresses(authUser: AuthUser, authorization?: string) {
    const localUser = await this.ensureLocalUser(authUser, authorization);
    const addresses = await this.prisma.deliveryAddress.findMany({
      where: { userId: localUser.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return addresses.map((addr) => ({
      id: addr.id,
      firstName: addr.firstName,
      lastName: addr.lastName,
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || undefined,
      isDefault: addr.isDefault,
      createdAt: addr.createdAt.toISOString(),
      updatedAt: addr.updatedAt.toISOString(),
    }));
  }

  /**
   * Create delivery address
   */
  async createAddress(authUser: AuthUser, authorization: string | undefined, dto: any) {
    const localUser = await this.ensureLocalUser(authUser, authorization);
    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.deliveryAddress.updateMany({
        where: { userId: localUser.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.deliveryAddress.create({
      data: {
        userId: localUser.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        street: dto.street,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country || 'Czech Republic',
        phone: dto.phone,
        isDefault: dto.isDefault || false,
      },
    });

    this.logger.log('Delivery address created', { userId: localUser.id, authUserId: authUser.id, addressId: address.id });
    return {
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || undefined,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  /**
   * Update delivery address
   */
  async updateAddress(authUser: AuthUser, authorization: string | undefined, addressId: string, dto: any) {
    const localUser = await this.ensureLocalUser(authUser, authorization);
    const address = await this.prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId: localUser.id,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.deliveryAddress.updateMany({
        where: { userId: localUser.id, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.deliveryAddress.update({
      where: { id: addressId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        street: dto.street,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country,
        phone: dto.phone,
        isDefault: dto.isDefault,
      },
    });

    this.logger.log('Delivery address updated', { userId: localUser.id, authUserId: authUser.id, addressId });
    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      street: updated.street,
      city: updated.city,
      postalCode: updated.postalCode,
      country: updated.country,
      phone: updated.phone || undefined,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete delivery address
   */
  async deleteAddress(authUser: AuthUser, authorization: string | undefined, addressId: string) {
    const localUser = await this.ensureLocalUser(authUser, authorization);
    const address = await this.prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId: localUser.id,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.deliveryAddress.delete({
      where: { id: addressId },
    });

    this.logger.log('Delivery address deleted', { userId: localUser.id, authUserId: authUser.id, addressId });
    return { success: true };
  }
}

