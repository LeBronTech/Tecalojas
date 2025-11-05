import { initializeApp, getApps, getApp } from "firebase/app";
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
    FirestoreError,
    serverTimestamp,
    query,
    where,
    orderBy
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { User, Product, DynamicBrand, CatalogPDF, SaleRequest, CartItem, StoreName } from './types';
import { firebaseConfig } from './firebaseConfig';

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
const saleRequestsCollection = collection(db, "saleRequests");
const provider = new GoogleAuthProvider();

// --- AUTHENTICATION ---
const getUserProfile = async (uid: string): Promise<Pick<User, 'role'>> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        // The security rules for admin access rely *specifically* on the `role` field being set to 'admin'.
        // This check must match the security rule logic to prevent permission errors.
        if (userData && userData.role === 'admin') {
            return { role: 'admin' };
        }
    }
    // Default to 'user' if no admin role is found or the document doesn't exist.
    return { role: 'user' };
};


export const signUp = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (!userCredential.user) {
    throw new Error("User creation failed.");
  }
  const { uid } = userCredential.user;
  
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

window.completeGoogleSignIn = async (idToken: string | null, errorMsg: string | null) => {
    const resolver = googleSignInResolver;
    const rejecter = googleSignInRejecter;
    cleanupGoogleSignIn();

    if (errorMsg) {
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
        rejecter?.(new Error("Login com Google cancelado ou falhou (sem token)."));
    }
};

window.handleLoginToken = (idToken: string) => {
    console.log("`handleLoginToken` called from native app.");
    if (window.completeGoogleSignIn) {
        window.completeGoogleSignIn(idToken, null);
    } else {
        console.error("`completeGoogleSignIn` function not found on window object.");
    }
};

const signInWithGoogleCordova = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    if (googleSignInResolver || googleSignInRejecter) {
        reject(new Error("Um processo de login com Google já está em andamento."));
        return;
    }
    googleSignInResolver = resolve;
    googleSignInRejecter = reject;
    googleSignInTimeout = window.setTimeout(() => {
        if (googleSignInRejecter) {
            googleSignInRejecter(new Error("Tempo de resposta do app esgotado. Verifique se o app está configurado para o login com Google."));
            cleanupGoogleSignIn();
        }
    }, 30000);
    window.location.href = "appkodular://iniciar-login-google";
  });
};

export const signInWithGoogle = async (): Promise<User> => {
  const isWebView = !!window.cordova || window.location.protocol === 'file:';
  if (isWebView) {
    return signInWithGoogleCordova();
  } else {
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
  if (!!window.cordova || window.location.protocol === 'file:') {
      window.location.href = 'appkodular://iniciar-logout-google';
  }
  return firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
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
          return {
            id: doc.id,
            ...data,
            variations: data.variations || [],
            colors: data.colors && Array.isArray(data.colors) && data.colors.length > 0 ? data.colors : [{ name: 'Indefinida', hex: '#808080' }],
            subCategory: data.subCategory || '',
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

/* 
  =================================================================
  🔥🔥🔥 AÇÃO NECESSÁRIA: CORREÇÃO DE PERMISSÕES (FIRESTORE) 🔥🔥🔥
  =================================================================
  O erro "Missing or insufficient permissions" na tela de Vendas ocorre
  porque as regras de segurança do Firestore não estão configuradas
  corretamente para permitir que administradores acessem os pedidos.

  Para corrigir, siga DOIS PASSOS:

  PASSO 1: ESTRUTURA DO USUÁRIO ADMINISTRADOR
  -------------------------------------------
  No seu Firestore, na coleção 'users', o documento do usuário
  que deve ser administrador PRECISA ter um campo `role` com o valor
  exato de `"admin"` (em minúsculas).

  Exemplo da estrutura do documento para um usuário admin:
  - Coleção: `users`
  - Documento ID: `[UID_DO_USUARIO_ADMIN]`
  - Campos:
    - `email`: "admin@email.com"
    - `role`: "admin"   <-- IMPORTANTE!

  
  PASSO 2: REGRAS DE SEGURANÇA
  -------------------------------------------
  Vá para o seu projeto no Firebase > Firestore Database > Rules e
  adicione ou modifique a regra para `saleRequests` para que fique
  exatamente como abaixo. Isso garante que apenas usuários com `role: "admin"`
  possam ler os pedidos.

  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
    
      // ... (suas outras regras, como a de 'products')

      match /saleRequests/{requestId} {
        // Permite que qualquer usuário autenticado crie um pedido.
        allow create: if request.auth != null;
        
        // Permite que APENAS administradores leiam, listem e atualizem pedidos.
        allow read, list, update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      }

      // ... (suas outras regras)
    }
  }
  ```
  =================================================================
*/

// --- FIRESTORE (SALES) ---
export const addSaleRequest = (saleData: { items: CartItem[], totalPrice: number, paymentMethod: 'PIX' | 'Cartão' }): Promise<any> => {
    return addDoc(saleRequestsCollection, {
        ...saleData,
        status: 'pending',
        createdAt: serverTimestamp()
    });
};

export const onSaleRequestsUpdate = (
  onSuccess: (requests: SaleRequest[]) => void,
  onError: (error: FirestoreError) => void
) => {
    const q = query(saleRequestsCollection, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SaleRequest));
        onSuccess(requests);
    }, onError);
};

export const completeSaleRequest = async (requestId: string): Promise<void> => {
    const saleRequestDocRef = doc(db, "saleRequests", requestId);
    const saleRequestSnap = await getDoc(saleRequestDocRef);
    if (!saleRequestSnap.exists()) {
        throw new Error("Solicitação de venda não encontrada.");
    }
    const saleRequestData = saleRequestSnap.data() as SaleRequest;

    if (saleRequestData.status === 'completed') {
        console.log("Sale already completed.");
        return;
    }
    
    // Update product stock and units sold for each item
    for (const item of saleRequestData.items) {
        const productDocRef = doc(db, "products", item.productId);
        const productSnap = await getDoc(productDocRef);

        if (productSnap.exists()) {
            const productData = productSnap.data() as Product;
            let variationFound = false;

            const updatedVariations = productData.variations.map(v => {
                if (v.size === item.variationSize) {
                    variationFound = true;
                    // Simple deduction logic: deduct from Têca first, then Ione.
                    let qtyToDeduct = item.quantity;
                    const tecaStock = v.stock[StoreName.TECA] || 0;
                    const ioneStock = v.stock[StoreName.IONE] || 0;

                    const tecaDeduction = Math.min(qtyToDeduct, tecaStock);
                    v.stock[StoreName.TECA] = tecaStock - tecaDeduction;
                    qtyToDeduct -= tecaDeduction;

                    if (qtyToDeduct > 0) {
                        const ioneDeduction = Math.min(qtyToDeduct, ioneStock);
                        v.stock[StoreName.IONE] = ioneStock - ioneDeduction;
                    }
                }
                return v;
            });
            
            if (variationFound) {
                const updatedUnitsSold = (productData.unitsSold || 0) + item.quantity;
                await updateDoc(productDocRef, { 
                    variations: updatedVariations,
                    unitsSold: updatedUnitsSold 
                });
            }
        }
    }

    // Finally, update the sale request status to completed
    await updateDoc(saleRequestDocRef, { status: "completed" });
};


// --- STORAGE ---
export const uploadFile = (path: string, file: File, onProgress?: (progress: number) => void): { promise: Promise<string>, cancel: () => void } => {
    const fileRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    const promise = new Promise<string>((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            },
            async () => {
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