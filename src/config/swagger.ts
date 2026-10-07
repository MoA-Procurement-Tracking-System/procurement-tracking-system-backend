import { getZodOpenApiSpec } from './openapi.js';

// Ensure all API route schemas and paths are registered before generating spec
import '../modules/auth/auth.validation.js';
import '../modules/users/user.validation.js';
import '../modules/projects/project.schema.js';
import '../modules/plans/plan.schema.js';
import '../modules/activities/activity.schema.js';
import '../modules/lookups/lookup.validation.js';
import '../modules/documents/document.schema.js';
import '../modules/audit-logs/audit-log.schema.js';
import '../modules/suppliers/suppliers.schema.js';
import '../modules/contracts/contracts.schema.js';
import '../modules/reports/reports.schema.js';
import '../modules/dashboard/dashboard.schema.js';
import '../modules/alerts/alerts.schema.js';
import '../modules/excel/excel.schema.js';

export function getSwaggerSpec() {
  return getZodOpenApiSpec();
}

export const swaggerSpec = getSwaggerSpec();
