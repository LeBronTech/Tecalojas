import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  FirestoreError
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

// Function to get user profile from Firestore
const getUserProfile = async (uid: string): Promise<Pick<User, 'role'>> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data() as Pick<User, 'role'>;
    }
    return { role: 'user' }; // Default role if no document is found
};

export const signUp = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  // Note: In a real app, you might want to create a user profile document here.
  return { uid, email, role: 'user' };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  const profile = await getUserProfile(uid);
  return { uid, email, role: profile.role };
};

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  // Note: In a real app, you might check if the user profile exists and create it if not.
  const profile = await getUserProfile(user.uid);
  return { uid: user.uid, email: user.email!, role: profile.role };
};

export const signInAsVisitor = async (): Promise<User> => {
  const userCredential = await signInAnonymously(auth);
  const { uid, email } = userCredential.user;
  return { uid, email }; // Visitors don't have roles
};

export const signOut = (): Promise<void> => {
  return firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      if (firebaseUser.isAnonymous) {
         callback({ uid: firebaseUser.uid, email: null });
      } else {
        const profile = await getUserProfile(firebaseUser.uid);
        callback({ uid: firebaseUser.uid, email: firebaseUser.email, role: profile.role });
      }
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