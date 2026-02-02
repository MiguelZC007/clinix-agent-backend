-- CreateTable
CREATE TABLE "WhatsAppAuthSession" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "authToken" TEXT NOT NULL,
    "authTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAuthSession_phoneNumber_key" ON "WhatsAppAuthSession"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAuthSession_authToken_key" ON "WhatsAppAuthSession"("authToken");
