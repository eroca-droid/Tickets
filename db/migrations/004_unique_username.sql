-- Migración: proteger la unicidad del usuario corto.
-- Ejecutar únicamente después de verificar que no existan duplicados.
-- No modifica correos, contraseñas ni perfiles existentes.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON profiles (
    LOWER(SPLIT_PART(email::text, '@', 1))
);

COMMIT;
