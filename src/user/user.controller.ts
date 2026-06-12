import { Body, Controller, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiParam, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { QueryParams, MulterFile, ApiResponse } from 'src/common/types';
import { UpdateUserDto } from './dto/user.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { UserSelect } from './queries';
import { UserWithAiUsage } from './user.service';
import { GetAllUserResponse, CompleteUserProfileResponse } from './types';
import { RedisService } from 'src/common/services/redis.service';

@Controller('user')
@ApiTags('User')
@UseGuards(AuthGuard)
export class UserController {
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  private getCacheKey(prefix: string, ...params: (string | number | undefined)[]): string {
    const keyParts = params.filter((p) => p !== undefined && p !== null && p !== '');
    return `user:${prefix}:${keyParts.join(':')}`;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const keys = [this.getCacheKey('current', userId), this.getCacheKey('profile', userId)];
    await this.redisService.deleteMany(keys);
  }

  @ApiProperty({ title: 'Search Users by Username', description: 'Search users by username (min 2 chars, partial match)' })
  @ApiQuery({ name: 'q', type: String, required: true, description: 'Username search query' })
  @Get('search')
  async searchByUsername(
    @CurrentUser() user: User,
    @Query('q') q: string,
  ) {
    return this.userService.searchByUsername(user, q ?? '');
  }

  @ApiProperty({ title: 'Get All Users', description: 'Get all users' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sort', type: String, required: false })
  @ApiQuery({ name: 'filter', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get('all')
  async getAllUsers(
    @CurrentUser() user: User,
    @Query() query: QueryParams,
  ): Promise<ApiResponse<GetAllUserResponse>> {
    const { page = 1, limit = 20, search = '', filter = '', sort = '' } = query || {};
    const cacheKey = this.getCacheKey('all', page, limit, search, filter, sort);

    const cached = await this.redisService.get<ApiResponse<GetAllUserResponse>>(cacheKey);
    if (cached) return cached;

    const response = await this.userService.getAllUsers(user, query);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @ApiProperty({ title: 'Get Current User', description: 'Get current authenticated user' })
  @Get('me')
  async getCurrentUser(@CurrentUser() user: User): Promise<ApiResponse<UserWithAiUsage>> {
    const cacheKey = this.getCacheKey('current', user.id);

    const cached = await this.redisService.get<ApiResponse<UserWithAiUsage>>(cacheKey);
    if (cached) return cached;

    const response = await this.userService.getCurrentUser(user);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @ApiProperty({ title: 'Update User', description: 'Update user profile information', type: UpdateUserDto })
  @Put('me')
  async updateUser(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto): Promise<ApiResponse<UserSelect>> {
    const response = await this.userService.updateUser(user, updateUserDto);
    await this.invalidateUserCache(user.id);
    return response;
  }

  @ApiProperty({ title: 'Update Avatar', description: 'Update user avatar image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  @Put('me/avatar')
  async updateAvatar(@CurrentUser() user: User, @UploadedFile() avatar: MulterFile): Promise<ApiResponse<UserSelect>> {
    const response = await this.userService.updateAvatar(user, avatar);
    await this.invalidateUserCache(user.id);
    return response;
  }

  @ApiProperty({ title: 'Upgrade Plan', description: 'Switch between FREE and PRO tiers' })
  @Post('upgrade')
  async upgradePlan(
    @CurrentUser() user: User,
    @Body() dto: UpgradePlanDto,
  ): Promise<ApiResponse<UserWithAiUsage>> {
    const response = await this.userService.upgradePlan(user, dto);
    await this.invalidateUserCache(user.id);
    return response;
  }

  @ApiProperty({
    title: 'Get Complete User Profile',
    description: 'Get complete user profile with userProfile information by user ID',
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @Get('profile/:id')
  async getCompleteUserProfile(@Param('id') id: string): Promise<ApiResponse<CompleteUserProfileResponse>> {
    const cacheKey = this.getCacheKey('profile', id);

    const cached = await this.redisService.get<ApiResponse<CompleteUserProfileResponse>>(cacheKey);
    if (cached) return cached;

    const response = await this.userService.getCompleteUserProfile(id);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }
}
