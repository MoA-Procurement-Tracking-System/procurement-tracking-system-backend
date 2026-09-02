import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Procurement Tracking System API',
      version: '1.0.0',
      description: 'API documentation for the procurement tracking system',
    },
    servers: [
      ...(process.env['RENDER_EXTERNAL_URL']
        ? [
            {
              url: process.env['RENDER_EXTERNAL_URL'],
              description: 'Production Server',
            },
          ]
        : []),
      {
        url: '/',
        description: 'Current Domain',
      },
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './src/modules/**/*.ts',
    './dist/routes/*.js',
    './dist/modules/**/*.js',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
