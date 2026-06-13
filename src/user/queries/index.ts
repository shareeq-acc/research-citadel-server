import { Prisma } from '@prisma/client';

export const userSelect = {
  id: true,
  email: true,
  name: true,
  username: true,
  avatar: true,
  motto: true,
  loginProvider: true,
  hasNotifications: true,
  isEmailVerified: true,
  alertPreferences: true,
  lastLoginAt: true,
  lastActiveAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserSelect = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

export const completeUserSelect = {
  id: true,
  email: true,
  name: true,
  username: true,
  avatar: true,
  motto: true,
  loginProvider: true,
  hasNotifications: true,
  isEmailVerified: true,
  alertPreferences: true,
  lastLoginAt: true,
  lastActiveAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  userProfile: {
    select: {
      id: true,
      userId: true,
      longitude: true,
      latitude: true,
      age: true,
      gender: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      phone: true,
      website: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

export type CompleteUserSelect = Prisma.UserGetPayload<{
  select: typeof completeUserSelect;
}>;

export const minimalUserSelect = {
  id: true,
  email: true,
  name: true,
  username: true,
  avatar: true,
} satisfies Prisma.UserSelect;

export type MinimalUserSelect = Prisma.UserGetPayload<{
  select: typeof minimalUserSelect;
}>;
