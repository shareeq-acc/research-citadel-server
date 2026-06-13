import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @ApiProperty({ type: String, required: false, example: 'John Doe' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  @ApiProperty({
    type: String,
    required: false,
    description: 'Avatar URL, custom-avatar:: JSON spec, or null for letter default',
    example: 'custom-avatar::{"gender":"femme","bg":"#38BDF8"}',
  })
  avatar?: string | null;

  @IsOptional()
  @IsString({ message: 'Motto must be a string' })
  @ApiProperty({
    type: String,
    required: false,
    example: 'Grounded analysis, zero assumptions',
  })
  motto?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be a valid Gender enum value' })
  @ApiProperty({ type: String, enum: Gender, required: false, example: Gender.MALE })
  gender?: Gender;

  @IsOptional()
  @IsInt({ message: 'Age must be an integer' })
  @Min(1, { message: 'Age must be at least 1' })
  @Max(120, { message: 'Age must be at most 120' })
  @ApiProperty({ type: Number, required: false, example: 25 })
  age?: number;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @ApiProperty({ type: String, required: false, example: '123 Main Street' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @ApiProperty({ type: String, required: false, example: 'New York' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'State must be a string' })
  @ApiProperty({ type: String, required: false, example: 'NY' })
  state?: string;

  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  @ApiProperty({ type: String, required: false, example: 'USA' })
  country?: string;

  @IsOptional()
  @IsString({ message: 'Postal code must be a string' })
  @ApiProperty({ type: String, required: false, example: '10001' })
  postalCode?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @ApiProperty({ type: String, required: false, example: '+1234567890' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Website must be a string' })
  @ApiProperty({ type: String, required: false, example: 'https://example.com' })
  website?: string;

  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @ApiProperty({ type: String, required: false, example: 'Software developer passionate about technology' })
  bio?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a number' })
  @ApiProperty({ type: Number, required: false, example: -73.935242 })
  longitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a number' })
  @ApiProperty({ type: Number, required: false, example: 40.73061 })
  latitude?: number;
}
