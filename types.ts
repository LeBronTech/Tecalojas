
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

export interface CategoryItem {
  id: string;
  name: string;
  type: 'category' | 'subcategory';
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
  brand: Brand | string;
  variations: Variation[];
  backgroundImages?: {
    quarto?: { [color: string]: string };
    sala?: { [color: string]: string };
    varanda?: string;
    piscina?: string;
  };
  isMultiColor?: boolean;
  colors: { name: string; hex: string }[];
  productionCost?: number;
}

export interface SavedComposition {
  id: string;
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
  isPreOrder?: boolean;
}

export interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  product?: Product;
  variation?: Variation;
  itemType?: 'cover' | 'full';
  isCustom: boolean;
}

export interface SaleRequest {
  id: string;
  items: CartItem[] | PosCartItem[];
  totalPrice: number;
  paymentMethod: 'PIX' | 'Débito' | 'Crédito' | 'Cartão (Online)' | 'WhatsApp (Encomenda)' | 'Dinheiro';
  status: 'pending' | 'completed';
  type: 'sale' | 'preorder';
  createdAt: any;
  customerName?: string;
  installments?: number;
  discount?: number;
  finalPrice?: number;
  netValue?: number;
  totalProductionCost?: number;
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

declare global {
    var QRCode: any;
    var jsQR: any;
}