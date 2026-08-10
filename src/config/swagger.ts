import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Procurement Tracking System API',
      version: '1.0.0',
      description: 'API documentation for the procurement tracking system',
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER_URL ?? '/',
      },
    ],
  },
  apis: [join(__dirname, '../modules') + '/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
