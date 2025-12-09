// User types
export enum UserRole {
  PROMOTER = 'PROMOTER',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Visit types
export interface Visit {
  id: string;
  promoterId: string;
  industryId: string;
  checkInAt: Date;
  checkOutAt: Date | null;
  checkInLatitude: number;
  checkInLongitude: number;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkInPhotoUrl: string;
  checkOutPhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Photo types
export enum PhotoType {
  FACADE_CHECKIN = 'FACADE_CHECKIN',
  FACADE_CHECKOUT = 'FACADE_CHECKOUT',
  OTHER = 'OTHER',
}

export interface Photo {
  id: string;
  visitId: string;
  url: string;
  type: PhotoType;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
}

// Price Research types
export interface PriceResearch {
  id: string;
  visitId: string;
  industryId: string;
  productName: string;
  price: number;
  competitorPrices: CompetitorPrice[];
  createdAt: Date;
}

export interface CompetitorPrice {
  competitorName: string;
  price: number;
}

// Industry types
export interface Industry {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

// Location types
export interface Location {
  id: string;
  visitId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// Photo Quota types
export interface PhotoQuota {
  id: string;
  promoterId: string;
  expectedPhotos: number;
  createdAt: Date;
  updatedAt: Date;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Export types
export interface ExportRequest {
  startDate: string;
  endDate: string;
  promoterIds?: string[];
  industryIds?: string[];
  format: 'pptx' | 'pdf' | 'excel' | 'html';
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl: string | null;
  createdAt: Date;
}

