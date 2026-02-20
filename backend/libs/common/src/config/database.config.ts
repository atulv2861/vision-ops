import { registerAs } from '@nestjs/config';

export const DATABASE_CONFIG = registerAs('DATABASE', () => {
  return {
    DATABASE_URL: process.env['DATABASE_URL'],
  };
});
