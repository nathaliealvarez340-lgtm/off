CREATE TABLE "RegistrationVerification" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationVerification_email_key" ON "RegistrationVerification"("email");
CREATE INDEX "RegistrationVerification_expiresAt_idx" ON "RegistrationVerification"("expiresAt");
