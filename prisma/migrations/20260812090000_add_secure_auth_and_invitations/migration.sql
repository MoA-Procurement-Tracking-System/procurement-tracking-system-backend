-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('PASSWORD_CHANGE', 'AUTHENTICATED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OFFICER', 'DIRECTOR', 'ENDORSING_COMMITTEE', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- AlterTable
-- Add displayName as nullable first so existing users can be backfilled safely.
ALTER TABLE "User"
ADD COLUMN "authRole" "UserRole" NOT NULL DEFAULT 'OFFICER',
ADD COLUMN "displayName" TEXT,
ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "tempPasswordExpiresAt" TIMESTAMP(3),
ADD COLUMN "username" TEXT;

UPDATE "User" SET "displayName" = "name" WHERE "displayName" IS NULL;

ALTER TABLE "User" ALTER COLUMN "displayName" SET NOT NULL;

-- Preserve procurement roles while initializing their matching auth roles.
UPDATE "User"
SET "authRole" = CASE "role"::text
  WHEN 'ProcurementDirector' THEN 'DIRECTOR'::"UserRole"
  WHEN 'Administrator' THEN 'ADMIN'::"UserRole"
  WHEN 'ManagementTeam' THEN 'ENDORSING_COMMITTEE'::"UserRole"
  ELSE 'OFFICER'::"UserRole"
END;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" "SessionKind" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvitationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserInvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "email" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitationToken_tokenHash_key" ON "UserInvitationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvitationToken_userId_expiresAt_idx" ON "UserInvitationToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthAuditLog_userId_createdAt_idx" ON "AuthAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditLog_event_createdAt_idx" ON "AuthAuditLog"("event", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_authRole_status_idx" ON "User"("authRole", "status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvitationToken" ADD CONSTRAINT "UserInvitationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
