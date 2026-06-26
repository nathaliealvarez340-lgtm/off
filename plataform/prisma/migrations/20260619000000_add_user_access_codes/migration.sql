ALTER TABLE "User" ADD COLUMN "accessCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "accessCodeLookup" TEXT;

ALTER TABLE "RegistrationVerification" ADD COLUMN "accessCodeHash" TEXT;
ALTER TABLE "RegistrationVerification" ADD COLUMN "accessCodeLookup" TEXT;

UPDATE "RegistrationVerification"
SET
  "accessCodeHash" = "codeHash",
  "accessCodeLookup" = 'legacy-registration-' || "id"
WHERE "accessCodeHash" IS NULL OR "accessCodeLookup" IS NULL;

ALTER TABLE "RegistrationVerification" ALTER COLUMN "accessCodeHash" SET NOT NULL;
ALTER TABLE "RegistrationVerification" ALTER COLUMN "accessCodeLookup" SET NOT NULL;

CREATE UNIQUE INDEX "User_accessCodeLookup_key" ON "User"("accessCodeLookup");
CREATE UNIQUE INDEX "RegistrationVerification_accessCodeLookup_key" ON "RegistrationVerification"("accessCodeLookup");
