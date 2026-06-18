ALTER TABLE prodotti ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'patch';
UPDATE prodotti SET tipo = 'nameset';
