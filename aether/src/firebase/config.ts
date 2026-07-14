import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-C--E42NeUy36zqOQ_qFpYBbEEDyzHPk",
  authDomain: "express-firebase-api-86147.firebaseapp.com",
  projectId: "express-firebase-api-86147",
  storageBucket: "express-firebase-api-86147.firebasestorage.app",
  messagingSenderId: "236147893883",
  appId: "1:236147893883:web:168c342d44566a8a7fe4de",
  measurementId: "G-CXWXEWYEQP"
};


let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);

// optional (explicit persistence)
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;