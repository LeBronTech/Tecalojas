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
}

export interface Product {
  id: string;
  originalId?: string;
  variationGroupId?: string;
  name: string;
  baseImageUrl: string;
  unitsSold: number;
  category: string;
  fabricType: string;
  description: string;
  waterResistance: WaterResistanceLevel;
  brand: Brand | string; // Can be enum for old data or string for new
  variations: Variation[];
  backgroundImages?: {
    quarto?: string;
    sala?: string;
    varanda?: string;
  };
  mainColor?: { name: string; hex: string };
}

export enum View {
  SHOWCASE,
  STOCK,
  SETTINGS,
  CATALOG,
}

export type Theme = 'light' | 'dark';

export interface User {
  uid: string;
  email: string | null;
  role?: 'admin' | 'user';
}