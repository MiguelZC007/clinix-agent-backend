-- CreateTable
CREATE TABLE "ProcessedWebhookMessage" (
    "messageSid" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookMessage_pkey" PRIMARY KEY ("messageSid")
);
