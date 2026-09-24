const apiBase = import.meta.env.VITE_API_URL || '';

export const apiFetch = (path, options) => window.fetch(`${apiBase}${path}`, options);