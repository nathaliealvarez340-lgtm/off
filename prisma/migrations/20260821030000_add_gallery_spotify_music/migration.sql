CREATE TYPE "GalleryMusicSource" AS ENUM ('UPLOAD', 'SPOTIFY');

ALTER TABLE "GalleryPost"
ADD COLUMN "musicSource" "GalleryMusicSource",
ADD COLUMN "spotifyUrl" TEXT,
ADD COLUMN "spotifyTrackId" TEXT;

UPDATE "GalleryPost"
SET "musicSource" = 'UPLOAD'::"GalleryMusicSource"
WHERE "audioUrl" IS NOT NULL;
