/**
 * Theme constants shared by the server layout and the client theme module
 * (no "use client": the layout needs the script as a plain string).
 */

export const THEME_STORAGE_KEY = "ses-theme";
export const LIGHT_QUERY = "(prefers-color-scheme: light)";

/**
 * Inline <head> script: applies the stored preference ("light" / "dark"), or the
 * device setting for "system" / nothing stored, before first paint (no flash).
 * Mirrors `resolve` in lib/theme.ts.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var t=p==="light"||p==="dark"?p:(window.matchMedia("${LIGHT_QUERY}").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
