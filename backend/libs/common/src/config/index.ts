import { APP_CONFIG } from './app.config';
import { DATABASE_CONFIG } from './database.config';
import { JWT_CONFIG } from './jwt.config';
import { MONGODB_CONFIG } from './mongodb.config';
import { REDIS_CONFIG } from './redis.config';
import { validationSchema } from './validation';

const configuration = [APP_CONFIG, DATABASE_CONFIG, JWT_CONFIG, MONGODB_CONFIG, REDIS_CONFIG];
export { configuration, validationSchema };
