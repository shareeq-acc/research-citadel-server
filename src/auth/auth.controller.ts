import { Body, Controller, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ConfirmEmailDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { ApiResponse } from 'src/common/types';
import { ConfirmEmailResponse, LoginUserResponse, RegisterUserResponse } from './types';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { Cron } from '@nestjs/schedule';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiProperty({
    title: 'Register User',
    description: 'Register a new user',
    type: RegisterDto,
  })
  async register(
    @Res({ passthrough: true }) res: Response,
    @Body() registerDto: RegisterDto,
  ): Promise<ApiResponse<RegisterUserResponse>> {
    return this.authService.register(res, registerDto);
  }

  @Post('login')
  @ApiProperty({
    title: 'Login User',
    description: 'Login a user',
    type: LoginDto,
  })
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponse<LoginUserResponse>> {
    return this.authService.login(res, loginDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiProperty({
    title: 'Logout User',
    description: 'Logout a user',
  })
  async logout(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response): Promise<ApiResponse<void>> {
    return this.authService.logout(user, res);
  }

  @Post('forgot-password')
  @ApiProperty({ title: 'Forgot Password', type: ForgotPasswordDto })
  async forgotPassword(@Req() request: Request, @Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(request, dto);
  }

  @Post('reset-password')
  @ApiProperty({ title: 'Reset Password', type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto);
  }

  @Put('verify-email')
  @UseGuards(AuthGuard)
  @ApiProperty({ title: 'Send Email Verification Link' })
  async verifyEmail(@Req() request: Request, @CurrentUser() user: User) {
    return await this.authService.verifyEmail(request, user);
  }

  @Post('confirm-email')
  @ApiProperty({ title: 'Confirm Email Verification', type: ConfirmEmailDto })
  async confirmEmail(@Body() dto: ConfirmEmailDto): Promise<ApiResponse<ConfirmEmailResponse>> {
    return await this.authService.confirmEmailVerification(dto.token);
  }

  @Post('send-otp')
  @ApiProperty({ title: 'Send OTP', type: SendOtpDto })
  async sendOtp(@Req() request: Request, @Body() dto: SendOtpDto) {
    return await this.authService.sendOtp(request, dto);
  }

  @Post('resend-otp')
  @ApiProperty({ title: 'Resend OTP', type: SendOtpDto })
  async resendOtp(@Req() request: Request, @Body() dto: SendOtpDto) {
    return await this.authService.resendOtp(request, dto);
  }

  @Post('verify-otp')
  @ApiProperty({ title: 'Verify OTP', type: VerifyOtpDto })
  async verifyOtp(@Req() request: Request, @Body() dto: VerifyOtpDto) {
    return await this.authService.verifyOtp(request, dto);
  }

  @Cron('0 0 * * *') // Runs every day at midnight
  @ApiOperation({ summary: 'Cleanup Tokens and OTPs' })
  async cleanupTokensAndOtps() {
    return await this.authService.cleanupTokensAndOtps();
  }
}
