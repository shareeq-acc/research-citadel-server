import { HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';

export const throwError = (message: string | any, statusCode?: number): HttpException => {
  return new HttpException(message, statusCode || HttpStatus.INTERNAL_SERVER_ERROR);
};

export const getRandomFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export const generateSecureOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    const randIndex = crypto.randomInt(0, digits.length);
    otp += digits[randIndex];
  }
  return otp;
};
