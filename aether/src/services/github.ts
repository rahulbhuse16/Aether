import {
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
 type UserCredential,
 linkWithPopup,
 fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../firebase/config";
import axios from "axios";

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
    let result: UserCredential;


   
      // User not logged in → Login with GitHub
      result = await signInWithPopup(auth, githubProvider);
    

    const credential = GithubAuthProvider.credentialFromResult(result);

    console.log("cred", credential)

    if (!credential?.accessToken) {
      return {
        success: false,
        error: "Failed to obtain GitHub access token.",
      };
    }

    await axios.post(
      "https://aether-api-y0ob.onrender.com/api/v1/github/connect",
      {
        userId: localStorage.getItem("userId"),
        accessToken: credential.accessToken,
      }
    );

    return {
      success: true,
      user: result.user,
      accessToken: credential.accessToken,
    };
  } catch (error: any) {
    console.error("GitHub Connect:", error);

    if (error.code === "auth/provider-already-linked") {
      return {
        success: true,
        user: auth.currentUser!,
        error: "GitHub account is already connected.",
      };
    }

    if (error.code === "auth/account-exists-with-different-credential") {
      const email = error.customData?.email;

      const methods = email
        ? await fetchSignInMethodsForEmail(auth, email)
        : [];

      return {
        success: false,
        error: `This email is already registered using ${methods.join(
          ", "
        )}. Please sign in with that provider first, then connect GitHub.`,
      };
    }

    if (error.code === "auth/credential-already-in-use") {
      return {
        success: false,
        error:
          "This GitHub account is already linked to another Aether account.",
      };
    }

    return {
      success: false,
      error: error.message ?? "Failed to connect GitHub.",
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