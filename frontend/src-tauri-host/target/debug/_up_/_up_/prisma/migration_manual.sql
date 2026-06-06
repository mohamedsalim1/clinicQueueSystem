-- Migration: add_patient_fields_and_fullnumber
-- Run this manually if `prisma migrate dev` fails due to DB connectivity

-- Add new columns to Clinic table
ALTER TABLE "Clinic" 
  ADD COLUMN IF NOT EXISTS "nameAr"   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- Add new columns to SystemSettings table
ALTER TABLE "SystemSettings"
  ADD COLUMN IF NOT EXISTS "clinicTitle"   TEXT NOT NULL DEFAULT 'مركز داريا الطبي',
  ADD COLUMN IF NOT EXISTS "clinicSubtitle" TEXT NOT NULL DEFAULT 'Daraya Medical Center',
  ADD COLUMN IF NOT EXISTS "footerMsg"     TEXT NOT NULL DEFAULT 'يرجى انتظار ظهور رقمك على شاشة العرض',
  ADD COLUMN IF NOT EXISTS "printerName"   TEXT NOT NULL DEFAULT 'Thermal_Printer';

-- Add new columns to QueueTicket table
ALTER TABLE "QueueTicket"
  ADD COLUMN IF NOT EXISTS "fullNumber"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "patientName"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "patientPhone"   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "patientAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "calledAt"       TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "completedAt"    TIMESTAMP;

-- Update status column to support new states (already TEXT so just a comment)
-- Supported values: waiting | called | in_progress | completed | skipped | cancelled

-- Backfill fullNumber for existing tickets (A-001 format)
UPDATE "QueueTicket" qt
SET "fullNumber" = CONCAT(c.prefix, '-', LPAD(qt.number::TEXT, 3, '0'))
FROM "Clinic" c
WHERE qt."clinicId" = c.id
  AND qt."fullNumber" = '';
