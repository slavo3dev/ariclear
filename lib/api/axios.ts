// lib/api/axios.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // 🔥 REQUIRED for auth cookies
});

// Callers handle 401s themselves (sign-in modal, redirects).
