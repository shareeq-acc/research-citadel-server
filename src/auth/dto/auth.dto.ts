import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @ApiProperty({ type: String, required: true, example: 'Danish Siddiqui' })
  name: string;

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
