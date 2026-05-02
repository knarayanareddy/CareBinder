import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCR8d8hgitbdruEw95jv31CXvIHPG9sB3U",
  authDomain: "carebinder-f27df.firebaseapp.com",
  projectId: "carebinder-f27df",
  storageBucket: "carebinder-f27df.firebasestorage.app",
  messagingSenderId: "327019147850",
  appId: "1:327019147850:web:6548dab18b56900ac2ecb3",
  measurementId: "G-HQ3SE4PT0Y",
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const VAPID_KEY = 'BNeVSdAYw1t5Y_aZcZiRUaoDS2eWp8-vMHMbhkHdNSz7xJjhCIwDITJl4C1aW-8pbo3WIaAgWjzREIaZJVU0m74';
