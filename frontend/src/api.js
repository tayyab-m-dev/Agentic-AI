const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://agentic-ai-production-f3b8.up.railway.app';

export const apiFetch = (path, options) => window.fetch(`${apiBase}${path}`, options);