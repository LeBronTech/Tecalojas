
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

window.completeGoogleSignIn = async (idToken: string | null, errorMsg: string | null) => {
    if (errorMsg) {
        return;
    }
    if (idToken) {
        try {
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            if (!userCredential.user) throw new Error("Falha no login");
        } catch (error) {
            console.error(error);
        }
    }
};

export const signInWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const profile = await getUserProfile(user.uid);
    return { uid: user.uid, email: user.email!, role: profile.role };
};

export const signOut = (): Promise<void> => {
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
export const uploadFile = (path: string, file: File | Blob, onProgress?: (progress: number) => void): { promise: Promise<string>, cancel: () => void } => {
    const fileRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);
    const promise = new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
        }, (error) => reject(error), async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
        });
    });
    return { promise, cancel: () => uploadTask.cancel() };
};

// --- FIRESTORE (PRODUCTS) ---
export const onProductsUpdate = (onSuccess: (products: Product[]) => void, onError: (error: FirestoreError) => void) => {
  return onSnapshot(productsCollection, (snapshot) => {
      const products = snapshot.docs.map((doc) => {
          const data = doc.data();
          return { id: doc.id, ...data } as Product;
      });
      onSuccess(products);
    }, onError);
};

export const updateProductData = async (productId: string, productData: Omit<Product, 'id'>): Promise<void> => {
    await updateDoc(doc(db, "products", productId), productData as any);
};

export const addProductData = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const docRef = await addDoc(productsCollection, productData as any);
    return { id: docRef.id, ...productData } as Product;
};

export const deleteProduct = (productId: string): Promise<void> => {
    return deleteDoc(doc(db, "products", productId));
};

// --- FIRESTORE (SALES) ---
export const addSaleRequest = (saleData: any): Promise<any> => {
    return addDoc(saleRequestsCollection, {
        ...saleData,
        status: 'pending',
        createdAt: serverTimestamp()
    });
};

export const onSaleRequestsUpdate = (onSuccess: (requests: SaleRequest[]) => void, onError: (error: FirestoreError) => void) => {
    const q = query(saleRequestsCollection, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRequest));
        onSuccess(requests);
    }, onError);
};

export const completeSaleRequest = async (requestId: string, details: any): Promise<void> => {
    await updateDoc(doc(db, "saleRequests", requestId), { status: "completed", ...details });
};

export const deleteSaleRequest = async (requestId: string): Promise<void> => {
    return deleteDoc(doc(db, "saleRequests", requestId));
};

export const finalizePosSale = async (cart: any, total: number, method: string, details: any) => {
    await addDoc(saleRequestsCollection, {
        items: cart,
        totalPrice: total,
        paymentMethod: method,
        status: 'completed',
        type: 'sale',
        createdAt: serverTimestamp(),
        ...details
    });
};

// --- SETTINGS (CENTRALIZED) ---
export const onSettingsUpdate = (onSuccess: (settings: any) => void) => {
    return onSnapshot(doc(db, "settings", "global_settings"), (snapshot) => {
        if (snapshot.exists()) onSuccess(snapshot.data());
    });
};

export const updateGlobalSettings = async (data: any) => {
    await setDoc(doc(db, "settings", "global_settings"), data, { merge: true });
};

export const onBrandsUpdate = (onSuccess: (brands: DynamicBrand[]) => void, onError: (error: FirestoreError) => void) => {
    return onSnapshot(brandsCollection, (snapshot) => {
        onSuccess(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DynamicBrand)));
    }, onError);
};
export const addBrand = (brandData: any) => addDoc(brandsCollection, brandData);

export const onCatalogsUpdate = (onSuccess: (catalogs: CatalogPDF[]) => void, onError: (error: FirestoreError) => void) => {
    return onSnapshot(catalogsCollection, (snapshot) => {
        onSuccess(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogPDF)));
    }, onError);
};
export const addCatalog = (data: any) => addDoc(catalogsCollection, data);

export const onCategoriesUpdate = (onSuccess: (categories: CategoryItem[]) => void, onError: (error: FirestoreError) => void) => {
    return onSnapshot(categoriesCollection, (snapshot) => {
        onSuccess(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryItem)));
    }, onError);
};
export const addCategory = (data: any) => addDoc(categoriesCollection, data);
export const deleteCategory = (id: string) => deleteDoc(doc(db, "categories", id));
