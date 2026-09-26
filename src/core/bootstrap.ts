import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../utils/password.js';
import { UserRole, UserStatus } from '../generated/prisma/index.js';

interface BaselineLookup {
  type: string;
  code: string;
  label: string;
}

const BASELINE_LOOKUPS: BaselineLookup[] = [
  // Sectors
  {
    type: 'SECTOR',
    code: 'SEC_AGRI',
    label: 'Agriculture and Horticulture Development Sector',
  },
  {
    type: 'SECTOR',
    code: 'SEC_INPUT',
    label: 'Agricultural Investment and Input Sector',
  },
  {
    type: 'SECTOR',
    code: 'SEC_LIVESTOCK',
    label: 'Livestock Resource Development Sector',
  },
  {
    type: 'SECTOR',
    code: 'SEC_MGMT',
    label: 'Management Chief Executives',
  },
  {
    type: 'SECTOR',
    code: 'SEC_MINISTER',
    label: 'Minister Office',
  },
  {
    type: 'SECTOR',
    code: 'SEC_NAT',
    label: 'Natural Resource Development Sector',
  },
  {
    type: 'SECTOR',
    code: 'SEC_GEN',
    label: 'General Agriculture Sector',
  },

  // Funding Sources
  {
    type: 'FUNDING_SOURCE',
    code: 'FS_WB',
    label: 'World Bank (IDA)',
  },
  {
    type: 'FUNDING_SOURCE',
    code: 'FS_AFDB',
    label: 'African Development Bank (AfDB)',
  },
  {
    type: 'FUNDING_SOURCE',
    code: 'FS_GOV',
    label: 'Government Treasury (መንግሥት)',
  },
  {
    type: 'FUNDING_SOURCE',
    code: 'FS_UNOPS',
    label: 'UNOPS',
  },
  {
    type: 'FUNDING_SOURCE',
    code: 'FS_IFAD',
    label: 'IFAD (International Fund for Agricultural Development)',
  },
  {
    type: 'FUNDING_SOURCE',
    code: 'FS_EU',
    label: 'EU Grant / European Union',
  },
  {
    type: 'FUNDING_SOURCE',
    code: 'FS_GEN',
    label: 'General Funding Source',
  },

  // Funding Types
  {
    type: 'FUNDING_TYPE',
    code: 'FT_TREASURY',
    label: 'Treasury',
  },
  {
    type: 'FUNDING_TYPE',
    code: 'FT_LOAN',
    label: 'Loan',
  },
  {
    type: 'FUNDING_TYPE',
    code: 'FT_GRANT',
    label: 'Grant',
  },
  {
    type: 'FUNDING_TYPE',
    code: 'FT_MIXED',
    label: 'Mixed (Loan & Grant)',
  },

  // Procurement Methods
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_RFQ',
    label: 'Request for Quotations (RFQ)',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_QCBS',
    label: 'Quality and Cost-Based Selection (QCBS)',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_NCB',
    label: 'National Competitive Bidding (NCB)',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_ICB',
    label: 'International Competitive Bidding (ICB)',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_SSS',
    label: 'Single Source Selection (SSS)',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_DIR',
    label: 'Direct Contracting',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_CQS',
    label: 'Consultant Qualification Selection (CQS)',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_INDV',
    label: 'Individual Consultant Selection',
  },
  {
    type: 'PROCUREMENT_METHOD',
    code: 'PM_FA',
    label: 'Framework Agreement',
  },

  // Currencies
  {
    type: 'CURRENCY',
    code: 'ETB',
    label: 'ETB (Ethiopian Birr)',
  },
  {
    type: 'CURRENCY',
    code: 'USD',
    label: 'USD ($)',
  },
  {
    type: 'CURRENCY',
    code: 'UA',
    label: 'UA (Unit of Account - AfDB)',
  },
  {
    type: 'CURRENCY',
    code: 'EUR',
    label: 'EUR (€)',
  },

  // Project Codes
  {
    type: 'PROJECT_CODE',
    code: 'DRIVE',
    label: 'De-risking, Inclusion and Value Enhancement Project (DRIVE)',
  },
  {
    type: 'PROJECT_CODE',
    code: 'CALM',
    label: 'Climate Action through Landscape Management (CALM)',
  },
  {
    type: 'PROJECT_CODE',
    code: 'BREFONS',
    label: 'Building Resilience for Food and Nutrition Security (BREFONS)',
  },
  {
    type: 'PROJECT_CODE',
    code: 'RLLP',
    label: 'Resilient Landscapes and Livelihoods Project (RLLP)',
  },
  {
    type: 'PROJECT_CODE',
    code: 'AGP-II',
    label: 'Agricultural Growth Program II (AGP-II)',
  },
];

interface BaselineUser {
  email: string;
  name: string;
  displayName: string;
  authRole: UserRole;
  password?: string;
}

const DEFAULT_SEED_PASSWORD = '[Password123!]';

const BASELINE_USERS: BaselineUser[] = [
  {
    email: env.BOOTSTRAP_ADMIN_EMAIL || 'admin@moa.gov.et',
    name: env.BOOTSTRAP_ADMIN_NAME || 'System Administrator',
    displayName: env.BOOTSTRAP_ADMIN_NAME || 'System Administrator',
    authRole: UserRole.ADMIN,
    password: env.BOOTSTRAP_ADMIN_PASSWORD || DEFAULT_SEED_PASSWORD,
  },
  {
    email: env.BOOTSTRAP_DIRECTOR_EMAIL || 'director@moa.gov.et',
    name: env.BOOTSTRAP_DIRECTOR_NAME || 'Procurement Director',
    displayName: env.BOOTSTRAP_DIRECTOR_NAME || 'Procurement Director',
    authRole: UserRole.DIRECTOR,
    password: env.BOOTSTRAP_DIRECTOR_PASSWORD || DEFAULT_SEED_PASSWORD,
  },
  {
    email: 'officer@moa.gov.et',
    name: 'Abebe Bikila',
    displayName: 'Abebe Bikila (Procurement Officer)',
    authRole: UserRole.OFFICER,
    password: DEFAULT_SEED_PASSWORD,
  },
  {
    email: 'almaz.officer@moa.gov.et',
    name: 'Almaz Ayana',
    displayName: 'Almaz Ayana (Procurement Officer)',
    authRole: UserRole.OFFICER,
    password: DEFAULT_SEED_PASSWORD,
  },
  {
    email: 'yeabsira.fikre@moa.gov.et',
    name: 'Yeabsira Fikre',
    displayName: 'Yeabsira Fikre (Procurement Officer)',
    authRole: UserRole.OFFICER,
    password: DEFAULT_SEED_PASSWORD,
  },
  {
    email: 'committee@moa.gov.et',
    name: 'Workneh Tsionawit',
    displayName: 'Workneh Tsionawit (Committee)',
    authRole: UserRole.ENDORSING_COMMITTEE,
    password: DEFAULT_SEED_PASSWORD,
  },
  {
    email: 'management@moa.gov.et',
    name: 'Executive Management Team',
    displayName: 'State Minister / Management Team',
    authRole: UserRole.MANAGEMENT,
    password: DEFAULT_SEED_PASSWORD,
  },
];

/**
 * Ensures required baseline lookups and system users exist in the database.
 * Completely idempotent — will not overwrite existing customized records.
 */
export async function bootstrapSystem(): Promise<void> {
  try {
    // 1. Seed baseline lookups
    for (const item of BASELINE_LOOKUPS) {
      await prisma.lookupValue.upsert({
        where: {
          type_code: {
            type: item.type,
            code: item.code,
          },
        },
        update: {
          isActive: true,
        },
        create: {
          type: item.type,
          code: item.code,
          label: item.label,
          isActive: true,
        },
      });
    }
    logger.info('System lookups successfully synchronized.');

    // 2. Seed baseline users
    for (const u of BASELINE_USERS) {
      const existing = await prisma.user.findUnique({
        where: { email: u.email.toLowerCase() },
      });

      if (!existing) {
        const passwordHash = await hashPassword(
          u.password || DEFAULT_SEED_PASSWORD,
        );
        await prisma.user.create({
          data: {
            email: u.email.toLowerCase(),
            name: u.name,
            displayName: u.displayName,
            authRole: u.authRole,
            status: UserStatus.ACTIVE,
            isActive: true,
            mustChangePassword: false,
            passwordHash,
          },
        });
        logger.info(
          { email: u.email, role: u.authRole },
          'Bootstrapped default user account',
        );
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Warning during bootstrapSystem synchronization');
  }
}
