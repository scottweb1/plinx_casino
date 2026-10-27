import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;
const DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'gmail.com';

// Uden url/nøgle fungerer spillet stadig offline (kun på denne enhed).
export const cloudEnabled = !!(URL_ && KEY);
export const supabase = cloudEnabled ? createClient(URL_, KEY) : null;

import { emailFor as mkEmail, validName, NAME_RE } from './nameRules.js';

export { validName, NAME_RE };
export const emailFor = (name) => mkEmail(name, DOMAIN);
