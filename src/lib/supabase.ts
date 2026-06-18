import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TipoProdotto = 'patch' | 'nameset';

export interface Prodotto {
  id: number;
  tipo: TipoProdotto;
  titolo: string;
  descrizione: string;
  prezzo_acquisto: number;
  quantita: number;
  created_at?: string;
}

export interface Richiesta {
  id: number;
  titolo: string;
  link: string;
  created_at?: string;
}
