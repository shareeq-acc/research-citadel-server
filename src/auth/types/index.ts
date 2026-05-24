import { User } from '@prisma/client';

export type JwtPayload = {
  id: string;
  email: string;
};

export interface RegisterUserResponse {
  user: Omit<User, 'password' | 'salt'>;
  token: string;
}

export interface LoginUserResponse {
  user: Omit<User, 'password' | 'salt'>;
  token: string;
}

export interface OtpVerificationResponse {
  token?: string;
}
