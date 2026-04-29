-- Migration 028: PACER credentials per user (v2.0)
-- Stored in user_roles alongside existing byok_key pattern

alter table user_roles
  add column if not exists pacer_username text,
  add column if not exists pacer_password text;
