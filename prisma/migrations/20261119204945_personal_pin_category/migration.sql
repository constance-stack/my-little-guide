-- AlterTable
ALTER TABLE "PersonalPin" ADD COLUMN     "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "PersonalPin" ADD CONSTRAINT "PersonalPin_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
