import { getZodOpenApiSpec } from './openapi.js';

export function getSwaggerSpec() {
  return getZodOpenApiSpec();
}

export const swaggerSpec = new Proxy({} as ReturnType<typeof getZodOpenApiSpec>, {
  get(_target, prop) {
    const spec = getZodOpenApiSpec();
    return (spec as unknown as Record<string | symbol, unknown>)[prop];
  },
});
