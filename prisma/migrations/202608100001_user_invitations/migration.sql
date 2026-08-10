ALTER TYPE "UserStatus" ADD VALUE 'INVITED';

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE TABLE "UserInvitationToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  CONSTRAINT "UserInvitationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInvitationToken_tokenHash_key"
  ON "UserInvitationToken"("tokenHash");
CREATE INDEX "UserInvitationToken_userId_expiresAt_idx"
  ON "UserInvitationToken"("userId", "expiresAt");

ALTER TABLE "UserInvitationToken" ADD CONSTRAINT "UserInvitationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
