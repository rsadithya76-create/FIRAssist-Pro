export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:8000/api'
    : 'https://firassist-pro.onrender.com/api');
