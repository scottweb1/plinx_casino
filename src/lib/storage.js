export const readJSON = (key, fallback = null) => {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};
export const writeJSON = (key, value) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch { /* privat tilstand / fuld lagring */ }
};
export const removeKey = (key) => {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch { /* */ }
};
