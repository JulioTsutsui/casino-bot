-- CreateTable
CREATE TABLE "User" (
    "discordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nextDaily" TIMESTAMP(3) NOT NULL,
    "chips" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("discordId")
);
