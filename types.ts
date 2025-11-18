import { createContext } from 'react';

// FIX: Defined and exported the StoreName enum here to resolve a circular dependency.
export enum StoreName {
  TECA = 'Têca',
  IONE = 'Ione Decor',
}

export enum CushionSize {
  SQUARE_40 = '40x40',
  SQUARE_45 = '45x45',
  SQUARE_50 = '50x50',
  SQUARE_60 = '60x60',
  LUMBAR = 'Lombar (25x45)',
}

// The Brand enum is being deprecated in favor of a dynamic Brand interface
// It's kept temporarily for compatibility with existing data structures.
export enum Brand {
  DOLHER = 'Döhler®',
  KARSTEN = 'Karsten®',
  MARCA_PROPRIA = 'Marca Própia',
}

export interface DynamicBrand {
  id: string;
  name: string;
  logoUrl: string;
}

export interface CatalogPDF {
    id: string;
    brandName: string;
    fileName: string;
    pdfUrl: string;
}


export enum WaterResistanceLevel {
  NONE = 'none',
  SEMI = 'semi-impermeavel',
  FULL = 'waterblock',
}

export interface Variation {
  size: CushionSize;
  imageUrl: string;
  priceCover: number;
  priceFull: number;
  stock: {
    [StoreName.TECA]: number;
    [StoreName.IONE]: number;
  };
  qrCodeUrl?: string;
}

export interface Product {
  id: string;
  originalId?: string;
  variationGroupId?: string;
  name: string;
  baseImageUrl: string;
  unitsSold: number;
  category: string;
  subCategory?: string;
  fabricType: string;
  description: string;
  waterResistance: WaterResistanceLevel;
  brand: Brand | string; // Can be enum for old data or string for new
  variations: Variation[];
  backgroundImages?: {
    quarto?: { [color: string]: string };
    sala?: { [color: string]: string };
    varanda?: string;
    piscina?: string;
  };
  isMultiColor?: boolean;
  colors: { name: string; hex: string }[];
}

export interface SavedComposition {
  id: string; // Compund key: size + sorted product IDs
  name: string;
  products: Product[];
  imageUrl?: string;
  isGenerating?: boolean;
  size: number;
}

export interface CartItem {
  productId: string;
  name: string;
  baseImageUrl: string;
  variationSize: CushionSize;
  quantity: number;
  type: 'cover' | 'full';
  price: number;
}

export interface PosCartItem {
  id: string; // Unique ID for the cart item, e.g., `${productId}-${variationSize}` or `custom-${timestamp}`
  name: string;
  price: number;
  quantity: number;
  // For catalog products
  product?: Product;
  variation?: Variation;
  itemType?: 'cover' | 'full';
  // For custom items
  isCustom: boolean;
}

export interface SaleRequest {
  id: string;
  items: CartItem[] | PosCartItem[];
  totalPrice: number;
  paymentMethod: 'PIX' | 'Débito' | 'Crédito' | 'Cartão (Online)';
  status: 'pending' | 'completed';
  createdAt: any; // Firestore Timestamp
  customerName?: string;
  // Admin-added fields
  installments?: number;
  discount?: number;
  finalPrice?: number;
}

export interface CardFees {
  debit: number;
  credit1x: number;
  credit2x: number;
  credit3x: number;
}


export enum View {
  SHOWCASE,
  STOCK,
  ASSISTANT,
  SETTINGS,
  CATALOG,
  COMPOSITION_GENERATOR,
  COMPOSITIONS,
  DIAGNOSTICS,
  CART,
  PAYMENT,
  SALES,
  QR_CODES,
}

export type Theme = 'light' | 'dark';

export interface User {
  uid: string;
  email: string | null;
  role?: 'admin' | 'user';
}

export interface CompositionViewerModalProps {
    compositions: SavedComposition[];
    startIndex: number;
    onClose: () => void;
    apiKey: string | null;
    onRequestApiKey: () => void;
    onViewProduct: (product: Product) => void;
    onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
}

// --- Theme Context ---
export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

// Global declarations for external libraries
declare global {
    var QRCode: any;
    var jsQR: any;
}