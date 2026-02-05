import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types per le tabelle
export interface Patch {
  id?: number;
  immagine: string | null;
  prodotto: string;
  in_magazzino: number;
  venduti: number;
  quantita_iniziale: number;
  costo_totale: number;
  costo_unitario: number;
  ricavo_vendite: number;
  profitto: number;
  created_at?: string;
}

export interface Tuta {
  id?: number;
  tipo: string;
  squadra: string;
  categoria: string;
  stagione: string | null;
  descrizione: string | null;
  costo: number;
  prezzo_vendita: number;
  stato: string;
  profitto: number;
  created_at?: string;
}

export interface Maglia {
  id?: number;
  immagine: string | null;
  maglia: string;
  stagione: string;
  costo_maglia: number;
  patches: string[];
  costo_patch: number;
  costo_totale: number;
  prezzo_vendita: number;
  stato: string;
  profitto: number;
  created_at?: string;
}

export interface Vendita {
  id?: number;
  data: string;
  categoria: string;
  prodotto: string;
  quantita: number;
  totale: number;
  piattaforma: string;
  cliente: string | null;
  created_at?: string;
}

export interface Richiesta {
  id?: number;
  data_richiesta: string;
  url: string | null;
  cliente: string | null;
  categoria: string;
  descrizione: string;
  budget: number;
  stato: string;
  created_at?: string;
}
