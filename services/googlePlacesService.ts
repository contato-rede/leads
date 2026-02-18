
import { Business, SearchResult } from "../types";

/**
 * Service to extract leads using Google Places API (Text Search + Details).
 * Replaces the old Gemini-based implementation.
 */
export class LeadExtractorService {
    private apiKey: string;
    private nextPageToken: string | null = null;
    private lastQuery: string = "";
    private isFirstSearch: boolean = true;
    private finished: boolean = false;
    private retryCount: number = 0;
    private readonly MAX_RETRIES: number = 3;

    // Pricing (approximate, check Google Cloud Pricing for updates)
    // Text Search: ~$0.032 per request (returns up to 20 results)
    // Place Details (Basic + Contact): ~$0.017 per request
    private PRICING = {
        textSearch: 0.032,
        placeDetails: 0.017
    };

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("API Key is required.");
        }
        // Validar formato básico da chave do Google API (começa com "AIza...")
        if (!apiKey.startsWith('AIza')) {
            console.warn("Aviso: A chave API não parece seguir o formato padrão do Google (AIza...)");
        }
        this.apiKey = apiKey;
    }

    /**
     * Performs a search using Google Places API.
     * 
     * @param query The search query (e.g., "Retífica de Motores em Chapecó, SC").
     * @param userLocation Optional user location (latitude, longitude).
     * @param excludeNames List of business names to exclude from results.
     * @returns Promise<SearchResult> containing the list of businesses.
     */
    public async search(
        query: string,
        userLocation?: { lat: number; lng: number },
        excludeNames: string[] = [],
        radius?: number
    ): Promise<SearchResult> {

        // Reset pagination if query changes
        if (query !== this.lastQuery) {
            this.nextPageToken = null;
            this.lastQuery = query;
            this.isFirstSearch = true;
            this.finished = false;
            this.retryCount = 0;
        }

        if (this.finished) {
            return {
                businesses: [],
                usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
                estimatedCost: 0
            };
        }

        try {
            // 1. First Call: Text Search
            // If we have a next_page_token, use it. Otherwise, normal search.
            let url = `/google-api/maps/api/place/textsearch/json?key=${this.apiKey}`;

            if (this.nextPageToken) {
                url += `&pagetoken=${this.nextPageToken}`;
                // Google requires a short delay before using the next_page_token. 
                // We increase this for better stability.
                await new Promise(resolve => setTimeout(resolve, 3500));
            } else {
                url += `&query=${encodeURIComponent(query)}`;
                // Optionally use location bias if provided, though typically query string is enough
                // Optionally use location bias if provided
                if (userLocation) {
                    url += `&location=${userLocation.lat},${userLocation.lng}`;
                    if (radius) {
                        url += `&radius=${radius}`;
                    }
                }
            }

            const searchResponse = await fetch(url, {
                signal: AbortSignal.timeout(15000) // 15 segundos timeout
            });
            if (!searchResponse.ok) {
                if (searchResponse.status === 403 || searchResponse.status === 401) {
                    const fatalErr = new Error(`Erro de Permissão (HTTP ${searchResponse.status}): Verifique sua API Key.`);
                    (fatalErr as any).isFatal = true;
                    throw fatalErr;
                }
                throw new Error(`Google Places Text Search failed: ${searchResponse.statusText}`);
            }

            const searchData = await searchResponse.json();

            if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
                if (searchData.status === 'REQUEST_DENIED') {
                    const fatalErr = new Error(`Erro de Permissão (API KEY inválida ou sem saldo): ${searchData.error_message || ''}`);
                    (fatalErr as any).isFatal = true;
                    throw fatalErr;
                }
                if (searchData.status === 'INVALID_REQUEST' && !this.nextPageToken) {
                    const fatalErr = new Error(`Requisição Inválida: ${searchData.error_message || ''}`);
                    (fatalErr as any).isFatal = true;
                    throw fatalErr;
                }

                // Token might be invalid or expired (usually not ready yet)
                if (searchData.status === 'INVALID_REQUEST' && this.nextPageToken) {
                    this.retryCount++;

                    if (this.retryCount > this.MAX_RETRIES) {
                        console.warn(`[PlacesAPI] Max retries (${this.MAX_RETRIES}) reached for page token. Moving to next page.`);
                        this.nextPageToken = null;
                        this.retryCount = 0;
                        this.finished = true;
                        return {
                            businesses: [],
                            usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
                            estimatedCost: 0
                        };
                    }

                    console.warn(`[PlacesAPI] Page token not ready yet. Retry ${this.retryCount}/${this.MAX_RETRIES}...`);
                    // Wait longer for each retry to give Google more time
                    const waitTime = 2000 + (this.retryCount * 1000); // 2s, 3s, 4s
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    return this.search(query, userLocation, excludeNames, radius);
                }
                if (searchData.status === 'OVER_QUERY_LIMIT') {
                    const quotaErr = new Error("Google Places Quota Limit");
                    (quotaErr as any).status = 429;
                    throw quotaErr;
                }
                throw new Error(`Google Places API error: ${searchData.status} - ${searchData.error_message || ''}`);
            }

            // Store next_page_token for subsequent calls
            this.nextPageToken = searchData.next_page_token || null;
            this.isFirstSearch = false;

            if (!this.nextPageToken) {
                this.finished = true;
            }

            const results = searchData.results || [];
            const businesses: Business[] = [];
            let cost = this.PRICING.textSearch;

            // Filter out excluded names before fetching details to save money
            const filteredResults = results.filter((place: any) =>
                !excludeNames.includes(place.name)
            );

            // 2. Second Call: Place Details for each result
            // We need to fetch details to get phone number and website
            // Execute in parallel but be mindful of rate limits (though standard quotas are high)
            const detailsPromises = filteredResults.map(async (place: any, index: number) => {
                return this.getPlaceDetails(place, index);
            });

            const detailsResults = await Promise.all(detailsPromises);

            // Filter out any nulls (failed details fetches)
            businesses.push(...detailsResults.filter((b): b is Business => b !== null));

            cost += (businesses.length * this.PRICING.placeDetails);

            return {
                businesses,
                usage: {
                    promptTokenCount: 0,
                    candidatesTokenCount: 0,
                    totalTokenCount: 0
                },
                estimatedCost: cost
            };

        } catch (error: any) {
            console.error("Error in GooglePlacesService:", error);
            throw error;
        }
    }

    public resetPagination(): void {
        this.nextPageToken = null;
        this.finished = false;
        this.isFirstSearch = true;
        this.retryCount = 0;
    }

    /**
     * Performs a Nearby Search using Google Places API.
     * Useful for grid-based searching.
     */
    public async nearbySearch(
        lat: number,
        lng: number,
        radius: number = 2000,
        keyword?: string,
        type?: string,
        excludeNames: string[] = []
    ): Promise<SearchResult> {
        try {
            let url = `/google-api/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${this.apiKey}`;

            if (keyword) {
                url += `&keyword=${encodeURIComponent(keyword)}`;
            }

            if (type) {
                url += `&type=${type}`;
            }

            if (this.nextPageToken) {
                url = `/google-api/maps/api/place/nearbysearch/json?pagetoken=${this.nextPageToken}&key=${this.apiKey}`;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const searchResponse = await fetch(url);
            if (!searchResponse.ok) {
                if (searchResponse.status === 403 || searchResponse.status === 401) {
                    const fatalErr = new Error(`Erro de Permissão (HTTP ${searchResponse.status}): Verifique sua API Key.`);
                    (fatalErr as any).isFatal = true;
                    throw fatalErr;
                }
                throw new Error(`Google Places Nearby Search failed: ${searchResponse.statusText}`);
            }

            const searchData = await searchResponse.json();

            if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
                if (searchData.status === 'OVER_QUERY_LIMIT') {
                    const quotaErr = new Error("Google Places Quota Limit");
                    (quotaErr as any).status = 429;
                    throw quotaErr;
                }
                // If INVALID_REQUEST with pagetoken, it might be expired
                if (searchData.status === 'INVALID_REQUEST' && this.nextPageToken) {
                    this.nextPageToken = null;
                    this.finished = true;
                    return { businesses: [], usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 }, estimatedCost: 0 };
                }
                throw new Error(`Google Places API error: ${searchData.status} - ${searchData.error_message || ''}`);
            }

            this.nextPageToken = searchData.next_page_token || null;
            if (!this.nextPageToken) this.finished = true;

            const results = searchData.results || [];
            const filteredResults = results.filter((place: any) => !excludeNames.includes(place.name));

            const detailsPromises = filteredResults.map(async (place: any, index: number) => {
                return this.getPlaceDetails(place, index);
            });

            const detailsResults = await Promise.all(detailsPromises);
            const businesses = detailsResults.filter((b): b is Business => b !== null);

            const cost = this.PRICING.textSearch + (businesses.length * this.PRICING.placeDetails);

            return {
                businesses,
                usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
                estimatedCost: cost
            };

        } catch (error: any) {
            console.error("Error in nearbySearch:", error);
            throw error;
        }
    }

    /**
     * Resolves a string query to coordinates and viewport using Google Geocoding API.
     */
    public async geocode(address: string): Promise<{
        center: { lat: number; lng: number };
        viewport?: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } }
    } | null> {
        try {
            const url = `/google-api/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();
            if (data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                return {
                    center: result.geometry.location,
                    viewport: result.geometry.viewport ? {
                        ne: result.geometry.viewport.northeast,
                        sw: result.geometry.viewport.southwest
                    } : undefined
                };
            }
            return null;
        } catch (e) {
            console.error("Geocoding failed", e);
            return null;
        }
    }

    /**
     * Generates a grid of coordinates around a center point.
     * @param center Lat/Lng of center
     * @param circles Number of concentric-ish circles (or square rings)
     * @param stepDistance Distance between points in km (default 2km)
     */
    public generateGrid(center: { lat: number, lng: number }, rangeKm: number = 5, stepKm: number = 2): { lat: number, lng: number }[] {
        const points: { lat: number, lng: number }[] = [];

        // Approx conversion: 1 deg lat = 111.32 km
        const latStep = stepKm / 111.32;
        // 1 deg lng = 111.32 * cos(lat) km
        const lngStep = stepKm / (111.32 * Math.cos(center.lat * (Math.PI / 180)));

        const steps = Math.ceil(rangeKm / stepKm);

        for (let x = -steps; x <= steps; x++) {
            for (let y = -steps; y <= steps; y++) {
                points.push({
                    lat: center.lat + (x * latStep),
                    lng: center.lng + (y * lngStep)
                });
            }
        }

        return points;
    }

    public isFinished(): boolean {
        return this.finished;
    }

    public getNextPageToken(): string | null {
        return this.nextPageToken;
    }

    /**
     * Extracts the business category from a query by removing location-related parts.
     * Example: "Retífica em Santa Catarina" -> "Retífica"
     * Example: "Clínicas, Chapecó" -> "Clínicas" (when "Chapecó" is not in location context)
     * Updated: Queries with comma like "term1, term2" are treated as combined search terms
     */
    public extractCategory(query: string): string {
        if (!query) return "";

        // Remove everything after common separators (including " em ", " de ", etc.)
        // We do NOT split by comma anymore, as per requirements.
        // Comma is treated as part of the category/service search (e.g. "Mechanic, Diesel")
        const separators = [" - ", " – ", " em ", " no ", " na ", " de ", " in ", " near ", " perto de ", "|"];
        let cleaned = query;

        for (const sep of separators) {
            const index = cleaned.toLowerCase().indexOf(sep);
            if (index !== -1) {
                cleaned = cleaned.substring(0, index);
            }
        }

        return cleaned.trim();
    }

    /**
     * Extracts the location part from a query (everything after location-specific separators).
     * Example: "Retífica de motores em Santa Catarina" -> "Santa Catarina"
     * Updated: Only extracts location from location-specific separators, ignores comma
     */
    public extractLocation(query: string): string {
        if (!query) return "";

        // Only use location-specific separators.
        // We explicitly ignore commas here to ensure "mechanic, diesel" is not treated as location.
        const separators = [" em ", " no ", " na ", " in ", " - ", " – ", " near ", " perto de ", "|"];

        for (const sep of separators) {
            const index = query.toLowerCase().indexOf(sep);
            if (index !== -1) {
                const loc = query.substring(index + sep.length).trim();
                console.log(`[Service] Extracted location: "${loc}" from query: "${query}" using separator: "${sep}"`);
                return loc;
            }
        }

        return "";
    }

    /**
     * Validates if a string looks like a location based on common patterns
     */
    private isValidLocation(location: string): boolean {
        if (!location) return false;

        // Check if it contains typical location indicators
        const locationIndicators = [
            'sul', 'norte', 'leste', 'oeste',
            'centro', 'bairro', 'cidade', 'estado', 'região',
            'sp', 'rj', 'mg', 'rs', 'sc', 'pr', 'df', 'go', 'mt', 'ms',
            'ba', 'se', 'al', 'pe', 'pb', 'rn', 'ce', 'pi', 'ma', 'pa',
            'am', 'rr', 'ap', 'to', 'ro', 'ac', 'pb', 'rn', 'ce', 'ma', 'pa',
            'sul', 'sudeste', 'norte', 'nordeste', 'centro-oeste',
            'brasil', 'br', 'brazil'
        ];

        const lowerLoc = location.toLowerCase();

        // If it contains location indicators, it's likely a location
        if (locationIndicators.some(indicator => lowerLoc.includes(indicator))) {
            return true;
        }

        // Check if it looks like a city/state name (not too short, has proper capitalization pattern)
        const words = location.trim().split(/\s+/);
        return words.length >= 1 && location.length > 2;
    }

    /**
     * Fetches details for a single place.
     */
    private async getPlaceDetails(place: any, index: number): Promise<Business | null> {
        try {
            const fields = 'name,formatted_phone_number,website,formatted_address,rating,user_ratings_total,types';
            const url = `/google-api/maps/api/place/details/json?place_id=${place.place_id}&fields=${fields}&key=${this.apiKey}`;

            const response = await fetch(url, {
                signal: AbortSignal.timeout(10000) // 10 segundos timeout
            });
            if (!response.ok) return null;

            const data = await response.json();
            if (data.status !== 'OK') return null;

            const details = data.result;

            return {
                id: `biz-${place.place_id}`,
                campaignId: "",
                name: details.name || place.name,
                phone: details.formatted_phone_number || "",
                address: details.formatted_address || place.formatted_address || "",
                website: details.website || "",
                rating: details.rating || place.rating || 0,
                reviews: details.user_ratings_total || place.user_ratings_total || 0,
                category: (details.types && details.types.length > 0) ? details.types[0].replace(/_/g, ' ') : "Empresa",
                description: `Source: Google Places API (Place ID: ${place.place_id})`,
                facebook: "",
                instagram: "",
                timestamp: Date.now()
            };
        } catch (e) {
            console.error(`Failed to get details for ${place.place_id}`, e);
            return null;
        }
    }
}
