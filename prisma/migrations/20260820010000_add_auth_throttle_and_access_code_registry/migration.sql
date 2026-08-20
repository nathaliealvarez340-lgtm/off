CREATE TABLE "AuthThrottle" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AccessCodeRegistry" (
    "lookup" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessCodeRegistry_pkey" PRIMARY KEY ("lookup")
);

INSERT INTO "AccessCodeRegistry" ("lookup", "userId")
SELECT "accessCodeLookup", "id"
FROM "User"
WHERE "accessCodeLookup" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX "AuthThrottle_updatedAt_idx" ON "AuthThrottle"("updatedAt");
CREATE UNIQUE INDEX "AccessCodeRegistry_userId_key" ON "AccessCodeRegistry"("userId");
