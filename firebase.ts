import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  signInWithCredential
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  FirestoreError
} from "firebase/firestore";

import { User, Product } from './types';
import { firebaseConfig, googleCordovaWebClientId } from './firebaseConfig';

// TypeScript declarations for Cordova plugins
declare const window: any;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const productsCollection = collection(db, "products");
const provider = new GoogleAuthProvider();

// --- AUTHENTICATION ---

// Function to get user profile from Firestore
const getUserProfile = async (uid: string): Promise<Pick<User, 'role'>> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data() as Pick<User, 'role'>;
    }
    return { role: 'user' }; // Default role if no document is found
};

export const signUp = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  // Note: In a real app, you might want to create a user profile document here.
  return { uid, email, role: 'user' };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  const profile = await getUserProfile(uid);
  return { uid, email, role: profile.role };
};

/**
 * Handles Google Sign-In for Cordova environments using the native plugin.
 * It gets an idToken from the native flow and uses it to sign in with Firebase.
 */
const signInWithGoogleCordova = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    if (!window.plugins || !window.plugins.googleplus) {
      reject(new Error("Plugin do Google não encontrado. Verifique a instalação."));
      return;
    }

    window.plugins.googleplus.login(
      {
        'webClientId': googleCordovaWebClientId,
        'offline': false,
      },
      async (userData: any) => {
        try {
          // The most important piece of data is the idToken.
          // We use it to create a Firebase credential.
          const credential = GoogleAuthProvider.credential(userData.idToken);
          const userCredential = await signInWithCredential(auth, credential);
          
          const user = userCredential.user;
          const profile = await getUserProfile(user.uid);
          resolve({ uid: user.uid, email: user.email!, role: profile.role });
        } catch (error) {
          console.error("Firebase signInWithCredential error:", error);
          reject(error);
        }
      },
      (msg: string) => {
        console.error("Cordova Google login error:", msg);
        reject(new Error(`Erro no login: ${msg}`));
      }
    );
  });
};

/**
 * Dispatches to the correct Google Sign-In method based on the environment (web vs. Cordova).
 */
export const signInWithGoogle = async (): Promise<User> => {
  // Check if running in a Cordova environment
  if (window.cordova) {
    return signInWithGoogleCordova();
  } else {
    // Standard web-based sign-in flow
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const profile = await getUserProfile(user.uid);
    return { uid: user.uid, email: user.email!, role: profile.role };
  }
};


export const signOut = (): Promise<void> => {
  // Also disconnect from Google if logged in via the plugin
  if (window.cordova && window.plugins && window.plugins.googleplus) {
      window.plugins.googleplus.disconnect();
  }
  return firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      // Since anonymous sign-in is removed, we assume any user is a real user.
      const profile = await getUserProfile(firebaseUser.uid);
      callback({ uid: firebaseUser.uid, email: firebaseUser.email, role: profile.role });
    } else {
      callback(null);
    }
  });
};


// --- FIRESTORE (PRODUCTS) ---

export const onProductsUpdate = (
  onSuccess: (products: Product[]) => void,
  onError: (error: FirestoreError) => void
) => {
  return onSnapshot(
    productsCollection,
    (snapshot) => {
      const products = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Product)
      );
      onSuccess(products);
    },
    onError
  );
};

export const addProduct = (productData: Omit<Product, 'id'>): Promise<any> => {
    return addDoc(productsCollection, productData);
};

export const updateProduct = (productId: string, productData: Omit<Product, 'id'>): Promise<void> => {
    const productDoc = doc(db, "products", productId);
    return updateDoc(productDoc, productData);
};

export const deleteProduct = (productId: string): Promise<void> => {
    const productDoc = doc(db, "products", productId);
    return deleteDoc(productDoc);
};