-- 012_billing_portal.sql
-- Adds customer_portal_url to subscriptions for Lemon Squeezy portal deep-link

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS customer_portal_url text;
