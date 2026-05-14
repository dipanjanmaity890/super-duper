// Firebase configuration for fanpulse-app-live project
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  projectId:         'fanpulse-app-live',
  appId:             '1:631503894747:web:2afe2eb03a549378b1b4fe',
  storageBucket:     'fanpulse-app-live.firebasestorage.app',
  apiKey:            'AIzaSyBlBB9NV9-kN9xHi961-lNjO2p306d0lbE',
  authDomain:        'fanpulse-app-live.firebaseapp.com',
  messagingSenderId: '631503894747',
};

const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();

// ─── Google Sign-in helper ────────────────────────────────────────────────────
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return { idToken, user: result.user };
}

export async function firebaseSignOut() {
  await signOut(auth);
}
