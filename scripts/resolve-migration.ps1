# Run this script with your Render External DATABASE_URL to resolve the failed migration
# Usage: $env:DATABASE_URL="postgresql://...render..."; .\scripts\resolve-migration.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl
)

$env:DATABASE_URL = $DatabaseUrl
npx prisma migrate resolve --rolled-back 20260825191228_add_pending_invitation_status
Write-Host "Done! Now redeploy on Render."
