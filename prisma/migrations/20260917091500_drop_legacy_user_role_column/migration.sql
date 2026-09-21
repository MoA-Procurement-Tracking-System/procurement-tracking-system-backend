-- AlterTable
-- Drop legacy "role" column on "User" table that violates NOT NULL constraint during user creation
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
