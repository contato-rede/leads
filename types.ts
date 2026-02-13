export interface Business {
  id: string;
  campaignId: string;
  name: string;
  phone: string;
  address: string;
  website: string;
  rating: number | string;
  reviews: number | string;
  category: string;
  description?: string;
  facebook?: string;
  instagram?: string;
  timestamp: number;
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface SearchResult {
  businesses: Business[];
  usage: UsageMetadata | undefined;
  estimatedCost: number;
}

export interface SearchState {
  isLoading: boolean;
  isLooping: boolean; // For auto-fetch mode
  currentLoopCount: number;
  error: string | null;
  results: Business[];
  totalCost: number;
}

export interface SearchConfig {
  id: string;
  campaignId?: string;
  query: string;
  niche?: string;
  location_name?: string;
  locations?: string[];
  minRating?: number;
  onlyWithPhone?: boolean;
  excludeKeywords?: string;
  targetGoal: number;
  updatedAt: number;
}

/** Campanha: uma busca nomeada com sua config; vários leads podem pertencer a uma campanha. */
export interface Campaign {
  id: string;
  name: string;
  query: string;
  niche?: string;
  location_name?: string;
  locations?: string[];
  minRating?: number;
  onlyWithPhone?: boolean;
  excludeKeywords?: string;
  targetGoal: number;
  updatedAt: number;
}

/** Estrutura do backup JSON (campanhas + leads + config). */
export interface BackupData {
  version: number;
  exportedAt: string;
  campaigns: Campaign[];
  leads: Business[];
  searchConfig?: SearchConfig | null;
}

export enum SortField {
  NAME = 'name',
  RATING = 'rating',
  REVIEWS = 'reviews'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}