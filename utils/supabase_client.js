import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_kEY;

// Use service role key for backend (never expose this to frontend)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
