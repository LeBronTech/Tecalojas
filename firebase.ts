
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
    orderBy,
    limit
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, uploadString } from "firebase/storage";

import { User, Product, DynamicBrand, CatalogPDF, SaleRequest, CartItem, StoreName, PosCartItem, Variation, CategoryItem, CardFees } from './types';
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
const categoriesCollection = collection(db, "categories");
const saleRequestsCollection = collection(db, "saleRequests");
const settingsCollection = collection(db, "settings");
const provider = new GoogleAuthProvider();

// --- HELPERS ---
/**
 * Removes undefined keys from an object and ensures numbers are valid.
 */
const cleanObject = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
        if (newObj[key] === undefined) {
            delete newObj[key];
        }
    });
    return newObj;
};

// --- AUTHENTICATION ---
const getUserProfile = async (uid: string): Promise<Pick<User, 'role'>> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData && userData.role === 'admin') {
            return { role: 'admin' };
        }
    }
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

function base64ToUint8Array(base64DataUrl: string): Uint8Array {
    const parts = base64DataUrl.split(',');
    const base64 = parts.length > 1 ? parts[1] : parts[0];
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

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

export const uploadBase64Image = (path: string, base64DataUrl: string): { promise: Promise<string>, cancel: () => void } => {
    let data: Uint8Array;
    try {
        data = base64ToUint8Array(base64DataUrl);
    } catch (e: any) {
        return { promise: Promise.reject(new Error("Falha interna na conversão da imagem: " + e.message)), cancel: () => {} };
    }

    const fileRef = ref(storage, path);
    const metadata = { contentType: 'image/jpeg' };
    const uploadTask = uploadBytesResumable(fileRef, data, metadata);

    const promise = new Promise<string>((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`[Background Upload] ${path}: ${progress.toFixed(0)}%`);
            },
            (error) => {
                console.error(`[Background Upload Error] ${path}:`, error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (e: any) {
                    reject(e);
                }
            }
        );
    });

    return { promise, cancel: () => uploadTask.cancel() };
};

export const processImageUploadsForProduct = async (product: Product): Promise<void> => {
    const productDocRef = doc(db, "products", product.id);

    const uploadAndQueueUpdate = async (fieldPath: string, dataUrl: string) => {
        if (dataUrl && dataUrl.startsWith('data:')) {
            const storagePath = `products/${product.id}/${fieldPath.replace(/[.\[\]]/g, '_')}_${Date.now()}.jpg`;
            try {
                const { promise } = uploadBase64Image(storagePath, dataUrl);
                const downloadURL = await promise;
                console.log(`Successfully uploaded ${fieldPath}. Updating document.`);
                await updateDoc(productDocRef, { [fieldPath]: downloadURL });
            } catch (error) {
                console.error(`Failed to upload and link image for ${fieldPath}:`, error);
            }
        }
    };
    
    await uploadAndQueueUpdate('baseImageUrl', product.baseImageUrl);

    for (let i = 0; i < product.variations.length; i++) {
        await uploadAndQueueUpdate(`variations.${i}.imageUrl`, product.variations[i].imageUrl);
    }
    
    if (product.backgroundImages) {
        for (const env of Object.keys(product.backgroundImages)) {
            const key = env as keyof Product['backgroundImages'];
            const images = product.backgroundImages[key];

            if (typeof images === 'string') {
                await uploadAndQueueUpdate(`backgroundImages.${key}`, images);
            } else if (typeof images === 'object' && images !== null) {
                for (const color of Object.keys(images)) {
                    await uploadAndQueueUpdate(`backgroundImages.${key}.${color}`, images[color]);
                }
            }
        }
    }
    console.log("All image processing finished for product:", product.id);
};


// --- FIRESTORE (PRODUCTS) ---
export const onProductsUpdate = (
  onSuccess: (products: Product[]) => void,
  onError: (error: FirestoreError) => void,
  limitCount?: number
) => {
  let q;
  if (limitCount) {
      q = query(productsCollection, limit(limitCount));
  } else {
      q = productsCollection;
  }

  return onSnapshot(
    q,
    (snapshot: any) => {
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

export const addProductData = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const cleanData = { ...productData } as any;
    Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
            delete cleanData[key];
        }
    });
    const docRef = await addDoc(productsCollection, cleanData);
    return { id: docRef.id, ...productData } as Product;
};

export const updateProductData = async (productId: string, productData: Partial<Omit<Product, 'id'>>): Promise<void> => {
    const productDoc = doc(db, "products", productId);
    const cleanData = { ...productData } as any;
    Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
            delete cleanData[key];
        }
    });
    await updateDoc(productDoc, cleanData);
};

export const deleteProduct = (productId: string): Promise<void> => {
    const productDoc = doc(db, "products", productId);
    return deleteDoc(productDoc);
};

// --- META / FACEBOOK CATALOG SYNC ---
// This function generates a CSV file from the product list and uploads it to Firebase Storage.
// The public URL of this file can be used as a "Data Feed" in Facebook Commerce Manager.
export const updateMetaCatalogFeed = async (products: Product[]): Promise<string> => {
    const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'google_product_category'];
    const rows = [headers.join(',')];
    const baseUrl = window.location.href.split('#')[0]; // Base URL of the app

    // CSV Escape function to handle commas and quotes
    const esc = (t: string) => `"${(t || '').replace(/"/g, '""')}"`;

    products.forEach(p => {
        // Facebook requires unique IDs for items. We can treat variations as items.
        // If no variations, use main product.
        const variations = p.variations && p.variations.length > 0 ? p.variations : [];
        
        if (variations.length > 0) {
            variations.forEach(v => {
                const stock = (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0);
                const availability = stock > 0 ? 'in stock' : 'out of stock';
                const price = v.priceFull || 0;
                const imageUrl = v.imageUrl || p.baseImageUrl;
                
                const row = [
                    esc(`${p.id}-${v.size}`), // Unique ID per variation
                    esc(`${p.name} - ${v.size}`), // Title includes size
                    esc(p.description || p.name),
                    availability,
                    'new',
                    `${price.toFixed(2)} BRL`,
                    esc(baseUrl), // Link to app
                    esc(imageUrl),
                    esc(typeof p.brand === 'string' ? p.brand : 'Lojas Têca'),
                    'Home & Garden > Decor > Throw Pillows'
                ];
                rows.push(row.join(','));
            });
        } else {
            // Fallback for product without variations (shouldn't happen given logic, but safe to have)
            const row = [
                esc(p.id),
                esc(p.name),
                esc(p.description || p.name),
                'out of stock',
                'new',
                `0.00 BRL`,
                esc(baseUrl),
                esc(p.baseImageUrl),
                esc(typeof p.brand === 'string' ? p.brand : 'Lojas Têca'),
                'Home & Garden > Decor > Throw Pillows'
            ];
            rows.push(row.join(','));
        }
    });

    const csvContent = rows.join("\n");
    
    // Upload to a fixed path in storage. This URL will be permanent and updated.
    const storageRef = ref(storage, 'catalogs/meta_feed.csv');
    
    try {
        await uploadString(storageRef, csvContent, 'raw', { contentType: 'text/csv' });
        const downloadURL = await getDownloadURL(storageRef);
        console.log("Catalog Feed Updated:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error updating catalog feed:", error);
        throw error;
    }
};


// Helper to sanitize items for Firestore storage
const sanitizeCartItems = (items: CartItem[] | PosCartItem[]) => {
    return items.map(item => {
        // Create a copy without the heavy 'product' and 'variation' objects
        const { product, variation, ...leanItem } = item as any;
        
        // Ensure productId and variationSize are present at the root level for easy recovery
        if (product?.id && !leanItem.productId) leanItem.productId = product.id;
        if (variation?.size && !leanItem.variationSize) leanItem.variationSize = variation.size;
        
        // Remove potentially large images from the sale record to save space
        // if ('baseImageUrl' in leanItem && leanItem.baseImageUrl?.startsWith('data:')) {
        //    delete leanItem.baseImageUrl;
        // }
        
        return leanItem;
    });
};

// --- FIRESTORE (SALES) ---
export const addSaleRequest = (saleData: { items: CartItem[] | PosCartItem[], totalPrice: number, paymentMethod: string, customerName?: string, type?: 'sale' | 'preorder' }): Promise<any> => {
    const sanitizedItems = sanitizeCartItems(saleData.items);
    
    return addDoc(saleRequestsCollection, {
        ...saleData,
        items: sanitizedItems,
        status: 'pending',
        type: saleData.type || 'sale',
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

export const completeSaleRequest = async (requestId: string, details: { discount?: number, finalPrice?: number, installments?: number, netValue?: number, totalProductionCost?: number }): Promise<void> => {
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
    
    for (const item of saleRequestData.items as (CartItem | PosCartItem)[]) {
        if ('isCustom' in item && item.isCustom) {
            continue;
        }

        // Se for encomenda, não mexe no estoque agora
        if ('isPreOrder' in item && item.isPreOrder) {
            continue;
        }

        const productId = 'productId' in item ? item.productId : (item as any).productId;
        const variationSize = 'variationSize' in item ? item.variationSize : (item as any).variationSize;
        
        if (!productId || !variationSize) continue;

        const productDocRef = doc(db, "products", productId);
        const productSnap = await getDoc(productDocRef);

        if (productSnap.exists()) {
            const productData = productSnap.data() as Product;
            let variationFound = false;

            const updatedVariations = productData.variations.map(v => {
                if (v.size === variationSize) {
                    variationFound = true;
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

    const finalDetails = {
        discount: details.discount || 0,
        finalPrice: details.finalPrice || (saleRequestData.totalPrice - (details.discount || 0)),
        installments: details.installments || 1,
        netValue: details.netValue,
        totalProductionCost: details.totalProductionCost
    };
    const cleanedDetails = cleanObject(finalDetails);

    await updateDoc(saleRequestDocRef, { 
        status: "completed",
        ...cleanedDetails
    });
};

/**
 * Exclui uma solicitação de venda. 
 * Se o status era 'completed', devolve os produtos ao estoque.
 */
export const deleteSaleRequest = async (requestId: string): Promise<void> => {
    const saleRequestDocRef = doc(db, "saleRequests", requestId);
    const saleRequestSnap = await getDoc(saleRequestDocRef);
    
    if (!saleRequestSnap.exists()) {
        throw new Error("Registro não encontrado.");
    }

    const saleData = saleRequestSnap.data() as SaleRequest;

    // Se a venda estava concluída, precisamos estornar o estoque
    if (saleData.status === 'completed') {
        for (const item of saleData.items as (CartItem | PosCartItem)[]) {
            if ('isCustom' in item && item.isCustom) continue;
            if ('isPreOrder' in item && item.isPreOrder) continue;

            const productId = 'productId' in item ? item.productId : (item as any).productId;
            const variationSize = 'variationSize' in item ? item.variationSize : (item as any).variationSize;

            if (!productId || !variationSize) continue;

            const productDocRef = doc(db, "products", productId);
            const productSnap = await getDoc(productDocRef);

            if (productSnap.exists()) {
                const productData = productSnap.data() as Product;
                const updatedVariations = productData.variations.map(v => {
                    if (v.size === variationSize) {
                        // Devolve para a loja principal (Têca) por padrão no estorno
                        v.stock[StoreName.TECA] = (v.stock[StoreName.TECA] || 0) + item.quantity;
                    }
                    return v;
                });
                
                await updateDoc(productDocRef, { 
                    variations: updatedVariations,
                    unitsSold: Math.max(0, (productData.unitsSold || 0) - item.quantity)
                });
            }
        }
    }

    return deleteDoc(saleRequestDocRef);
};

export const finalizePosSale = async (
  cart: PosCartItem[],
  totalPrice: number,
  paymentMethod: 'PIX' | 'Débito' | 'Crédito' | 'Dinheiro',
  details: { discount?: number; finalPrice?: number; installments?: number, netValue?: number, totalProductionCost?: number }
): Promise<void> => {
  const sanitizedItems = sanitizeCartItems(cart);

  // Directly create as completed to avoid "Pending Sale" notifications in the app
  const saleRequestData = {
    items: sanitizedItems,
    totalPrice: totalPrice,
    paymentMethod,
    status: 'completed', // Immediately completed
    type: 'sale' as const,
    createdAt: serverTimestamp(),
    discount: details.discount || 0,
    finalPrice: details.finalPrice || (totalPrice - (details.discount || 0)),
    installments: details.installments || 1,
    netValue: details.netValue,
    totalProductionCost: details.totalProductionCost
  };
  
  const finalDetails = cleanObject(saleRequestData);
  
  // Deduct stock manually here since we are skipping the 'completeSaleRequest' flow which handles logic based on status transition
  for (const item of cart) {
        if (item.isCustom) continue;

        const productId = item.product?.id;
        const variationSize = item.variation?.size;
        
        if (!productId || !variationSize) continue;

        const productDocRef = doc(db, "products", productId);
        const productSnap = await getDoc(productDocRef);

        if (productSnap.exists()) {
            const productData = productSnap.data() as Product;
            let variationFound = false;

            const updatedVariations = productData.variations.map(v => {
                if (v.size === variationSize) {
                    variationFound = true;
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

  await addDoc(saleRequestsCollection, finalDetails);
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

// --- FIRESTORE (CATEGORIES) ---
export const onCategoriesUpdate = (
    onSuccess: (categories: CategoryItem[]) => void,
    onError: (error: FirestoreError) => void
) => {
    return onSnapshot(
      categoriesCollection,
      (snapshot) => {
        const categories = snapshot.docs.map(
          (doc) => {
              const data = doc.data();
              // Default to 'category' if type is missing (legacy data support)
              return { 
                  id: doc.id, 
                  name: data.name || 'Sem Nome', 
                  type: data.type || 'category' 
              } as CategoryItem;
          }
        );
        onSuccess(categories);
      },
      onError
    );
};

export const addCategory = (categoryData: Omit<CategoryItem, 'id'>) => {
    return addDoc(categoriesCollection, categoryData as { [key: string]: any });
};

export const deleteCategory = (categoryId: string) => {
    return deleteDoc(doc(db, "categories", categoryId));
};

// --- FIRESTORE (GLOBAL SETTINGS) ---
export const onSettingsUpdate = (
    onSuccess: (settings: { 
        cardFees: CardFees, 
        weeklyGoal: number,
        colors?: { name: string; hex: string }[],
        sofaColors?: { name: string; hex: string }[]
    }) => void,
    onError?: (error: FirestoreError) => void
) => {
    const settingsDoc = doc(db, "settings", "global_settings");
    return onSnapshot(settingsDoc, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            onSuccess({
                cardFees: data.cardFees || { debit: 0, credit1x: 0, credit2x: 0, credit3x: 0 },
                weeklyGoal: data.weeklyGoal || 0,
                colors: data.colors || [],
                sofaColors: data.sofaColors || []
            });
        } else {
            console.log("Configurações globais ainda não existem.");
            // Send default values to prevent undefined errors in UI
            onSuccess({
                cardFees: { debit: 0, credit1x: 0, credit2x: 0, credit3x: 0 },
                weeklyGoal: 0,
                colors: [],
                sofaColors: []
            });
        }
    }, (error) => {
        // Log clear debugging info for permission issues
        console.error(`Erro no listener de Configurações (${error.code}):`, error.message);
        if (onError) onError(error);
    });
};

export const updateGlobalSettings = async (data: Partial<{ 
    cardFees: CardFees; 
    weeklyGoal: number;
    colors: { name: string; hex: string }[];
    sofaColors: { name: string; hex: string }[];
}>): Promise<void> => {
    const settingsDoc = doc(db, "settings", "global_settings");
    await setDoc(settingsDoc, data, { merge: true });
};
