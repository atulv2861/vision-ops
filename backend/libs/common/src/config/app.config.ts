export const APP_CONFIG = () => {
  return {
    APP_URL: process.env['APP_URL'],
    APP_NAME: process.env['APP_NAME'] || 'traffic-violation-api',
    APP_PORT: process.env['APP_PORT'],
    APP_ENV: process.env['NODE_ENV'],
    KAFKA_BROKER: process.env['KAFKA_BROKER'],
  };
};
