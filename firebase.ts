import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch
} from "firebase/firestore";

import { User, Product } from './types';
import { firebaseConfig } from './firebaseConfig';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const productsCollection = collection(db, "products");
const provider = new GoogleAuthProvider();

// --- AUTHENTICATION ---

export const signUp = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  return { uid, email };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  return { uid, email };
};

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  return { uid: user.uid, email: user.email! };
};

export const signOut = (): Promise<void> => {
  return firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      callback({ uid: firebaseUser.uid, email: firebaseUser.email! });
    } else {
      callback(null);
    }
  });
};


// --- FIRESTORE (PRODUCTS) ---

export const onProductsUpdate = (callback: (products: Product[]) => void) => {
  return onSnapshot(productsCollection, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Product));
    callback(products);
  });
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

// --- DATABASE SEEDING ---

export const seedDatabaseIfEmpty = async (initialProducts: Product[]) => {
  const snapshot = await getDocs(productsCollection);
  if (snapshot.empty) {
    console.log("Database is empty, seeding with initial products...");
    const batch = writeBatch(db);
    initialProducts.forEach((product) => {
        // Firestore generates the ID, so we don't need to provide one.
        const { id, ...productData } = product;
        const docRef = doc(productsCollection); // Create a new doc with a generated ID
        batch.set(docRef, productData);
    });
    await batch.commit();
    console.log("Database seeded successfully!");
  }
};