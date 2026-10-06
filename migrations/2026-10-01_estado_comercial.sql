-- Separa calificación (por capital) de seguimiento comercial y agrega consultor asignado.
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS estado_comercial TEXT NOT NULL DEFAULT 'nuevo';
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS asignado_a TEXT;

-- "En proceso" era seguimiento, no calificación: pasa a estado "contactado"
-- y la calificación vuelve a calcularse sola por capital.
UPDATE diagnosticos SET estado_comercial = 'contactado', clasificacion = NULL
WHERE clasificacion = 'en_proceso';
