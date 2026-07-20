

import axios, {
  AxiosError,
  type AxiosInstance,
 type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE } from "../constants/constants";
import { toast } from "../utils/toast";

const API_BASE_URL = API_BASE
 

const TOKEN_KEY = "token";

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Prevent multiple redirects
let isRedirectingToAuth = false;

/**
 * Get JWT token from localStorage
 */
const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Clear authentication data
 */
const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);

  // Optional: remove other auth-related data
  localStorage.removeItem("user");
  localStorage.removeItem("authUser");

  // Clear Axios default Authorization header
  delete api.defaults.headers.common.Authorization;
};

/**
 * Redirect user to authentication page
 */
const redirectToAuth = (): void => {
  if (isRedirectingToAuth) return;

  isRedirectingToAuth = true;

  clearAuth();

  // Avoid redirect loop if already on auth page
  if (window.location.pathname !== "/auth") {
    window.location.replace("/auth");
  } else {
    isRedirectingToAuth = false;
  }
};

/**
 * Request Interceptor
 *
 * Adds JWT token to every request
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 *
 * Handles:
 * - Expired token
 * - Invalid token
 * - Missing/unauthorized token
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error: AxiosError) => {
    const status = error.response?.status;

    const responseData = error.response?.data as
      | {
          success?: boolean;
          code?: string;
          message?: string;
        }
      | undefined;

    const errorCode = responseData?.code;

    /**
     * Authentication errors
     */
    if (
      status === 401 ||
      errorCode === "TOKEN_EXPIRED" ||
      errorCode === "INVALID_TOKEN"
    ) {
      toast.error("Your session has expired. Please log in again.")
      redirectToAuth();
    }

    /**
     * Forbidden
     */
    if (status === 403) {
      console.warn("Access forbidden");
    }

    /**
     * Server errors
     */
    if (status && status >= 500) {
      console.error("Server error:", responseData?.message);
    }

    /**
     * Network error
     */
    if (!error.response) {
      console.error("Network error. Please check your internet connection.");
    }

    return Promise.reject(error);
  }
);

export default api;

