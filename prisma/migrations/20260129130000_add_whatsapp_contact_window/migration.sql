-- CreateTable
CREATE TABLE "WhatsAppContactWindow" (
    "channelNumber" TEXT NOT NULL,
    "userPhone" TEXT NOT NULL,
    "lastInboundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppContactWindow_pkey" PRIMARY KEY ("channelNumber","userPhone")
);
