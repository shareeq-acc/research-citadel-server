-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "availability" JSONB,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Booking_serviceId_startDateTime_endDateTime_idx" ON "Booking"("serviceId", "startDateTime", "endDateTime");

-- CreateIndex
CREATE INDEX "Booking_status_startDateTime_idx" ON "Booking"("status", "startDateTime");

-- CreateIndex
CREATE INDEX "Service_longitude_latitude_idx" ON "Service"("longitude", "latitude");

-- CreateIndex
CREATE INDEX "Service_categoryId_isActive_idx" ON "Service"("categoryId", "isActive");
