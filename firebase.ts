import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

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
  }
}

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
            const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth.signInWithCredential(credential);
            
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

    if (window.AppInventor && typeof window.AppInventor.setWebViewString === 'function') {
        // ====================================================================================
        // 🔥🔥🔥 INSTRUÇÃO IMPORTANTE PARA O DESENVOLVEDOR DO APP KODULAR/CORDOVA 🔥🔥🔥
        // ====================================================================================
        // O erro "403: disallowed_useragent" que você está vendo é uma política de segurança
        // do Google. Ele acontece porque o Google não permite mais que o login seja feito
        // diretamente dentro de um WebView simples por razões de segurança (phishing, etc).
        //
        // A SOLUÇÃO é garantir que o seu aplicativo nativo (Kodular) abra o fluxo de login
        // do Google em um "Navegador Seguro" (como Chrome Custom Tabs no Android).
        //
        // O que verificar no seu projeto Kodular:
        // 1. Componente Google Login: Certifique-se de que o componente "Google Login" do Kodular
        //    esteja configurado para usar um navegador externo ou uma "Custom Tab", e não
        //    uma WebView interna para a autenticação. A maioria das plataformas de app builder
        //    já faz isso, mas vale a pena confirmar.
        // 2. Firebase Console & Google Cloud Console:
        //    a) Verifique se o "Web client ID" (colocado em `firebaseConfig.ts`)
        //       está correto.
        //    b) No Google Cloud Console, para o seu "Android client ID", verifique se o
        //       NOME DO PACOTE e a impressão digital SHA-1 do seu app correspondem
        //       exatamente aos do app que você está compilando no Kodular.
        // 3. Blocos Kodular: Seus blocos devem seguir este fluxo:
        //    a) Escutar o evento "WebViewStringChange".
        //    b) Quando a string for 'appkodular://iniciar-login-google', chamar a função de
        //       login do componente "Google Login".
        //    c) No evento "Login bem-sucedido" do Google, pegar o `idToken`.
        //    d) Chamar o WebView para executar o JavaScript:
        //       `window.completeGoogleSignIn('${idToken}', null);`
        //    e) No evento "Falha no Login", pegar a mensagem de erro e chamar:
        //       `window.completeGoogleSignIn(null, '${mensagemDeErro}');`
        //
        // Este código web está correto, o problema reside na integração com a parte nativa.
        // ====================================================================================
        
        // Send command to Kodular to start Google Login
        window.AppInventor.setWebViewString('appkodular://iniciar-login-google');
    } else {
        // Fallback or error if the expected interface isn't there
        reject(new Error("Interface com o App (AppInventor) não encontrada."));
        cleanupGoogleSignIn();
    }
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
  // Also disconnect from Google if logged in via Kodular's native flow
  if (window.cordova && window.AppInventor && typeof window.AppInventor.setWebViewString === 'function') {
      window.AppInventor.setWebViewString('appkodular://iniciar-logout-google');
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
