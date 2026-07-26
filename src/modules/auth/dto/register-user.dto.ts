import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export const PUBLIC_REGISTER_ROLES = [UserRole.CUSTOMER, UserRole.VENDOR] as const;

export class RegisterUserDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    enum: PUBLIC_REGISTER_ROLES,
    example: UserRole.CUSTOMER,
    description: 'Self-registration allows CUSTOMER or VENDOR only',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
