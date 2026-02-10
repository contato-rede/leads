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

/** Configuração da última busca, salva no IndexedDB para continuar de onde parou. */
export interface SearchConfig {
  id: string;
  campaignId?: string;
  query: string;
  targetGoal: number;
  concurrency: number;
  updatedAt: number;
}

/** Campanha: uma busca nomeada com sua config; vários leads podem pertencer a uma campanha. */
export interface Campaign {
  id: string;
  name: string;
  query: string;
  targetGoal: number;
  concurrency: number;
  updatedAt: number;
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