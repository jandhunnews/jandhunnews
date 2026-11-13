import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export type NewsArticle = {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  image_url: string | null;
  created_at: string;
};
