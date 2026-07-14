-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisplayState" AS ENUM ('IDLE', 'CURRENT', 'REPEAT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('DRAFT', 'COMPLETED', 'SIGNED');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('SELF', 'WIFE', 'HUSBAND', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'RECEPTION', 'DOCTOR', 'DISPLAY');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'CALL', 'PRINT');

-- CreateEnum
CREATE TYPE "DictionaryType" AS ENUM ('COMPLAINT', 'DIAGNOSIS', 'MEDICATION', 'PROCEDURE', 'NOTE_TEMPLATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePass" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "licenseNo" TEXT,
    "stampUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorClinic" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "DoctorClinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "familyCode" TEXT NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "primaryName" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "fileNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relation" "RelationType" NOT NULL DEFAULT 'SELF',
    "gender" "Gender",
    "birthDate" TIMESTAMP(3),
    "phoneOptional" TEXT,
    "lastVisitAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "familyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "VisitStatus" NOT NULL DEFAULT 'DRAFT',
    "complaint" TEXT,
    "diagnosis" TEXT,
    "notes" TEXT,
    "prescription" TEXT,
    "patientId" TEXT NOT NULL,
    "ticketId" TEXT,
    "createdByDoctorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueTicket" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "fullNumber" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "displayState" "DisplayState" NOT NULL DEFAULT 'IDLE',
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "doctorId" TEXT,

    CONSTRAINT "QueueTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL DEFAULT '',
    "prefix" TEXT NOT NULL DEFAULT 'A',
    "audioKey" TEXT NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQueueCounter" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "counterDate" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyQueueCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDictionary" (
    "id" TEXT NOT NULL,
    "type" "DictionaryType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementHistory" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fullNumber" TEXT NOT NULL,
    "audioSequence" JSONB,
    "announcedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actionType" "ActionType" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "device" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorClinic_doctorId_clinicId_key" ON "DoctorClinic"("doctorId", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Family_familyCode_key" ON "Family"("familyCode");

-- CreateIndex
CREATE INDEX "Family_primaryPhone_idx" ON "Family"("primaryPhone");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_fileNumber_key" ON "Patient"("fileNumber");

-- CreateIndex
CREATE INDEX "Patient_firstName_fatherName_lastName_idx" ON "Patient"("firstName", "fatherName", "lastName");

-- CreateIndex
CREATE INDEX "Patient_fileNumber_idx" ON "Patient"("fileNumber");

-- CreateIndex
CREATE INDEX "Patient_familyId_idx" ON "Patient"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_ticketId_key" ON "Visit"("ticketId");

-- CreateIndex
CREATE INDEX "QueueTicket_fullNumber_key" ON "QueueTicket"("fullNumber");

-- CreateIndex
CREATE INDEX "QueueTicket_clinicId_status_idx" ON "QueueTicket"("clinicId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QueueTicket_clinicId_number_key" ON "QueueTicket"("clinicId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_audioKey_key" ON "Clinic"("audioKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQueueCounter_clinicId_counterDate_key" ON "DailyQueueCounter"("clinicId", "counterDate");

-- CreateIndex
CREATE INDEX "MedicalDictionary_type_displayName_idx" ON "MedicalDictionary"("type", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorClinic" ADD CONSTRAINT "DoctorClinic_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorClinic" ADD CONSTRAINT "DoctorClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "QueueTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdByDoctorId_fkey" FOREIGN KEY ("createdByDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueTicket" ADD CONSTRAINT "QueueTicket_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueTicket" ADD CONSTRAINT "QueueTicket_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueTicket" ADD CONSTRAINT "QueueTicket_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQueueCounter" ADD CONSTRAINT "DailyQueueCounter_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDictionary" ADD CONSTRAINT "MedicalDictionary_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementHistory" ADD CONSTRAINT "AnnouncementHistory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementHistory" ADD CONSTRAINT "AnnouncementHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "QueueTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
