-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "payoutDestinationType" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "bankCode" TEXT,
    "bankLabel" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "category" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "customerLat" REAL NOT NULL,
    "customerLng" REAL NOT NULL,
    "propertyType" TEXT,
    "hours" REAL,
    "quantity" REAL,
    "estimatedHours" REAL NOT NULL DEFAULT 2,
    "price" REAL NOT NULL,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymongoCheckoutSessionId" TEXT,
    "paymongoCheckoutUrl" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("address", "assignedAt", "cancelledAt", "category", "completedAt", "createdAt", "customerId", "customerLat", "customerLng", "estimatedHours", "hours", "id", "notes", "price", "propertyType", "providerId", "quantity", "serviceType", "startedAt", "status") SELECT "address", "assignedAt", "cancelledAt", "category", "completedAt", "createdAt", "customerId", "customerLat", "customerLng", "estimatedHours", "hours", "id", "notes", "price", "propertyType", "providerId", "quantity", "serviceType", "startedAt", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "commissionRate" REAL NOT NULL,
    "commissionAmount" REAL NOT NULL,
    "providerPayout" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "paymongoTransferId" TEXT,
    "payoutAt" DATETIME,
    "payoutError" TEXT,
    CONSTRAINT "Transaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "bookingId", "commissionAmount", "commissionRate", "createdAt", "id", "providerPayout") SELECT "amount", "bookingId", "commissionAmount", "commissionRate", "createdAt", "id", "providerPayout" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_bookingId_key" ON "Transaction"("bookingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
