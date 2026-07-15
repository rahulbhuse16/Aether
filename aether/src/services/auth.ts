import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GithubAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/config";

const googleProvider = new GoogleAuthProvider();

// Optional scopes
googleProvider.addScope("email");
googleProvider.addScope("profile");

// Always ask user to choose an account
googleProvider.setCustomParameters({
  prompt: "select_account",
});


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
 * Login with Google (Popup)
 */

import axios from "axios";
import { store } from "../store";
import { setUser } from "../store/slices/authSlice";

export const syncFirebaseUser = async (payload: any) => {
  const { data } = await axios.post("https://aether-api-y0ob.onrender.com/api/v1/auth/firebase",
    payload,
  );

  return data.data;
};
export const loginWithGoogle = async (): Promise<{
  success: boolean;
  user?: UserCredential["user"];
  accessToken?: string;
  idToken?: string;
  error?: string;
}> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);

    const credential = GoogleAuthProvider.credentialFromResult(result);


    const payload = {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName,
      picture: result.user.photoURL,

    }

    const data = await syncFirebaseUser(payload)

    localStorage.setItem("userId", data?.userId)
    console.log(data)





    return {
      success: true,
      user: result.user,
      accessToken: credential?.accessToken,
      idToken: await result.user.getIdToken(),
    };
  } catch (error: any) {
    console.error("Google Login Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Login with Google (Redirect)
 */
export const loginWithGoogleRedirect = async () => {
  await signInWithRedirect(auth, googleProvider);
};

/**
 * Get Redirect Result
 */
export const getGoogleRedirectResult = async (): Promise<{
  success: boolean;
  user?: UserCredential["user"];
  accessToken?: string;
  idToken?: string;
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

    const credential = GoogleAuthProvider.credentialFromResult(result);

    return {
      success: true,
      user: result.user,
      accessToken: credential?.accessToken,
      idToken: await result.user.getIdToken(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};



export const loginWithGithub = async (): Promise<{
  success: boolean;
  user?: UserCredential["user"];
  accessToken?: string;
  error?: string;
}> => {
  try {



    const result = await signInWithPopup(auth, githubProvider);


    const credential = GithubAuthProvider.credentialFromResult(result);

    console.log("cred", credential)

    const payload = {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName,
      picture: result.user.photoURL,

    }

    const data = await syncFirebaseUser(payload)

    localStorage.setItem("userId", data?.userId)
    console.log(data)



    return {
      success: true,
      user: result.user,
      accessToken: credential?.accessToken,
    };
  } catch (error: any) {
    console.error("GitHub Connect:", error);



    return {
      success: false,
      error: error.message ?? "Failed to connect GitHub.",
    };
  }
};






/**
 * Login with Email & Password
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: UserCredential["user"];
  idToken?: string;
  error?: string;
}> => {
  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const payload = {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName,
      picture: result.user.photoURL,

    }

    const data = await syncFirebaseUser(payload)

    localStorage.setItem("userId", data?.userId)
    console.log(data)

    return {
      success: true,
      user: result.user,
      idToken: await result.user.getIdToken(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseError(error.code),
    };
  }
};

/**
 * Register with Email & Password
 */
export const signUpWithEmail = async (
  name: string,
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: UserCredential["user"];
  idToken?: string;
  error?: string;
}> => {
  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Save display name
    await updateProfile(result.user, {
      displayName: name,
    });

    const payload = {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName,
      picture: result.user.photoURL,

    }

    const data = await syncFirebaseUser(payload)

    localStorage.setItem("userId", data?.userId)
    console.log(data)

    return {
      success: true,
      user: result.user,
      idToken: await result.user.getIdToken(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseError(error.code),
    };
  }
};

/**
 * Send Password Reset Email
 */
export const resetPassword = async (
  email: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    await sendPasswordResetEmail(auth, email);

    return {
      success: true,
      message:
        "Password reset email sent successfully. Please check your inbox.",
    };
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseError(error.code),
    };
  }
};

/**
 * Firebase Error Messages
 */
const getFirebaseError = (code: string): string => {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";

    case "auth/user-disabled":
      return "This account has been disabled.";

    case "auth/user-not-found":
      return "No account found with this email.";

    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";

    case "auth/email-already-in-use":
      return "An account already exists with this email.";

    case "auth/weak-password":
      return "Password should be at least 6 characters.";

    case "auth/missing-password":
      return "Password is required.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    default:
      return "Something went wrong. Please try again.";
  }
};

export const loadUser = async () => {
  const userId = localStorage.getItem('userId')

  try {

    const response = await axios.get(`https://aether-api-y0ob.onrender.com/api/v1/auth/user/${userId}`)

    const data = response.data.user

    const userState = store.getState().auth.user

    store.dispatch(setUser({
      email: data?.email,
      name: data?.fullName,
      githubToken: data?.githubAccessToken,
      avatarUrl: data?.profileImage
    }))

  }
  catch (err) {

  }

}