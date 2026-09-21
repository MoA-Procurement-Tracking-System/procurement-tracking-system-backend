import { getZodOpenApiSpec } from './openapi.js';

export function getSwaggerSpec() {
  return getZodOpenApiSpec();
}

export const swaggerSpec = getSwaggerSpec();
