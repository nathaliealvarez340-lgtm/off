CREATE TABLE "MemberProfile" (
  "userId" TEXT NOT NULL,
  "memberNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "MemberProfile_memberNumber_key" ON "MemberProfile"("memberNumber");

ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MemberProfile" ("userId", "memberNumber", "createdAt")
SELECT
  "id",
  (2555 + ROW_NUMBER() OVER (
    ORDER BY
      CASE WHEN LOWER("name") = 'frida' THEN 0 ELSE 1 END,
      "createdAt",
      "id"
  ))::INTEGER,
  CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'USER';
