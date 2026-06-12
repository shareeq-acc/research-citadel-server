import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, Matches, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @ApiProperty({ type: String, required: true, example: 'Danish Siddiqui' })
  name: string;

  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must be at most 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username may only contain letters, numbers, and underscores' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @ApiProperty({ type: String, required: true, example: 'danish_dev', description: 'Alphanumeric + underscores, 3–30 chars, unique' })
  username: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email' })
  @Transform(({ value }) => value.trim().toLowerCase())
  @ApiProperty({ type: String, required: true, example: 'danishsidd524@gmail.com' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword(
    { minLength: 6, minSymbols: 1, minLowercase: 1, minNumbers: 1, minUppercase: 1 },
    { message: 'Password is too weak' },
  )
  @ApiProperty({ type: String, required: true, example: 'Abc12345%' })
  password: string;
}

export class ConfirmEmailDto {
  @IsNotEmpty({ message: 'Verification token is required' })
  @IsString({ message: 'Verification token must be a string' })
  @ApiProperty({ type: String, required: true, example: 'a1b2c3d4e5f6...' })
  token: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value.trim().toLowerCase())
  @ApiProperty({ type: String, required: true, example: 'danishsidd524@gmail.com' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @ApiProperty({ type: String, required: true, example: 'Abc12345%' })
  password: string;
}
