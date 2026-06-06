-- =========================================================================
-- SYSTEM INDEX OPTIMIZATIONS FOR HEALTHCARE REPORTING & BI
-- =========================================================================
-- Author: Senior Healthcare BI Architect & EMR Reporting Engineer
-- Description: Composite and covering indexes tailored to speed up 
--              Queue Management, EMR visits, and Demographic query patterns.
-- NOTE: In production environments, use 'CREATE INDEX CONCURRENTLY' to avoid
--       locking the tables during execution.
-- =========================================================================

-- 1. Optimization for Queue Analytics (Waiting & Exam Times, Clinic loads, Peak Hours)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queueticket_bi_composite 
ON "QueueTicket" ("clinicId", "status", "createdAt", "doctorId", "calledAt", "completedAt");

-- 2. Optimization for EMR Visit Statistics & Seasonal Epidemiological Reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visit_bi_composite 
ON "Visit" ("createdByDoctorId", "visitDate", "status", "patientId");

-- 3. Optimization for Patient Demographics & Age/Gender Pyramids
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_bi_demographics 
ON "Patient" ("gender", "birthDate", "createdAt") 
WHERE "deletedAt" IS NULL;

-- 4. Optimization for Security Audit Trails & Malicious Activity Timeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auditlog_bi_security 
ON "AuditLog" ("actionType", "createdAt", "userId");

-- 5. Optimization for Announcement History & Speaker Recall Analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcement_bi_performance 
ON "AnnouncementHistory" ("clinicId", "ticketId", "announcedAt");

-- 6. Optimization for Medical Dictionary lookup speed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meddict_bi_lookup 
ON "MedicalDictionary" ("type", "displayName", "isActive");

-- =========================================================================
-- Operational Check Query: Verify index applicability and sizing
-- =========================================================================
-- SELECT pg_size_pretty(pg_relation_size('idx_queueticket_bi_composite')) as index_size;
