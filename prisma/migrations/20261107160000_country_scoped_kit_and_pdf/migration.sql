-- Replaces the single global "kit entitlement" row (Entitlement with
-- destinationId = null, ambiguous as to which country it was for) with a
-- proper per-country KitEntitlement, and replaces the per-order PdfJob
-- with a per-(user, country) CountryPdfJob — a customer's PDF for a
-- country now combines every destination they own there, however many
-- separate orders granted them, instead of one incomplete PDF per order
-- and only the first purchased country's kit inside it.

-- CreateTable
CREATE TABLE "KitEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KitEntitlement_userId_countryId_key" ON "KitEntitlement"("userId", "countryId");

-- AddForeignKey
ALTER TABLE "KitEntitlement" ADD CONSTRAINT "KitEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitEntitlement" ADD CONSTRAINT "KitEntitlement_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitEntitlement" ADD CONSTRAINT "KitEntitlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CountryPdfJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "storageKey" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryPdfJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CountryPdfJob_userId_countryId_key" ON "CountryPdfJob"("userId", "countryId");

-- AddForeignKey
ALTER TABLE "CountryPdfJob" ADD CONSTRAINT "CountryPdfJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryPdfJob" ADD CONSTRAINT "CountryPdfJob_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Pre-launch, test-mode purchases only (per project notes) — safe to drop
-- rather than migrate: every real "kit unlocked" and "PDF ready" row will
-- be regenerated correctly, per-country, the next time each customer buys
-- or downloads.

-- DropForeignKey
ALTER TABLE "PdfJob" DROP CONSTRAINT "PdfJob_orderId_fkey";

-- DropTable
DROP TABLE "PdfJob";

-- Drop the old global kit-entitlement rows (Entitlement.destinationId IS
-- NULL) — these are superseded by KitEntitlement above and would
-- otherwise sit as dead, unreadable rows (nothing in the app queries
-- Entitlement by a null destinationId anymore).
DELETE FROM "Entitlement" WHERE "destinationId" IS NULL;
