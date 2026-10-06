ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS notificado_discord BOOLEAN NOT NULL DEFAULT false;
-- los leads viejos no se notifican retroactivamente
UPDATE diagnosticos SET notificado_discord = true WHERE email IS NOT NULL AND email <> '';
