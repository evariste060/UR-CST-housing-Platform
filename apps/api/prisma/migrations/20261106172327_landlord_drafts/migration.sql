-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_locationId_fkey";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "draft" JSONB,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "locationId" DROP NOT NULL,
ALTER COLUMN "distanceKm" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PropertyPhoto" ADD COLUMN     "pendingAdd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pendingRemove" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
