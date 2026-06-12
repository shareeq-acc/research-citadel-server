import { Prisma, User } from '@prisma/client';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse, QueryParams, MulterFile } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { userSelect, UserSelect, completeUserSelect, CompleteUserSelect } from './queries';
import { GetAllUserResponse, CompleteUserProfileResponse } from './types';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new AppLoggerService(UserService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private async populateUserImages(user: UserSelect): Promise<UserSelect> {
    return {
      ...user,
      avatar: user.avatar ? this.storageService.getImageUrl(user.avatar) : null,
    };
  }

  async getAllUsers(user: User, query?: QueryParams): Promise<ApiResponse<GetAllUserResponse>> {
    try {
      const { page = 1, limit = 20, search = '', filter = '', sort = '' } = query || {};

      // Ensure page is at least 1 to prevent negative skip values
      const safePage  = Math.max(1, Number(page));
      const safeLimit = Math.max(1, Math.min(100, Number(limit)));

      const where: Prisma.UserWhereInput = {
        deletedAt: null,
        id: { not: user.id },
      };
      const orderBy: Prisma.UserOrderByWithRelationInput = {};

      if (search) {
        where.OR = [
          { email:    { contains: search, mode: 'insensitive' } },
          { name:     { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (filter) orderBy[filter] = 'asc';
      if (sort)   orderBy[sort]   = 'desc';

      const [users, totalCount] = await Promise.all([
        this.prismaService.user.findMany({
          select: userSelect,
          where,
          orderBy,
          skip: (safePage - 1) * safeLimit,
          take: safeLimit,
        }),
        this.prismaService.user.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / safeLimit);

      const usersWithImages = await Promise.all(users.map((u) => this.populateUserImages(u)));

      return {
        message: 'Users retrieved successfully',
        success: true,
        data: {
          users: usersWithImages,
          pagination: {
            totalCount,
            totalPages,
            page: safePage,
            limit: safeLimit,
            hasNextPage: safePage < totalPages,
            hasPrevPage: safePage > 1,
          },
        },
      };
    } catch (err) {
      this.logger.error('Failed to retrieve users', err.stack, UserService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'getAllUsersByRole',
        query,
      });
      throw throwError(err.message || 'Failed to retrieve users', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCurrentUser(user: User): Promise<ApiResponse<UserSelect>> {
    try {
      const currentUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        select: userSelect,
      });

      if (!currentUser) throw throwError('User not found', HttpStatus.NOT_FOUND);

      const userWithImage = await this.populateUserImages(currentUser);

      return {
        message: 'User retrieved successfully',
        success: true,
        data: userWithImage,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve user', err.stack, UserService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'getCurrentUser',
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to retrieve user', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateUser(user: User, updateUserDto: UpdateUserDto): Promise<ApiResponse<UserSelect>> {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        include: { userProfile: true },
      });

      if (!existingUser) throw throwError('User not found', HttpStatus.NOT_FOUND);

      const { name, gender, age, address, city, state, country, postalCode, phone, website, bio, longitude, latitude } =
        updateUserDto;

      const userUpdateData: Prisma.UserUpdateInput = {};
      if (name !== undefined) userUpdateData.name = name;

      const profileUpdateData: Prisma.UserProfileUpdateInput = {};
      if (gender !== undefined) profileUpdateData.gender = gender;
      if (age !== undefined) profileUpdateData.age = Number(age);
      if (address !== undefined) profileUpdateData.address = address;
      if (city !== undefined) profileUpdateData.city = city;
      if (state !== undefined) profileUpdateData.state = state;
      if (country !== undefined) profileUpdateData.country = country;
      if (postalCode !== undefined) profileUpdateData.postalCode = postalCode;
      if (phone !== undefined) profileUpdateData.phone = phone;
      if (website !== undefined) profileUpdateData.website = website;
      if (bio !== undefined) profileUpdateData.bio = bio;
      if (longitude !== undefined) profileUpdateData.longitude = Number(longitude);
      if (latitude !== undefined) profileUpdateData.latitude = Number(latitude);

      const updatePromises: Promise<any>[] = [
        this.prismaService.user.update({
          where: { id: user.id },
          data: userUpdateData,
          select: userSelect,
        }),
      ];

      if (Object.keys(profileUpdateData).length > 0) {
        if (existingUser.userProfile) {
          updatePromises.push(
            this.prismaService.userProfile.update({
              where: { userId: user.id },
              data: profileUpdateData,
            }),
          );
        } else {
          updatePromises.push(
            this.prismaService.userProfile.create({
              data: {
                userId: user.id,
                ...profileUpdateData,
              } as Prisma.UserProfileCreateInput,
            }),
          );
        }
      }

      const [updatedUser] = await Promise.all(updatePromises);

      const userWithImage = await this.populateUserImages(updatedUser);

      return {
        message: 'User updated successfully',
        success: true,
        data: userWithImage,
      };
    } catch (err) {
      this.logger.error('Failed to update user', err.stack, UserService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'updateUser',
        userId: user.id,
        updateData: updateUserDto,
      });
      throw throwError(err.message || 'Failed to update user', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateAvatar(user: User, avatar: MulterFile): Promise<ApiResponse<UserSelect>> {
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        select: { avatar: true },
      });

      if (!existingUser) throw throwError('User not found', HttpStatus.NOT_FOUND);

      const [uploadResult] = await Promise.all([
        this.storageService.uploadFile(avatar),
        existingUser.avatar ? this.storageService.removeFile(existingUser.avatar) : Promise.resolve(),
      ]);

      if (!uploadResult?.filename) throw throwError('Failed to upload avatar', HttpStatus.INTERNAL_SERVER_ERROR);

      const updatedUser = await this.prismaService.user.update({
        where: { id: user.id },
        data: { avatar: uploadResult.filename },
        select: userSelect,
      });

      const userWithImage = await this.populateUserImages(updatedUser);

      return {
        message: 'Avatar updated successfully',
        success: true,
        data: userWithImage,
      };
    } catch (err) {
      this.logger.error('Failed to update avatar', err.stack, UserService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'updateAvatar',
        userId: user.id,
        filename: avatar?.filename,
      });
      throw throwError(err.message || 'Failed to update avatar', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async searchByUsername(
    currentUser: User,
    username: string,
  ): Promise<ApiResponse<{ id: string; name: string; username: string; email: string; avatar: string | null }[]>> {
    try {
      if (!username || username.trim().length < 2) {
        return { message: 'Users retrieved', success: true, data: [] };
      }
      const users = await this.prismaService.user.findMany({
        where: {
          deletedAt: null,
          id: { not: currentUser.id },
          username: { contains: username.trim().toLowerCase(), mode: 'insensitive' },
        },
        select: { id: true, name: true, username: true, email: true, avatar: true },
        take: 10,
        orderBy: { username: 'asc' },
      });
      return { message: 'Users retrieved', success: true, data: users };
    } catch (err) {
      this.logger.error('searchByUsername failed', err.stack, UserService.name);
      throw throwError(err.message || 'Search failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCompleteUserProfile(userId: string): Promise<ApiResponse<CompleteUserProfileResponse>> {
    try {
      const completeUser = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: completeUserSelect,
      });

      if (!completeUser) throw throwError('User not found', HttpStatus.NOT_FOUND);

      const userWithImage = {
        ...completeUser,
        avatar: completeUser.avatar ? this.storageService.getImageUrl(completeUser.avatar) : null,
      };

      return {
        message: 'User profile retrieved successfully',
        success: true,
        data: {
          user: userWithImage,
        },
      };
    } catch (err) {
      this.logger.error('Failed to retrieve user profile', err.stack, UserService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'getCompleteUserProfile',
        userId,
      });
      throw throwError(
        err.message || 'Failed to retrieve user profile',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
