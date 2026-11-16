import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

// Public web SDK identifiers. This review branch deliberately ignores all
// inherited VITE_FIREBASE_* values and can only address the test project.
const config = {
  apiKey: 'AIzaSyCKAxgKS0fe8N3rUETMMPIC3ATjyK-ttuI',
  authDomain: 'storytable-preview-rcox1234.firebaseapp.com',
  projectId: 'storytable-preview-rcox1234',
  messagingSenderId: '865931816940',
  appId: '1:865931816940:web:77f7e6f0467ddaa6899ac9',
};
export function isFirebaseConfigured(): boolean { return true; }
export const app: FirebaseApp = initializeApp(config);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
// No bucket is provisioned. Do not initialize Storage or use the personal bucket.
export const storage: FirebaseStorage | null = null;
