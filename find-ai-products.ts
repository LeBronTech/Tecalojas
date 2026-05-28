import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAvP0EoCS5ePCQIb2qNxD2Ek-UOTGcXaO0",
  authDomain: "teca-54f58.firebaseapp.com",
  projectId: "teca-54f58",
  storageBucket: "teca-54f58.appspot.com",
  messagingSenderId: "463169842239",
  appId: "1:463169842239:web:87ed9019f9758502635c8a",
  measurementId: "G-JRDNC9K02"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("Fetching all products...");
  const snapshot = await getDocs(collection(db, "products"));
  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log("Total products in DB:", products.length);
  
  const diffImagesProducts = products.filter((p: any) => p.originalBaseImageUrl && p.baseImageUrl !== p.originalBaseImageUrl);
  console.log("Products where baseImageUrl !== originalBaseImageUrl (Count:", diffImagesProducts.length, "):");
  diffImagesProducts.forEach((p: any) => {
    console.log(`- ${p.name} (${p.category})`);
    console.log(`  baseImageUrl: ${p.baseImageUrl ? p.baseImageUrl.substring(0, 30) : 'none'}`);
    console.log(`  originalBaseImageUrl: ${p.originalBaseImageUrl ? p.originalBaseImageUrl.substring(0, 30) : 'none'}`);
  });

  const nullOriginalProducts = products.filter((p: any) => !p.originalBaseImageUrl);
  console.log("\nProducts with missing/empty originalBaseImageUrl (Count:", nullOriginalProducts.length, "):");
  nullOriginalProducts.slice(0, 10).forEach((p: any) => {
    console.log(`- ${p.name} (${p.category})`);
  });
}

main().catch(console.error);
