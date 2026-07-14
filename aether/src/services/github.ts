import {
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
 type UserCredential,
} from "firebase/auth";
import { auth } from "../firebase/config";

const githubProvider = new GithubAuthProvider();

// Optional scopes
githubProvider.addScope("read:user");
githubProvider.addScope("user:email");
githubProvider.addScope("repo"); // Required for private repositories
githubProvider.addScope("workflow"); // GitHub Actions

// Always prompt user to choose an account
githubProvider.setCustomParameters({
  allow_signup: "true",
});

/**
 * Sign in with GitHub using Popup
 */
export const connectGithub = async (): Promise<{
  success: boolean;
  user?: UserCredential["user"];
  accessToken?: string;
  error?: string;
}> => {
  try {
    const result = await signInWithPopup(auth, githubProvider);

    const credential = GithubAuthProvider.credentialFromResult(result);

    return {
      success: true,
      user: result.user,
      accessToken: credential?.accessToken,
    };
  } catch (error: any) {
    console.error("GitHub Login Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Redirect login (recommended for mobile browsers)
 */
export const connectGithubRedirect = async () => {
  await signInWithRedirect(auth, githubProvider);
};

/**
 * Get redirect login result
 */
export const getGithubRedirectResult = async (): Promise<{
  success: boolean;
  user?: UserCredential["user"];
  accessToken?: string;
  error?: string;
}> => {
  try {
    const result = await getRedirectResult(auth);

    if (!result) {
      return {
        success: false,
        error: "No redirect result found.",
      };
    }

    const credential = GithubAuthProvider.credentialFromResult(result);

    return {
      success: true,
      user: result.user,
      accessToken: credential?.accessToken,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};