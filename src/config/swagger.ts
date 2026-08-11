import swaggerJSDoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 5000;

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Procurement Tracking System API',
      version: '1.0.0',
      description: 'API documentation for the procurement tracking system',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/modules/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);