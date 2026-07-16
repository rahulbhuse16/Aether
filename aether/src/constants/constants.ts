export const API_BASE =
  ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:5000/api/v1"
    : "https://aether-api-y0ob.onrender.com/api/v1";