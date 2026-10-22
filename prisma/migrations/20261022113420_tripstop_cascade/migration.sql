-- DropForeignKey
ALTER TABLE "TripStop" DROP CONSTRAINT "TripStop_tripDayId_fkey";

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
