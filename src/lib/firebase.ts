import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if provided, or default
export const db = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

// Authentication Helpers
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    return { success: false, error: error.message };
  }
}

export async function signOutFromFirebase() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Firebase Sign-Out error:', error);
    return { success: false, error: error.message };
  }
}

// Firestore Persistence Helpers
export async function persistIncidentToFirestore(incident: any) {
  try {
    const docRef = doc(db, 'incidents', incident.id);
    await setDoc(docRef, incident, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore write warning (using local fallback):', e);
    return false;
  }
}

export async function persistResultToFirestore(result: any) {
  try {
    const docRef = doc(db, 'results', result.id);
    await setDoc(docRef, result, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore write warning (using local fallback):', e);
    return false;
  }
}

export async function persistReportToFirestore(collectionName: string, report: any) {
  try {
    const docRef = doc(db, collectionName, report.id);
    await setDoc(docRef, report, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore write warning (using local fallback):', e);
    return false;
  }
}

export async function persistAuditLogToFirestore(log: any) {
  try {
    const docRef = doc(db, 'auditLogs', log.id);
    await setDoc(docRef, log, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
}
