-- AlterTable
CREATE SEQUENCE "article_id_seq";
ALTER TABLE "Article" ALTER COLUMN "id" SET DEFAULT nextval('article_id_seq');
ALTER SEQUENCE "article_id_seq" OWNED BY "public"."Article"."id";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "discriminator" SET DATA TYPE TEXT,
ALTER COLUMN "rank" SET DEFAULT E'guest';
