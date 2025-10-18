

// FIX: Switched to Firebase v8 compatibility API to resolve module export errors.
// This involves changing imports and updating Firestore/Auth method calls to the namespaced syntax (e.g., `auth.signInWith...` instead of `signInWith... (auth, ...)`).
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

import { User, Product } from './types';
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

const productsCollection = db.collection("products");
const provider = new firebase.auth.GoogleAuthProvider();

// --- AUTHENTICATION ---

/**
 * Recupera o perfil de um usuário da coleção 'users' no Firestore.
 * A permissão do usuário é determinada pelo campo 'role' em seu documento.
 * 
 * =================================================================================
 * 🔥🔥🔥 AÇÃO CRÍTICA E OBRIGATÓRIA: APLICAR REGRAS DE SEGURANÇA (MÉTODO VISUAL) 🔥🔥🔥
 * =================================================================================
 * Para que o sistema de administrador funcione e seus dados fiquem seguros,
 * você PRECISA aplicar as regras de segurança no seu banco de dados.
 *
 * SIGA ESTES PASSOS (NÃO PRECISA DE TERMINAL/BASH):
 *
 * 1. ABRA O ARQUIVO `firestore.rules` que está na pasta do seu projeto.
 *
 * 2. SELECIONE E COPIE TODO o conteúdo do arquivo `firestore.rules`.
 *
 * 3. ACESSE O SITE do Firebase Console: https://console.firebase.google.com/
 *    e entre no seu projeto.
 *
 * 4. No menu à esquerda, clique em "Construir" (Build) e depois em "Firestore Database".
 *
 * 5. No topo da página do Firestore, clique na aba "REGRAS" (Rules).
 *
 * 6. Você verá um editor de texto. APAGUE todo o conteúdo que estiver lá.
 *
 * 7. COLE o conteúdo que você copiou do arquivo `firestore.rules` nesse editor.
 *
 * 8. Clique no botão azul "PUBLICAR" (Publish) no topo.
 *
 * PRONTO! Suas regras de segurança estarão ativas.
 * =================================================================================
 *
 * 🔥 PARA DEFINIR UM USUÁRIO COMO ADMIN:
 * 1. Crie um usuário normal através do aplicativo.
 * 2. No Firebase Console, vá para o "Firestore Database".
 * 3. Encontre a coleção chamada 'users'.
 * 4. Encontre o documento do usuário que você quer promover (o ID do documento é o mesmo ID do usuário).
 * 5. Adicione um novo campo chamado 'role' e defina o valor dele como a palavra "admin" (em minúsculas).
 */
const getUserProfile = async (uid: string): Promise<Pick<User, 'role'>> => {
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    if (userDocSnap.exists) {
        const userData = userDocSnap.data();
        // Ensure the role is explicitly checked.
        if (userData && userData.role === 'admin') {
          return { role: 'admin' };
        }
    }
    // Default to 'user' if no document, no role field, or role is not 'admin'.
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
