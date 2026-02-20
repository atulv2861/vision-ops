import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(
    'development',
    'production',
    'staging',
    'localhost',
  ),
  APP_PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().optional(),
  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRATION: Joi.string().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().optional(),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().optional(),
  REDIS_KEY_PREFIX: Joi.string().optional(),
  MONGO_URI: Joi.string().optional(),
  MONGO_DB: Joi.string().optional(),
  KAFKA_BROKER: Joi.string().optional(),
});
