import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
        url: `http://localhost:${process.env.PORT ?? 3000}`,
      },
    ],
  },
  apis: [join(__dirname, '../modules') + '/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
