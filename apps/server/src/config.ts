import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    port: parseInt(process.env.PORT, 10),
    postgres: {
      host: process.env.DB_HOST,
      name: process.env.DB_NAME,
      
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT, 10),
    },
    jwtSecret: process.env.JWT_SECRET,
  };
});
