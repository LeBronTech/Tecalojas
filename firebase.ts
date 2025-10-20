// =================================================================================
// 🔥🔥🔥 AÇÃO CRÍTICA NECESSÁRIA: CORRIGIR PERMISSÕES DO BANCO DE DADOS 🔥🔥🔥
// =================================================================================
// Olá! O erro "Missing or insufficient permissions" que você viu acontece porque
// as regras de segurança do seu banco de dados (Firestore) não permitem que
// o aplicativo leia a lista de MARCAS e CATÁLOGOS.
//
// Para corrigir isso de forma definitiva, siga estes passos simples:
//
// 1. ABRA O NOVO ARQUIVO `firestore.rules` que criei para você.
//
// 2. COPIE todo o conteúdo dele.
//
// 3. ACESSE O SITE do Firebase Console: https://console.firebase.google.com/
//    e entre no seu projeto.
//
// 4. No menu à esquerda, clique em "Construir" (Build) e depois em "Firestore Database".
//
// 5. No topo da página do Firestore, clique na aba "REGRAS" (Rules).
//
// 6. Você verá um editor de texto. APAGUE todo o conteúdo que estiver lá.
//
// 7. COLE o conteúdo que você copiou do arquivo `firestore.rules`.
//
// 8. Clique no botão azul "PUBLICAR" (Publish) no topo.
//
// Assim que fizer isso, os erros de permissão irão desaparecer e as
// marcas existentes aparecerão corretamente na tela de Catálogo.
// =================================================================================
//
// 🔥 PARA DEFINIR UM USUÁRIO COMO ADMIN:
// 1. Crie um usuário normal através do aplicativo.
// 2. No Firebase Console, vá para o "Firestore Database".
// 3. Encontre a coleção chamada 'users'.
// 4. Encontre o documento do usuário que você quer promover (o ID do documento é o mesmo ID do usuário).
// 5. Adicione um novo campo chamado 'role' e defina o valor dele como a palavra "admin" (em minúsculas).
// =================================================================================

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
            // FIX: To make the admin check more robust, check for 'role' or a common typo 'rule'.
            // Also, make the check case-insensitive to accept 'admin', 'Admin', or 'administrador'.
            const userRole = userData.role || userData.rule;
            if (userRole && typeof userRole === 'string') {
                const roleLower = userRole.toLowerCase();
                if (roleLower === 'admin' || roleLower === 'administrador') {
                    return { role: 'admin' };
                }
            }
        }
    }
    // Default to 'user' if no document, no role field, or role is not 'admin'/'administrador'.
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
export const uploadFile = async (path: string, file: File): Promise<string> => {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(path);
    await fileRef.put(file);
    return fileRef.getDownloadURL();
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