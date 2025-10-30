import { initializeApp, getApps, getApp } from "firebase/app";

// Explicitly import modules for their side-effects to ensure components are registered.
// This is a robust way to prevent "Component ... has not been registered yet" errors
// that can occur due to race conditions in module loading.
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";

import { 
    getAuth,
    setPersistence,
    browserLocalPersistence, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    signInWithCredential,
    User as FirebaseUser
} from "firebase/auth";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    FirestoreError
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { User, Product, DynamicBrand, CatalogPDF } from './types';
import { firebaseConfig, googleCordovaWebClientId } from './firebaseConfig';

// TypeScript declarations for Cordova plugins and Kodular/AppInventor communication
declare global {
  interface Window {
    cordova?: any;
    plugins?: any;
    AppInventor?: {
      setWebViewString: (message: string) => void;
    };
    completeGoogleSignIn?: (idToken: string | null, errorMsg: string | null) => void;
    handleLoginToken?: (idToken: string) => void;
  }
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase: Error setting auth persistence", error);
  });

const db = getFirestore(app);
const storage = getStorage(app);


const productsCollection = collection(db, "products");
const brandsCollection = collection(db, "brands");
const catalogsCollection = collection(db, "catalogs");
const provider = new GoogleAuthProvider();

// --- AUTHENTICATION ---
const getUserProfile = async (uid: string): Promise<Pick<User, 'role'>> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
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
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (!userCredential.user) {
    throw new Error("User creation failed.");
  }
  const { uid } = userCredential.user;
  
  // On sign-up, create a corresponding user document in Firestore.
  // This ensures that every registered user has a profile where their role can be managed.
  // By default, all new users are assigned the 'user' role.
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, { role: 'user', email: email });

  return { uid, email, role: 'user' };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  if (!userCredential.user) {
    throw new Error("Sign in failed.");
  }
  const { uid } = userCredential.user;
  const profile = await getUserProfile(uid);
  return { uid, email, role: profile.role };
};

// --- GOOGLE SIGN IN REWORK FOR KODULAR/CORDOVA ---

let googleSignInResolver: ((user: User) => void) | null = null;
let googleSignInRejecter: ((error: any) => void) | null = null;
let googleSignInTimeout: number | null = null;

const cleanupGoogleSignIn = () => {
    if (googleSignInTimeout) {
        window.clearTimeout(googleSignInTimeout);
        googleSignInTimeout = null;
    }
    googleSignInResolver = null;
    googleSignInRejecter = null;
};

// This function will be called by the native Kodular/Cordova app to complete the sign-in flow
window.completeGoogleSignIn = async (idToken: string | null, errorMsg: string | null) => {
    const resolver = googleSignInResolver;
    const rejecter = googleSignInRejecter;
    
    // Important: Clean up immediately to prevent memory leaks and accidental calls
    cleanupGoogleSignIn();

    if (errorMsg) {
        // The native app reported an error.
        // If the error is 'disallowed_useragent', it confirms the native configuration issue.
        console.error("Google Sign-In Error from Native App:", errorMsg);
        rejecter?.(new Error(errorMsg));
        return;
    }

    if (idToken) {
        try {
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            
            if (!userCredential.user) {
              throw new Error("Falha no login com Google após receber o token.");
            }
            const user = userCredential.user;
            const profile = await getUserProfile(user.uid);
            resolver?.({ uid: user.uid, email: user.email!, role: profile.role });
        } catch (error) {
            console.error("Firebase signInWithCredential failed:", error);
            rejecter?.(error);
        }
    } else {
        // This case handles user cancellation or other failures where no token is returned.
        rejecter?.(new Error("Login com Google cancelado ou falhou (sem token)."));
    }
};

// This function will be called by the native Kodular app to complete any login flow
// that provides an ID token. It assumes the token is a Google ID token, as that's
// the only type the client-side SDK can consume directly via signInWithCredential.
window.handleLoginToken = (idToken: string) => {
    console.log("`handleLoginToken` called from native app.");
    // We assume the token is a Google ID token and call the existing Google sign-in completion logic.
    // If an error occurs here, it will be caught inside completeGoogleSignIn and rejected.
    if (window.completeGoogleSignIn) {
        window.completeGoogleSignIn(idToken, null);
    } else {
        console.error("`completeGoogleSignIn` function not found on window object.");
    }
};


/**
 * Handles Google Sign-In for Cordova/Kodular environments.
 * It sends a command to the native app, which then performs the sign-in and calls back `window.completeGoogleSignIn`.
 */
const signInWithGoogleCordova = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    // Ensure no previous sign-in process is still lingering
    if (googleSignInResolver || googleSignInRejecter) {
        reject(new Error("Um processo de login com Google já está em andamento."));
        return;
    }

    // Store resolve/reject to be used by the global callback
    googleSignInResolver = resolve;
    googleSignInRejecter = reject;

    // Set a timeout in case the native app doesn't respond
    googleSignInTimeout = window.setTimeout(() => {
        if (googleSignInRejecter) {
            googleSignInRejecter(new Error("Tempo de resposta do app esgotado. Verifique se o app está configurado para o login com Google."));
            cleanupGoogleSignIn();
        }
    }, 30000); // 30 seconds timeout
    
    // Trigger the native login flow by navigating to a custom URL scheme.
    // The native app (Kodular/Cordova) should be configured to intercept this navigation,
    // perform the Google Sign-In, and then call `window.completeGoogleSignIn` with the result.
    window.location.href = "appkodular://iniciar-login-google";
  });
};

/**
 * Dispatches to the correct Google Sign-In method based on the environment (web vs. Cordova).
 */
export const signInWithGoogle = async (): Promise<User> => {
  // A more robust check for Cordova/WebView environments.
  // The error `auth/operation-not-supported-in-this-environment` occurs on non-http(s) protocols.
  const isWebView = !!window.cordova || window.location.protocol === 'file:';

  if (isWebView) {
    return signInWithGoogleCordova();
  } else {
    // Standard web-based sign-in flow
    const result = await signInWithPopup(auth, provider);
    if (!result.user) {
        throw new Error("Google sign in failed.");
    }
    const user = result.user;
    const profile = await getUserProfile(user.uid);
    return { uid: user.uid, email: user.email!, role: profile.role };
  }
};


export const signOut = (): Promise<void> => {
  // Also disconnect from Google if logged in via Kodular's native flow
  if (!!window.cordova || window.location.protocol === 'file:') {
      window.location.href = 'appkodular://iniciar-logout-google';
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
        (doc) => {
          const data = doc.data();
          // This creates a more robust product object by providing default empty arrays
          // for properties that might be missing from older Firestore documents,
          // preventing "Cannot read properties of undefined (reading 'map')" errors.
          return {
            id: doc.id,
            ...data,
            variations: data.variations || [],
            colors: data.colors && Array.isArray(data.colors) && data.colors.length > 0 ? data.colors : [{ name: 'Indefinida', hex: '#808080' }],
          } as Product;
        }
      );
      onSuccess(products);
    },
    onError
  );
};

export const addProduct = (productData: Omit<Product, 'id'>): Promise<any> => {
    return addDoc(productsCollection, productData as { [key: string]: any });
};

export const updateProduct = (productId: string, productData: Omit<Product, 'id'>): Promise<void> => {
    const productDoc = doc(db, "products", productId);
    return updateDoc(productDoc, productData as { [key: string]: any });
};

export const deleteProduct = (productId: string): Promise<void> => {
    const productDoc = doc(db, "products", productId);
    return deleteDoc(productDoc);
};

// --- STORAGE ---
export const uploadFile = (path: string, file: File, onProgress?: (progress: number) => void): { promise: Promise<string>, cancel: () => void } => {
    const fileRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

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
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
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
    return onSnapshot(
      brandsCollection,
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
    return addDoc(brandsCollection, brandData as { [key: string]: any });
};

// --- FIRESTORE (CATALOGS) ---
export const onCatalogsUpdate = (
    onSuccess: (catalogs: CatalogPDF[]) => void,
    onError: (error: FirestoreError) => void
) => {
    return onSnapshot(
        catalogsCollection,
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
    return addDoc(catalogsCollection, catalogData as { [key: string]: any });
};
