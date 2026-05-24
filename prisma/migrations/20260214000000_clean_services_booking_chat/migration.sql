-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_chatId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_senderId_fkey";
ALTER TABLE "Chat" DROP CONSTRAINT IF EXISTS "Chat_userId_fkey";
ALTER TABLE "Chat" DROP CONSTRAINT IF EXISTS "Chat_providerId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_seekerId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_providerId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_serviceId_fkey";
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_providerId_fkey";
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_categoryId_fkey";
ALTER TABLE "ServiceCategory" DROP CONSTRAINT IF EXISTS "ServiceCategory_parentId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Message";
DROP TABLE IF EXISTS "Chat";
DROP TABLE IF EXISTS "Booking";
DROP TABLE IF EXISTS "Service";
DROP TABLE IF EXISTS "ServiceCategory";

-- DropEnum
DROP TYPE IF EXISTS "BookingStatus";
