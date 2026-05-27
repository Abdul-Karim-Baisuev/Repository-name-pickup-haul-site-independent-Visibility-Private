-- ============================================================
-- HISTORICAL MIGRATION — REDACTED 2026-05-09
-- ============================================================
-- This migration originally embedded a service_role JWT literal
-- to seed the `service_role_jwt` vault secret used by DB
-- triggers. The literal was rotated and removed from source on
-- 2026-05-09 after a leak audit.
--
-- The vault secret is now set out-of-band by the operator after
-- key rotation. Do not re-introduce the old value — it was
-- rotated and is invalid.
-- Marker: REDACTED_ROTATED_2026_05_09
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'service_role_jwt seed skipped — REDACTED_ROTATED_2026_05_09';
END $$;
