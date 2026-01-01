// lib/api/axios.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // 🔥 REQUIRED for auth cookies
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("Unauthorized");
    }
    return Promise.reject(err);
  }
);
