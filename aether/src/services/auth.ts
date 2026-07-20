import axios from "axios";
import { store } from "../store";
import { setUser } from "../store/slices/authSlice";
import { API_BASE } from "../constants/constants";
import api from "../api/api";
import { toast } from "../utils/toast";

/* ------------------------------------------------------------------ */
/* Google & GitHub — backend redirect flow                             */
/* ------------------------------------------------------------------ */

export const loginWithGoogle = (): void => {
  window.location.href = `${API_BASE}/auth/google`;
};

export const loginWithGithub = (): void => {
  window.location.href = `${API_BASE}/auth/github?source=auth`;
};

/* ------------------------------------------------------------------ */
/* Email & Password — own backend                                      */
/* ------------------------------------------------------------------ */

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password });

    localStorage.setItem("userId", data.data.userId);
    localStorage.setItem("token", data.data.token);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message ?? "Something went wrong. Try again.",
    };
  }
};

export const signUpWithEmail = async (
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data } = await axios.post(`${API_BASE}/auth/signup`, { name, email, password });

    localStorage.setItem("userId", data.data.userId);
    localStorage.setItem("token", data.data.token);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message ?? "Something went wrong. Try again.",
    };
  }
};

export const forgotPassword = async (
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const { data } = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
    return { success: true, message: data.message };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message ?? "Failed to send reset email.",
    };
  }
};

export const resetPassword = async (
  id: string,
  token: string,
  password: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const { data } = await axios.post(`${API_BASE}/auth/reset-password`, { id, token, password });
    return { success: true, message: data.message };
  } catch (error: any) {
    return {
      success: false,
      error: error?.response?.data?.message ?? "Failed to reset password.",
    };
  }
};

/* ------------------------------------------------------------------ */
/* Shared                                                               */
/* ------------------------------------------------------------------ */

export const loadUser = async () => {
  const userId = localStorage.getItem("userId");

  try {
    const response = await api.get(`/auth/user/${userId}`);
    const data = response.data.user;

    store.dispatch(
      setUser({
        email: data?.email,
        name: data?.fullName,
        githubToken: data?.githubAccessToken,
        avatarUrl: data?.profileImage,
      })
    );
  } catch (err) {
    // no-op
  }
};

export const logOut = async () => {
  localStorage.clear();
  toast.success("Logged out successfully")
};