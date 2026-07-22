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
    "scheduledFor" DATETIME,
    "declinedProviderIds" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Booking" ("address", "assignedAt", "cancelledAt", "category", "completedAt", "createdAt", "customerId", "customerLat", "customerLng", "estimatedHours", "hours", "id", "notes", "paidAt", "paymentStatus", "paymongoCheckoutSessionId", "paymongoCheckoutUrl", "price", "propertyType", "providerId", "quantity", "serviceType", "startedAt", "status") SELECT "address", "assignedAt", "cancelledAt", "category", "completedAt", "createdAt", "customerId", "customerLat", "customerLng", "estimatedHours", "hours", "id", "notes", "paidAt", "paymentStatus", "paymongoCheckoutSessionId", "paymongoCheckoutUrl", "price", "propertyType", "providerId", "quantity", "serviceType", "startedAt", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
