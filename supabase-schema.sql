-- Schema per il Gestionale Magazzino
-- Esegui questo script in Supabase > SQL Editor

-- Tabella Patch
CREATE TABLE IF NOT EXISTS patch (
  id SERIAL PRIMARY KEY,
  immagine TEXT,
  prodotto TEXT NOT NULL,
  in_magazzino INTEGER DEFAULT 0,
  venduti INTEGER DEFAULT 0,
  quantita_iniziale INTEGER DEFAULT 0,
  costo_totale DECIMAL(10,2) DEFAULT 0,
  costo_unitario DECIMAL(10,2) DEFAULT 0,
  ricavo_vendite DECIMAL(10,2) DEFAULT 0,
  profitto DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Tute
CREATE TABLE IF NOT EXISTS tute (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  squadra TEXT NOT NULL,
  categoria TEXT,
  stagione TEXT,
  descrizione TEXT,
  costo DECIMAL(10,2) DEFAULT 0,
  prezzo_vendita DECIMAL(10,2) DEFAULT 0,
  stato TEXT DEFAULT 'In magazzino',
  profitto DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Maglie
CREATE TABLE IF NOT EXISTS maglie (
  id SERIAL PRIMARY KEY,
  immagine TEXT,
  maglia TEXT NOT NULL,
  stagione TEXT,
  costo_maglia DECIMAL(10,2) DEFAULT 0,
  patches TEXT[] DEFAULT '{}',
  costo_patch DECIMAL(10,2) DEFAULT 0,
  costo_totale DECIMAL(10,2) DEFAULT 0,
  prezzo_vendita DECIMAL(10,2) DEFAULT 0,
  stato TEXT DEFAULT 'Da fare',
  profitto DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Vendite
CREATE TABLE IF NOT EXISTS vendite (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  categoria TEXT NOT NULL,
  prodotto TEXT NOT NULL,
  quantita INTEGER DEFAULT 1,
  totale DECIMAL(10,2) DEFAULT 0,
  piattaforma TEXT,
  cliente TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Richieste
CREATE TABLE IF NOT EXISTS richieste (
  id SERIAL PRIMARY KEY,
  data_richiesta DATE NOT NULL,
  url TEXT,
  cliente TEXT,
  categoria TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  budget DECIMAL(10,2) DEFAULT 0,
  stato TEXT DEFAULT 'In attesa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita Row Level Security (RLS) per tutte le tabelle
ALTER TABLE patch ENABLE ROW LEVEL SECURITY;
ALTER TABLE tute ENABLE ROW LEVEL SECURITY;
ALTER TABLE maglie ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendite ENABLE ROW LEVEL SECURITY;
ALTER TABLE richieste ENABLE ROW LEVEL SECURITY;

-- Policy per permettere lettura/scrittura a tutti (per semplicità)
-- In produzione potresti voler restringere queste policy
CREATE POLICY "Allow all operations on patch" ON patch FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tute" ON tute FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on maglie" ON maglie FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vendite" ON vendite FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on richieste" ON richieste FOR ALL USING (true) WITH CHECK (true);

-- Inserisci i dati esistenti

-- Patch
INSERT INTO patch (immagine, prodotto, in_magazzino, venduti, quantita_iniziale, costo_totale, costo_unitario, ricavo_vendite, profitto) VALUES
('/uploads/1769443627640-e47l9k.webp', 'Patch Serie A 04/08', 2, 19, 21, 45.37, 2.16, 207, 165.95),
('/uploads/1769443851964-0oafjg.png', 'Nameset 10/12 Del Piero', 7, 3, 10, 54.50, 5.45, 15, -1.35),
('/uploads/1769443899050-evbhhq.png', 'Nameset Messi 12/15', 7, 3, 10, 54.50, 5.45, 11, -5.35),
('/uploads/1769443873601-y9t071.png', 'Patch Serie A 10/15', 1, 3, 4, 24.00, 6.00, 25, 7.00);

-- Tute
INSERT INTO tute (tipo, squadra, categoria, stagione, descrizione, costo, prezzo_vendita, stato, profitto) VALUES
('Sopra tuta', 'Bayern Monaco', 'Allenamento', '2014/15', 'Collezione allenamento - Pep Guardiola', 14, 12, 'Venduto', -2),
('Tuta intera', 'Tottenham', 'Allenamento', '2020/21', NULL, 30, 0, 'In magazzino', 0),
('Tuta intera', 'Paris Saint-Germain', 'Allenamento', '2014/17', 'Una delle stagioni tra il 2014 e il 2017', 23, 40, 'Venduto', 17),
('Sopra', 'Fenerbahçe', 'Track Jacket', NULL, 'Adidas Track Jacket', 11, 0, 'In magazzino', 0);

-- Maglie
INSERT INTO maglie (maglia, stagione, costo_maglia, patches, costo_patch, costo_totale, prezzo_vendita, stato, profitto) VALUES
('Juventus', '2011/12', 29.19, ARRAY['Nameset 10/12 Del Piero'], 5.45, 34.64, 0, 'Venduta', -34.64),
('Barcelona', '2013/14', 26.15, ARRAY['Nameset Messi 12/15'], 5.45, 31.60, 90, 'In magazzino', 0),
('Barcelona', '2012/13', 33.69, ARRAY['Nameset Messi 12/15'], 5.45, 39.14, 0, 'Da fare', 0),
('Juventus', '2019/20', 45.00, ARRAY[]::TEXT[], 0, 45.00, 0, 'Da fare', 0),
('Bayern Monaco', '2017/18', 40.00, ARRAY[]::TEXT[], 0, 40.00, 0, 'Da fare', 0),
('Juventus', '2011/12', 27.79, ARRAY['Nameset 10/12 Del Piero'], 5.45, 33.24, 0, 'Da fare', 0);

-- Vendite
INSERT INTO vendite (data, categoria, prodotto, quantita, totale, piattaforma, cliente) VALUES
('2025-12-22', 'Patch', 'Nameset 10/12 Del Piero', 1, 15, 'Vinted', NULL),
('2026-01-17', 'Patch', 'Nameset Messi 12/15', 1, 11, 'Vinted', NULL),
('2026-01-01', 'Patch', 'Patch Serie A 04/08', 2, 25, 'Ebay', NULL),
('2026-01-04', 'Patch', 'Patch Serie A 04/08', 3, 30, 'Vinted', 'Sospeso'),
('2026-01-09', 'Patch', 'Patch Serie A 04/08', 3, 38, 'Vinted', NULL),
('2026-01-18', 'Patch', 'Patch Serie A 04/08', 2, 25, 'Vinted', NULL),
('2026-01-17', 'Patch', 'Patch Serie A 04/08', 3, 25, 'Vinted', NULL),
('2026-01-17', 'Patch', 'Patch Serie A 04/08', 1, 12, 'Vinted', NULL),
('2026-01-21', 'Patch', 'Patch Serie A 04/08', 1, 10, 'Vinted', NULL),
('2026-01-20', 'Patch', 'Patch Serie A 04/08', 1, 12, 'Vinted', NULL),
('2026-01-21', 'Patch', 'Patch Serie A 04/08', 2, 20, 'Vinted', NULL),
('2026-01-21', 'Patch', 'Patch Serie A 04/08', 1, 10, 'Vinted', NULL),
('2026-01-18', 'Patch', 'Patch Serie A 10/15', 3, 25, 'Vinted', NULL),
('2026-01-17', 'Tuta', 'Tuta intera Paris Saint-Germain 2014/17', 1, 40, 'Vinted', NULL);

-- Richieste
INSERT INTO richieste (data_richiesta, url, cliente, categoria, descrizione, budget, stato) VALUES
('2026-01-21', 'https://www.vinted.it/inbox/20295926917', 'salviobar', 'Patch', '6 Patch 04/08', 50, 'In attesa'),
('2026-01-17', 'https://www.vinted.it/inbox/19835801835', 'robbyme74', 'Patch', '1 Nameset di Nedved 2005/06', 15, 'In attesa'),
('2026-01-17', NULL, 'robbyme74', 'Patch', '2 Jeep sponsor', 20, 'In attesa'),
('2026-01-17', NULL, 'robbyme74', 'Patch', '1 Scudetto Juve', 10, 'In attesa'),
('2026-01-17', NULL, 'robbyme74', 'Patch', '1 Patch serie A 2017 / 2018', 0, 'In attesa'),
('2026-01-16', NULL, NULL, 'Patch', 'Marchisio Juve home 2014 2015', 15, 'In attesa'),
('2026-01-20', NULL, 'Manuel', 'Patch', '1 Patch serie A 2009 / 2010', 15, 'In attesa');
