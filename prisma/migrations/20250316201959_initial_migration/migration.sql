-- CreateTable
CREATE TABLE "Bylaw" (
    "bylawNumber" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "isConsolidated" BOOLEAN NOT NULL DEFAULT false,
    "pdfPath" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "lastVerified" DATETIME NOT NULL,
    "consolidatedDate" TEXT,
    "enactmentDate" TEXT,
    "amendments" TEXT
);

-- CreateTable
CREATE TABLE "BylawSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bylawNumber" TEXT NOT NULL,
    "sectionNumber" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    CONSTRAINT "BylawSection_bylawNumber_fkey" FOREIGN KEY ("bylawNumber") REFERENCES "Bylaw" ("bylawNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CitationFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bylawNumber" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "userComment" TEXT,
    "timestamp" DATETIME NOT NULL,
    CONSTRAINT "CitationFeedback_bylawNumber_fkey" FOREIGN KEY ("bylawNumber") REFERENCES "Bylaw" ("bylawNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VectorDatabaseEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bylawNumber" TEXT NOT NULL,
    "vectorId" TEXT NOT NULL,
    "section" TEXT,
    "timestamp" DATETIME NOT NULL,
    "metadata" JSONB
);

-- CreateTable
CREATE TABLE "BylawUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bylawNumber" TEXT NOT NULL,
    "updateType" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "details" TEXT
);

-- CreateTable
CREATE TABLE "WebScrapeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "newBylaws" INTEGER NOT NULL DEFAULT 0,
    "updatedBylaws" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT
);

-- CreateTable
CREATE TABLE "SearchQueryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "topResult" TEXT,
    "timestamp" DATETIME NOT NULL,
    "userFeedback" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "BylawSection_bylawNumber_sectionNumber_key" ON "BylawSection"("bylawNumber", "sectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VectorDatabaseEntry_bylawNumber_vectorId_key" ON "VectorDatabaseEntry"("bylawNumber", "vectorId");
