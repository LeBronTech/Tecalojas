// FIX: Moved StoreName enum here from constants.ts to break a circular dependency.
export enum StoreName {
  TECA = 'Têca',
  IONE = 'Ione',
}

export enum CushionSize {
  SQUARE_40 = '40x40',
  SQUARE_45 = '45x45',
  SQUARE_50 = '50x50',
  SQUARE_60 = '60x60',
  LUMBAR = 'Lombar (25x45)',
}

export enum Brand {
  DOLHER = 'Dohler',
  KARSTEN = 'Karsten',
  MARCA_PROPRIA = 'Marca Própia',
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
  name: string;
  baseImageUrl: string;
  unitsSold: number;
  category: string;
  fabricType: string;
  description: string;
  waterResistance: WaterResistanceLevel;
  brand: Brand;
  variations: Variation[];
}

export enum View {
  SHOWCASE,
  STOCK,
}

export type Theme = 'light' | 'dark';

export interface User {
  uid: string;
  email: string | null;
  role?: 'admin' | 'user';
}