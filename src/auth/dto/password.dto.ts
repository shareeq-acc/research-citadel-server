import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email' })
  @Transform(({ value }) => value.trim().toLowerCase())
  @ApiProperty({
    type: String,
    required: true,
    example: 'danishsidd203@gmail.com',
  })
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'New password must be a string' })
  @ApiProperty({
    type: String,
    required: true,
    example: 'Abc12345%',
  })
  newPassword: string;

  @IsNotEmpty({ message: 'Reset token is required' })
  @IsString({ message: 'Reset token must be a string' })
  @ApiProperty({
    type: String,
    required: true,
    example: 'reset-token-example',
  })
  resetToken: string;
}
