-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "last_edited" INTEGER NOT NULL,
    "edit_count" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" INTEGER NOT NULL,
    "avatar" TEXT NOT NULL,
    "rank" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Article.id_unique" ON "Article"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User.id_unique" ON "User"("id");
