import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

import { User, Product, DynamicBrand, CatalogPDF } from './types';
import { firebaseConfig, googleCordovaWebClientId } from './firebaseConfig';

// TypeScript declarations for Cordova plugins
declare const window: any;

// Define types for Firebase v8
type FirebaseUser = firebase.User;
type FirestoreError = firebase.firestore.FirestoreError;


// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const productsCollection = db.collection("products");
const brandsCollection = db.collection("brands");
const catalogsCollection = db.collection("catalogs");
const provider = new firebase.auth.GoogleAuthProvider();

// --- AUTHENTICATION ---
const getUserProfile = async (uid: string): Promise<Pick<User, 'role'>> => {
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    if (userDocSnap.exists) {
        const userData = userDocSnap.data();
        if (userData) {
            // Check for a string role field (e.g., role: 'admin') - handles common typo 'rule'
            const userRole = userData.role || userData.rule;
            if (userRole && typeof userRole === 'string') {
                const roleLower = userRole.toLowerCase();
                if (roleLower === 'admin' || roleLower === 'administrador') {
                    return { role: 'admin' };
                }
            }
            // Check for a boolean admin field (e.g., isAdmin: true or admin: true)
            if (userData.isAdmin === true || userData.admin === true) {
                return { role: 'admin' };
            }
        }
    }
    // Default to 'user' if no specific admin role is found
    return { role: 'user' };
};


export const signUp = async (email: string, password: string): Promise<User> => {
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  if (!userCredential.user) {
    throw new Error("User creation failed.");
  }
  const { uid } = userCredential.user;
  
  // On sign-up, create a corresponding user document in Firestore.
  // This ensures that every registered user has a profile where their role can be managed.
  // By default, all new users are assigned the 'user' role.
  const userDocRef = db.collection('users').doc(uid);
  await userDocRef.set({ role: 'user', email: email });

  return { uid, email, role: 'user' };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  if (!userCredential.user) {
    throw new Error("Sign in failed.");
  }
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
          const credential = firebase.auth.GoogleAuthProvider.credential(userData.idToken);
          const userCredential = await auth.signInWithCredential(credential);
          
          if (!userCredential.user) {
            throw new Error("Google sign in failed.");
          }
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
    const result = await auth.signInWithPopup(provider);
    if (!result.user) {
        throw new Error("Google sign in failed.");
    }
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
  return auth.signOut();
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
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
  return productsCollection.onSnapshot(
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
    return productsCollection.add(productData);
};

export const updateProduct = (productId: string, productData: Omit<Product, 'id'>): Promise<void> => {
    const productDoc = db.collection("products").doc(productId);
    return productDoc.update(productData);
};

export const deleteProduct = (productId: string): Promise<void> => {
    const productDoc = db.collection("products").doc(productId);
    return productDoc.delete();
};

// --- STORAGE ---
export const uploadFile = (path: string, file: File, onProgress?: (progress: number) => void): { promise: Promise<string>, cancel: () => void } => {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(path);
    const uploadTask = fileRef.put(file);

    const promise = new Promise<string>((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => { // "next" observer
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => { // "error" observer
                console.error("Upload failed:", error);
                reject(error);
            },
            async () => { // "complete" observer
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
    
    const cancel = () => {
        uploadTask.cancel();
    };

    return { promise, cancel };
};


// --- FIRESTORE (BRANDS) ---
export const onBrandsUpdate = (
    onSuccess: (brands: DynamicBrand[]) => void,
    onError: (error: FirestoreError) => void
) => {
    return brandsCollection.onSnapshot(
      (snapshot) => {
        const brands = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as DynamicBrand)
        );
        onSuccess(brands);
      },
      onError
    );
};
export const addBrand = (brandData: Omit<DynamicBrand, 'id'>) => {
    return brandsCollection.add(brandData);
};

// --- FIRESTORE (CATALOGS) ---
export const onCatalogsUpdate = (
    onSuccess: (catalogs: CatalogPDF[]) => void,
    onError: (error: FirestoreError) => void
) => {
    return catalogsCollection.onSnapshot(
        (snapshot) => {
            const catalogs = snapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as CatalogPDF)
            );
            onSuccess(catalogs);
        },
        onError
    );
};
export const addCatalog = (catalogData: Omit<CatalogPDF, 'id'>) => {
    return catalogsCollection.add(catalogData);
};