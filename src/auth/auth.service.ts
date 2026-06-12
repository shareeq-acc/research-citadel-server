import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { RedisService } from 'src/common/services/redis.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import {
  ConfirmEmailResponse,
  JwtPayload,
  LoginUserResponse,
  OtpVerificationResponse,
  RegisterUserResponse,
} from './types';
import { generateSecureOTP, throwError } from 'src/common/utils/helpers';
import { ApiResponse } from 'src/common/types';
import { generateSecureToken, generateUrlSafeToken, hashPassword, verifyPassword } from 'src/common/utils/hash';
import { CookieOptions } from 'express';
import { OtpChannel, OtpType, RateLimitAction, User } from '@prisma/client';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import {
  OTP_EXPIRATION_TIME,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_INTERVAL,
  EMAIL_VERIFICATION_TOKEN_EXPIRATION,
  PASSWORD_RESET_TOKEN_EXPIRATION,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW,
} from 'src/common/lib/constants';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import * as bcrypt from 'bcryptjs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, EMAIL_QUEUE_JOBS } from './constants/queue.constants';
import { SendEmailVerificationLinkJobData, SendOtpEmailJobData } from './processors/email.processor';

@Injectable()
export class AuthService {
  private readonly logger = new AppLoggerService(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue<SendOtpEmailJobData | SendEmailVerificationLinkJobData>,
  ) {}

  private async signJwtTokenToCookies(res: Response, payload: JwtPayload): Promise<string> {
    const token = await this.jwtService.signAsync(payload);

    const cookieOptions: CookieOptions = {
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    };

    (res as any).cookie('token', token, cookieOptions);
    return token;
  }

  async register(res: Response, registerDto: RegisterDto): Promise<ApiResponse<RegisterUserResponse>> {
    try {
      const { name, username, email, password } = registerDto;

      // Check email uniqueness
      const existingEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingEmail) throw throwError('Email is already registered', HttpStatus.BAD_REQUEST);

      // Check username uniqueness
      const existingUsername = await this.prisma.user.findUnique({ where: { username } });
      if (existingUsername) throw throwError('Username is already taken', HttpStatus.BAD_REQUEST);

      const { salt, hash } = hashPassword(password);

      const user = await this.prisma.user.create({
        data: { name, username, email, password: hash, salt },
        omit: {
          password: true,
          salt: true,
        },
      });

      if (!user) throw throwError('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);

      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };
      const token = await this.signJwtTokenToCookies(res, payload);

      return {
        message: 'Registration successful',
        success: true,
        data: { user, token },
      };
    } catch (error) {
      this.logger.error('Registration failed', error.stack, AuthService.name);
      this.logger.logData({
        error: error.message,
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'register',
        email: registerDto.email,
      });
      throw throwError(error.message || 'Registration failed', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async login(res: Response, loginDto: LoginDto): Promise<ApiResponse<LoginUserResponse>> {
    try {
      const { email, password } = loginDto;

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) throw throwError('Invalid Credentials', HttpStatus.BAD_REQUEST);

      if (!verifyPassword({ password, salt: user.salt || '', hash: user.password || '' }))
        throw throwError('Invalid Credentials', HttpStatus.BAD_REQUEST);

      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };

      const token = await this.signJwtTokenToCookies(res, payload);
      const { password: _, salt: __, ...userWithoutPassword } = user;

      return {
        message: 'Login successful',
        success: true,
        data: { user: userWithoutPassword, token },
      };
    } catch (error) {
      this.logger.error('Login failed', error.stack, AuthService.name);
      this.logger.logData({
        error: error.message,
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'login',
        email: loginDto.email,
      });
      throw throwError(error.message || 'Something went wrong', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async logout(user: User, res: Response): Promise<ApiResponse<void>> {
    try {
      const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      };

      (res as any).clearCookie('token', cookieOptions);
      return {
        message: 'Logout successful',
        success: true,
      };
    } catch (err) {
      this.logger.error('Logout failed', err.stack, AuthService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'logout',
        userId: user.id,
      });
      throw throwError(err.message || 'Logout failed', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async checkRateLimit(identifier: string, action: RateLimitAction): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

    const rateLimit = await this.prisma.rateLimit.findUnique({
      where: {
        identifier_action: {
          identifier,
          action,
        },
      },
    });

    if (rateLimit) {
      if (rateLimit.windowStart > windowStart && rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        const secondsRemaining = Math.ceil((rateLimit.expiresAt.getTime() - now.getTime()) / 1000);
        const minutesRemaining = Math.ceil(secondsRemaining / 60);
        const message =
          minutesRemaining === 1
            ? 'Rate limit exceeded. Please try again after 1 minute'
            : `Rate limit exceeded. Please try again after ${minutesRemaining} minutes`;
        throw throwError(message, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }

  private async updateRateLimit(identifier: string, action: RateLimitAction): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RATE_LIMIT_WINDOW);

    await this.prisma.rateLimit.upsert({
      where: {
        identifier_action: {
          identifier,
          action,
        },
      },
      update: {
        count: {
          increment: 1,
        },
        expiresAt,
      },
      create: {
        identifier,
        action,
        count: 1,
        windowStart: now,
        expiresAt,
      },
    });
  }

  // TODO: Get ip address and user agent from request
  private getClientIpAndUserAgent(req: Request): {
    ipAddress: string;
    userAgent: string;
  } {
    const ipAddress = '';
    // req.headers['x-forwarded-for']?.[0]?.split(',')[0] ||
    // req.headers['x-real-ip'] ||
    // null;
    const userAgent = req.headers['user-agent'] || '';
    return { ipAddress, userAgent };
  }

  async sendOtp(req: Request, dto: SendOtpDto): Promise<ApiResponse<string>> {
    try {
      const { email, type, otpChannel } = dto;

      if (type === OtpType.EMAIL_VERIFICATION) {
        throw throwError(
          'Email verification uses a secure link. Please request a new verification email from your account.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const { ipAddress, userAgent } = this.getClientIpAndUserAgent(req);

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        await this.updateRateLimit(email, RateLimitAction.SEND_OTP);
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      await this.checkRateLimit(email, RateLimitAction.SEND_OTP);

      const existingOtp = await this.prisma.otpVerification.findFirst({
        where: {
          userId: user.id,
          type,
          verified: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingOtp) {
        await this.updateRateLimit(email, RateLimitAction.SEND_OTP);
        throw throwError('OTP already sent. Please wait for the previous OTP to expire.', HttpStatus.TOO_MANY_REQUESTS);
      }

      const otp = generateSecureOTP();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_TIME);

      const otpRecord = await this.prisma.otpVerification.create({
        data: {
          userId: user.id,
          type,
          code: hashedOtp,
          channel: otpChannel,
          maxAttempts: OTP_MAX_ATTEMPTS,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      if (!otpRecord) throw throwError('Failed to send OTP', HttpStatus.INTERNAL_SERVER_ERROR);

      await Promise.all([
        this.sendOtpViaChannel(email, type, otpChannel, otp),
        this.updateRateLimit(email, RateLimitAction.SEND_OTP),
      ]);

      return {
        message: 'OTP sent successfully',
        success: true,
        data: otp, // TODO: Remove this after testing
      };
    } catch (error) {
      this.logger.error('Failed to send OTP', error.stack, AuthService.name);
      this.logger.logData({
        error: error.message,
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'sendOtp',
        email: dto.email,
        type: dto.type,
        channel: dto.otpChannel,
      });
      throw throwError(error.message || 'Failed to send OTP', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async resendOtp(req: Request, dto: SendOtpDto): Promise<ApiResponse<string>> {
    try {
      const { email, type, otpChannel } = dto;
      const { ipAddress, userAgent } = this.getClientIpAndUserAgent(req);

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        await this.updateRateLimit(email, RateLimitAction.SEND_OTP);
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      await this.checkRateLimit(email, RateLimitAction.SEND_OTP);

      // check if there is an existing OTP session, so we can resend the OTP
      const existingOtp = await this.prisma.otpVerification.findFirst({
        where: {
          userId: user.id,
          type,
          verified: false, // OTP must not be used yet
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!existingOtp) {
        await this.updateRateLimit(email, RateLimitAction.SEND_OTP);
        throw throwError('OTP session invalid, please request a new OTP', HttpStatus.NOT_FOUND);
      }

      const timeSinceLastOtp = Date.now() - existingOtp.createdAt.getTime();
      // Check if the resend interval has passed
      if (timeSinceLastOtp < OTP_RESEND_INTERVAL) {
        await this.updateRateLimit(email, RateLimitAction.SEND_OTP);
        throw throwError(
          `Please wait ${Math.ceil(
            (OTP_RESEND_INTERVAL - timeSinceLastOtp) / 1000,
          )} seconds before requesting a new OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Generate a new OTP
      const otp = generateSecureOTP();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_TIME);

      const updatedOtpRecord = await this.prisma.otpVerification.update({
        where: { id: existingOtp.id },
        data: {
          code: hashedOtp,
          expiresAt,
          attempts: 0, // Reset attempts
          userId: user.id,
          updatedAt: new Date(),
        },
      });

      if (!updatedOtpRecord) throw throwError('Failed to resend OTP', HttpStatus.INTERNAL_SERVER_ERROR);

      await Promise.all([
        this.sendOtpViaChannel(email, type, otpChannel, otp),
        this.updateRateLimit(email, RateLimitAction.SEND_OTP),
      ]);

      return {
        message: 'OTP resent successfully',
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to resend OTP', error.stack, AuthService.name);
      this.logger.logData({
        error: error.message,
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'resendOtp',
        email: dto.email,
        type: dto.type,
        channel: dto.otpChannel,
      });
      throw throwError(error.message || 'Failed to resend OTP', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyOtp(req: Request, dto: VerifyOtpDto): Promise<ApiResponse<OtpVerificationResponse>> {
    try {
      const { otp, email, otpChannel, type } = dto;

      if (type === OtpType.EMAIL_VERIFICATION) {
        throw throwError(
          'Email verification uses a secure link. Please check your inbox for the verification email.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const { ipAddress, userAgent } = this.getClientIpAndUserAgent(req);

      const user = await this.prisma.user.findUnique({
        where: { email },
      });
      if (!user) {
        await this.updateRateLimit(email, RateLimitAction.VERIFY_OTP);
        throw throwError('Account not found', HttpStatus.NOT_FOUND);
      }

      const otpRecord = await this.prisma.otpVerification.findFirst({
        where: {
          userId: user.id,
          type,
          channel: otpChannel,
          verified: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otpRecord) {
        await this.updateRateLimit(email, RateLimitAction.VERIFY_OTP);
        throw throwError('Invalid OTP', HttpStatus.BAD_REQUEST);
      }

      if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        await this.updateRateLimit(email, RateLimitAction.VERIFY_OTP);
        throw throwError('Maximum OTP attempts exceeded. Please request a new OTP.', HttpStatus.BAD_REQUEST);
      }

      const isValidOtp = await bcrypt.compare(otp, otpRecord.code);

      // Increment attempts
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      if (!isValidOtp) {
        await this.updateRateLimit(email, RateLimitAction.VERIFY_OTP);
        throw throwError('Invalid OTP', HttpStatus.BAD_REQUEST);
      }

      // Mark OTP as verified
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: {
          verified: true,
        },
      });

      let token: string | undefined;
      if (type === OtpType.PASSWORD_RESET) token = await generateSecureToken();

      // Handle operations after successful verification
      await Promise.all([
        this.handleOtpTypeOperations(user.id, type, token),
        this.updateRateLimit(email, RateLimitAction.VERIFY_OTP),
      ]);

      return {
        message: 'OTP verification successful',
        success: true,
        data: {
          token: token || undefined,
        },
      };
    } catch (err) {
      this.logger.error('OTP verification failed', err.stack, AuthService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'verifyOtp',
        email: dto.email,
        type: dto.type,
        channel: dto.otpChannel,
      });
      throw throwError(err.message || 'OTP verification failed', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getCacheKey(prefix: string, ...params: (string | number | undefined)[]): string {
    const keyParts = params.filter((p) => p !== undefined && p !== null && p !== '');
    return `user:${prefix}:${keyParts.join(':')}`;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const keys = [this.getCacheKey('current', userId), this.getCacheKey('profile', userId)];
    await this.redisService.deleteMany(keys);
  }

  private async sendOtpViaChannel(identifier: string, type: OtpType, channel: OtpChannel, otp: string): Promise<void> {
    switch (channel) {
      case OtpChannel.EMAIL: {
        this.logger.log(`Adding OTP email job to queue for ${identifier} (${type})`);
        await this.emailQueue.add(EMAIL_QUEUE_JOBS.SEND_OTP_EMAIL, {
          email: identifier,
          otp,
          type,
        } as SendOtpEmailJobData);
        break;
      }
      case OtpChannel.SMS: {
        console.log(`Sending OTP ${otp} to ${identifier} via SMS for ${type}`);
        break;
      }
    }
  }

  private async handleOtpTypeOperations(userId: string, type: OtpType, token?: string): Promise<any> {
    switch (type) {
      case OtpType.EMAIL_VERIFICATION:
        return await this.handleVerifyEmail(userId);
      case OtpType.PASSWORD_RESET:
        if (!token) throw throwError('Token is required for password reset', HttpStatus.BAD_REQUEST);
        return await this.handlePasswordReset(userId, type, token);
      case OtpType.PHONE_VERIFICATION:
        break;
      case OtpType.LOGIN_VERIFICATION:
        break;
      case OtpType.TWO_FACTOR_AUTH:
        break;
      default:
        throw throwError('Unsupported OTP type', HttpStatus.BAD_REQUEST);
    }
  }

  private async handleVerifyEmail(userId: string): Promise<Omit<User, 'password' | 'salt'>> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
      omit: { password: true, salt: true },
    });

    await this.invalidateUserCache(userId);

    return updatedUser;
  }

  private async handlePasswordReset(
    userId: string,
    type: OtpType,
    token: string,
  ): Promise<Omit<User, 'password' | 'salt'>> {
    // Create a verification token that will be used when updating the password
    if (!token) throw throwError('Token is required for password reset', HttpStatus.BAD_REQUEST);

    const verificationToken = await this.prisma.verificationToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRATION),
      },
    });

    return await this.prisma.user.update({
      where: { id: userId },
      data: { verificationTokens: { connect: { id: verificationToken.id } } },
      omit: { password: true, salt: true },
    });
  }

  private async sendEmailVerificationLink(req: Request, user: User): Promise<void> {
    await this.checkRateLimit(user.email, RateLimitAction.SEND_OTP);

    const existingToken = await this.prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: OtpType.EMAIL_VERIFICATION,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingToken) {
      const timeSinceLastToken = Date.now() - existingToken.createdAt.getTime();
      if (timeSinceLastToken < OTP_RESEND_INTERVAL) {
        await this.updateRateLimit(user.email, RateLimitAction.SEND_OTP);
        throw throwError(
          `Please wait ${Math.ceil((OTP_RESEND_INTERVAL - timeSinceLastToken) / 1000)} seconds before requesting a new verification email`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: OtpType.EMAIL_VERIFICATION,
        used: false,
      },
    });

    const token = generateUrlSafeToken(32);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRATION);

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: OtpType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    this.logger.log(`Queueing email verification link for ${user.email}`);
    await Promise.all([
      this.emailQueue.add(EMAIL_QUEUE_JOBS.SEND_EMAIL_VERIFICATION_LINK, {
        email: user.email,
        name: user.name,
        token,
      } as SendEmailVerificationLinkJobData),
      this.updateRateLimit(user.email, RateLimitAction.SEND_OTP),
    ]);
  }

  async verifyEmail(req: Request, user: User): Promise<ApiResponse> {
    try {
      if (user.isEmailVerified)
        return {
          message: 'Email already verified',
          success: true,
        };

      await this.sendEmailVerificationLink(req, user);

      return {
        message: 'Verification email sent successfully',
        success: true,
      };
    } catch (err) {
      this.logger.error('Failed to verify email', err.stack, AuthService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'verifyEmail',
        userId: user.id,
        email: user.email,
      });
      throw throwError(err.message || 'Failed to verify email', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async confirmEmailVerification(token: string): Promise<ApiResponse<ConfirmEmailResponse>> {
    try {
      const verificationToken = await this.prisma.verificationToken.findFirst({
        where: {
          token,
          type: OtpType.EMAIL_VERIFICATION,
          used: false,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!verificationToken) {
        const usedToken = await this.prisma.verificationToken.findFirst({
          where: {
            token,
            type: OtpType.EMAIL_VERIFICATION,
            used: true,
          },
          include: { user: true },
        });

        if (usedToken?.user.isEmailVerified) {
          const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: usedToken.userId },
            omit: { password: true, salt: true },
          });

          return {
            message: 'Email already verified',
            success: true,
            data: { user },
          };
        }

        throw throwError('Invalid or expired verification link', HttpStatus.BAD_REQUEST);
      }

      if (verificationToken.user.isEmailVerified) {
        await this.prisma.verificationToken.update({
          where: { id: verificationToken.id },
          data: { used: true },
        });

        const user = await this.prisma.user.findUniqueOrThrow({
          where: { id: verificationToken.userId },
          omit: { password: true, salt: true },
        });

        return {
          message: 'Email already verified',
          success: true,
          data: { user },
        };
      }

      const updatedUser = await this.handleVerifyEmail(verificationToken.userId);

      await this.prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      });

      return {
        message: 'Email verified successfully',
        success: true,
        data: { user: updatedUser },
      };
    } catch (err) {
      this.logger.error('Email confirmation failed', err.stack, AuthService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'confirmEmailVerification',
      });
      throw throwError(err.message || 'Email confirmation failed', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async forgotPassword(req: Request, { email }: ForgotPasswordDto): Promise<ApiResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });
      if (!user) throw throwError('User not found', HttpStatus.BAD_REQUEST);

      const otpResponse = await this.sendOtp(req, {
        email,
        type: OtpType.PASSWORD_RESET,
        otpChannel: OtpChannel.EMAIL,
      });

      if (!otpResponse.success) throw throwError('Failed to send OTP for password reset', HttpStatus.BAD_REQUEST);

      return {
        message: 'Forgot password request processed successfully',
        success: true,
      };
    } catch (err) {
      this.logger.error('Failed to process forgot password request', err.stack, AuthService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'forgotPassword',
        email,
      });
      throw throwError(
        err.message || 'Failed to process forgot password request',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resetPassword({ newPassword, resetToken }: ResetPasswordDto): Promise<ApiResponse> {
    try {
      const verificationToken = await this.prisma.verificationToken.findFirst({
        where: {
          token: resetToken,
          type: OtpType.PASSWORD_RESET,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!verificationToken) throw throwError('Invalid or expired reset token', HttpStatus.BAD_REQUEST);

      const { hash, salt } = hashPassword(newPassword);

      await Promise.all([
        this.prisma.user.update({
          where: { id: verificationToken.userId },
          data: {
            password: hash,
            salt: salt,
          },
        }),
        // Remove the verification token after successful reset
        this.prisma.verificationToken.delete({
          where: { id: verificationToken.id },
        }),
      ]);

      return {
        message: 'Password reset successful',
        success: true,
      };
    } catch (err) {
      this.logger.error('Failed to reset password', err.stack, AuthService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'resetPassword',
      });
      throw throwError(err.message || 'Failed to reset password', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async cleanupTokensAndOtps(): Promise<ApiResponse> {
    try {
      const now = new Date();

      const [expiredOtps, expiredTokens, expiredRateLimits] = await Promise.all([
        await this.prisma.otpVerification.deleteMany({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        }),
        this.prisma.verificationToken.deleteMany({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        }),
        this.prisma.rateLimit.deleteMany({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        }),
      ]);

      return {
        message: 'Cleanup successful',
        success: true,
        data: {
          expiredOtps: expiredOtps.count,
          expiredTokens: expiredTokens.count,
          expiredRateLimits: expiredRateLimits.count,
        },
      };
    } catch (err) {
      this.logger.error('Failed to clean up tokens and OTPs', err.stack, AuthService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'cleanupTokensAndOtps',
      });
      throw throwError(
        err.message || 'Failed to clean up tokens and OTPs',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
