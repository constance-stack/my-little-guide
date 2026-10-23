-- CreateEnum
CREATE TYPE "DestinationRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "DestinationRequest" (
    "id" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "targetPlaceCount" INTEGER,
    "notes" TEXT,
    "status" "DestinationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DestinationRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DestinationRequest" ADD CONSTRAINT "DestinationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
