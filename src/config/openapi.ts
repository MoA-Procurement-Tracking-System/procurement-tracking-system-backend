import { z } from 'zod';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { env } from './env.js';

// Extend Zod with .openapi() method
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Register shared security components
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Bearer token authentication',
});

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: env.SESSION_COOKIE_NAME,
  description: 'Session cookie authentication',
});

/**
 * Generate OpenAPI 3.0 specification from registered Zod schemas and routes
 */
export function getZodOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Procurement Tracking System API',
      version: '1.0.0',
      description: 'Type-safe API documentation generated from Zod schemas',
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
  });
}
