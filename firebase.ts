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
// Change: Imported uploadString
import { getStorage, ref, uploadBytesResumable, getDownloadURL, uploadString } from "firebase/storage";

import { User, Product, DynamicBrand, CatalogPDF, SaleRequest, CartItem, StoreName, PosCartItem, Variation } from './types';
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

// --- STORAGE ---

// General file upload (PDFs, etc) - Uses uploadBytesResumable for progress
export const uploadFile = (path: string, file: File | Blob, onProgress?: (progress: number) => void): { promise: Promise<string>, cancel: () => void } => {
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
                if (error.code === 'storage/canceled') {
                    console.log("Upload canceled.");
                } else if (error.code === 'storage/unauthorized') {
                    console.error("Storage Permission Error:", error);
                    reject(new Error("Permissão negada no Storage. Verifique as regras de segurança no Firebase Console (Storage > Rules)."));
                } else if (error.code === 'storage/retry-limit-exceeded') {
                    reject(new Error("Tempo limite de conexão excedido. Sua internet pode estar instável."));
                } else {
                    console.error("Upload failed:", error);
                    reject(error);
                }
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

// Simplified and Robust Base64 Image Upload using uploadString
// This avoids the overhead of converting to Blob/Uint8Array manually which can freeze the UI on large strings
export const uploadBase64Image = (path: string, base64DataUrl: string, onProgress?: (progress: number) => void): { promise: Promise<string>, cancel: () => void } => {
    if (onProgress) onProgress(10); 

    const fileRef = ref(storage, path);
    
    // uploadString automatically handles 'data:image/...' URLs efficiently
    const promise = uploadString(fileRef, base64DataUrl, 'data_url').then(async (snapshot) => {
        if (onProgress) onProgress(100);
        return await getDownloadURL(snapshot.ref);
    }).catch((error) => {
        console.error("Base64 Upload Error:", error);
        if (error.code === 'storage/unauthorized') {
            throw new Error("ERRO DE PERMISSÃO: Vá no Firebase Console > Storage > Rules e cole as regras do arquivo storage.rules.");
        } else if (error.code === 'storage/retry-limit-exceeded') {
            throw new Error("O upload falhou após várias tentativas. Verifique sua conexão.");
        } else {
            throw new Error(`Erro no upload: ${error.message}`);
        }
    });

    return { promise, cancel: () => {} }; // Cancellation is not supported for atomic uploadString
};

async function uploadAllProductImagesInProduct(productData: Product | Omit<Product, 'id'>): Promise<any> {
    const productToUpload = JSON.parse(JSON.stringify(productData)); // Deep copy to avoid mutating original state
    const productId = 'id' in productToUpload ? productToUpload.id : `new_${Date.now()}`;

    // Helper to upload an image only if it's a new base64 string
    const uploadIfNeeded = async (imageUrl: string, path: string): Promise<string> => {
        if (imageUrl && imageUrl.startsWith('data:')) {
            try {
                // Use the new simplified uploadBase64Image
                const { promise } = uploadBase64Image(path, imageUrl);
                return await promise; 
            } catch (e: any) {
                console.error(`Falha no upload da imagem para ${path}:`, e);
                // Propagate specific permission errors directly to the UI
                if (e.message.includes("ERRO DE PERMISSÃO") || e.code === 'storage/unauthorized') {
                    throw e; 
                }
                throw new Error(`Falha ao enviar imagem: ${e.message}`);
            }
        }
        return imageUrl; // Already a URL, return as is
    };

    // --- Serial Uploads to prevent race conditions ---

    // 1. Base Image
    if (productToUpload.baseImageUrl) {
        productToUpload.baseImageUrl = await uploadIfNeeded(
            productToUpload.baseImageUrl,
            `products/${productId}/baseImage_${Date.now()}.jpg`
        );
    }

    // 2. Variations
    const updatedVariations = [];
    for (const [index, variation] of productToUpload.variations.entries()) {
        const newImageUrl = await uploadIfNeeded(
            variation.imageUrl,
            `products/${productId}/variation_${variation.size}_${index}_${Date.now()}.jpg`
        );
        updatedVariations.push({ ...variation, imageUrl: newImageUrl });
    }
    productToUpload.variations = updatedVariations;


    // 3. Background Images
    if (productToUpload.backgroundImages) {
        for (const env in productToUpload.backgroundImages) {
            const key = env as keyof Product['backgroundImages'];
            const images = productToUpload.backgroundImages[key];

            if (typeof images === 'string') {
                productToUpload.backgroundImages[key] = await uploadIfNeeded(
                    images,
                    `products/${productId}/bg_${key}_${Date.now()}.jpg`
                );
            } else if (typeof images === 'object' && images !== null) {
                for (const color in images) {
                    images[color] = await uploadIfNeeded(
                        images[color],
                        `products/${productId}/bg_${key}_${color.replace(/\s/g, '_')}_${Date.now()}.jpg`
                    );
                }
            }
        }
    }

    return productToUpload;
}


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
            backgroundImages: data.backgroundImages || {},
          } as Product;
        }
      );
      onSuccess(products);
    },
    onError
  );
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const dataToSave = await uploadAllProductImagesInProduct(productData);
    const docRef = await addDoc(productsCollection, dataToSave as { [key: string]: any });
    return { id: docRef.id, ...dataToSave } as Product;
};

export const updateProduct = async (productId: string, productData: Omit<Product, 'id'>): Promise<Product> => {
    const productWithId = { ...productData, id: productId };
    const dataToSave = await uploadAllProductImagesInProduct(productWithId);
    const { id, ...finalData } = dataToSave;
    const productDoc = doc(db, "products", productId);
    await updateDoc(productDoc, finalData as { [key: string]: any });
    return dataToSave as Product;
};

export const deleteProduct = (productId: string): Promise<void> => {
    const productDoc = doc(db, "products", productId);
    return deleteDoc(productDoc);
};

// --- FIRESTORE (SALES) ---
export const addSaleRequest = (saleData: { items: CartItem[] | PosCartItem[], totalPrice: number, paymentMethod: 'PIX' | 'Débito' | 'Crédito' | 'Cartão (Online)', customerName?: string }): Promise<any> => {
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

export const completeSaleRequest = async (requestId: string, details: { discount?: number, finalPrice?: number, installments?: number }): Promise<void> => {
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
    for (const item of saleRequestData.items as (CartItem | PosCartItem)[]) {
        // Skip stock deduction for custom items in POS
        if ('isCustom' in item && item.isCustom) {
            continue;
        }

        const productId = 'productId' in item ? item.productId : item.product?.id;
        const variationSize = 'variationSize' in item ? item.variationSize : item.variation?.size;
        
        if (!productId || !variationSize) continue;

        const productDocRef = doc(db, "products", productId);
        const productSnap = await getDoc(productDocRef);

        if (productSnap.exists()) {
            const productData = productSnap.data() as Product;
            let variationFound = false;

            const updatedVariations = productData.variations.map(v => {
                if (v.size === variationSize) {
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
    await updateDoc(saleRequestDocRef, { 
        status: "completed",
        ...details
    });
};

export const deleteSaleRequest = (requestId: string): Promise<void> => {
    const saleRequestDoc = doc(db, "saleRequests", requestId);
    return deleteDoc(saleRequestDoc);
};

export const finalizePosSale = async (
  cart: PosCartItem[],
  totalPrice: number,
  paymentMethod: 'PIX' | 'Débito' | 'Crédito',
  details: { discount?: number; finalPrice?: number; installments?: number }
): Promise<void> => {
  // 1. Create the sale request document
  const saleRequestData = {
    items: cart,
    totalPrice: totalPrice,
    paymentMethod,
    status: 'pending', // Initially pending
    createdAt: serverTimestamp(),
  };
  const newDocRef = await addDoc(saleRequestsCollection, saleRequestData);

  // 2. Immediately call completeSaleRequest to update stock and finalize
  await completeSaleRequest(newDocRef.id, details);
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