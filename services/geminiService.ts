import { GoogleGenAI } from "@google/genai";
import { Business, SearchResult } from "../types";

/**
 * Serviço de extração de leads via Gemini + Google Maps (grounding).
 * Custo: grounding domina (~US$ 0.035/chamada). Reduzir número de chamadas
 * (mais leads por request, menos duplicatas) é a principal forma de economizar.
 */
export class LeadExtractorService {
  private ai: GoogleGenAI;
  private modelName: string = 'gemini-2.5-flash';

  /** Custo principal: grounding (Google Maps) por requisição. Tokens têm impacto menor. */
  private PRICING = {
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    groundingRequest: 0.035  // ~US$ 0.035 por chamada — reduzir N de chamadas é a maior economia
  };

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("A Chave da API é obrigatória.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async search(
    query: string,
    userLocation?: { lat: number; lng: number },
    excludeNames: string[] = []
  ): Promise<SearchResult> {
    const prompt = this.buildPrompt(query, excludeNames);
    const config = this.buildConfig(userLocation);

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: config
      });

      let businesses: Business[] = [];
      const sources: string[] = [];

      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        chunks.forEach((chunk: any) => {
          if (chunk.maps?.uri) sources.push(chunk.maps.uri);
        });
      }

      if (response.text) {
        businesses = this.parseResponse(response.text, sources);
      }

      const usage = response.usageMetadata;
      const inputCost = ((usage?.promptTokenCount || 0) / 1_000_000) * this.PRICING.inputPerMillion;
      const outputCost = ((usage?.candidatesTokenCount || 0) / 1_000_000) * this.PRICING.outputPerMillion;
      
      return {
        businesses,
        usage: {
            promptTokenCount: usage?.promptTokenCount || 0,
            candidatesTokenCount: usage?.candidatesTokenCount || 0,
            totalTokenCount: usage?.totalTokenCount || 0
        },
        estimatedCost: inputCost + outputCost + this.PRICING.groundingRequest
      };

    } catch (error: any) {
      const errorMsg = error.message || "";
      const isQuota = error.status === 429 || errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota");
      
      if (isQuota) {
        const quotaErr = new Error("Limite do Google atingido (429).");
        (quotaErr as any).status = 429;
        throw quotaErr;
      }
      throw error;
    }
  }

  /** Máximo de nomes no prompt para reduzir tokens e peso da requisição (evitar limite TPM/RPM). */
  private static readonly MAX_EXCLUDE_NAMES = 12;

  private buildPrompt(query: string, excludeNames: string[]): string {
    const limited = excludeNames.slice(-LeadExtractorService.MAX_EXCLUDE_NAMES);
    const avoid = limited.length > 0
      ? ` Skip already have: ${limited.join(", ")}.`
      : "";

    return `Find up to 15 NEW business leads for "${query}".${avoid}
Output ONLY a JSON array: [{"name":"","phone":"","address":"","website":"","rating":0,"reviews":0,"category":"","description":""}]`;
  }

  private buildConfig(userLocation?: { lat: number; lng: number }): any {
    const config: any = {
      tools: [{ googleMaps: {} }],
      temperature: 0.1,
    };

    if (userLocation) {
        config.toolConfig = {
            retrievalConfig: { latLng: { latitude: userLocation.lat, longitude: userLocation.lng } }
        };
    }
    return config;
  }

  /**
   * Refatorado para ser mais robusto contra falhas de formato da IA.
   * Lida com blocos markdown, campos faltantes e mapeia fontes 1:1 quando possível.
   */
  private parseResponse(text: string, sources: string[]): Business[] {
    try {
        // Limpeza de blocos de código markdown (```json ... ```)
        let cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // Localiza o primeiro [ e o último ] para extrair o array JSON caso haja texto extra
        const startIndex = cleanedText.indexOf("[");
        const endIndex = cleanedText.lastIndexOf("]");
        
        if (startIndex === -1 || endIndex === -1) {
            console.warn("Array JSON não encontrado na resposta");
            return [];
        }

        const jsonStr = cleanedText.substring(startIndex, endIndex + 1);
        const data = JSON.parse(jsonStr);

        if (!Array.isArray(data)) return [];

        return data.map((item: any, index: number) => {
          // Garante que campos numéricos sejam realmente números
          const safeRating = parseFloat(item.rating) || 0;
          const safeReviews = parseInt(item.reviews) || 0;
          
          // Tenta mapear fontes de forma inteligente:
          // Se o número de fontes for igual ao número de leads, assume mapeamento 1:1
          let sourceRef = "";
          if (sources.length > 0) {
            if (sources.length === data.length) {
                sourceRef = ` [Google Maps: ${sources[index]}]`;
            } else {
                // Fallback: usa a primeira fonte se for genérica
                sourceRef = ` [Ref: Google Maps]`;
            }
          }

          return {
            id: `biz-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
            campaignId: "",
            name: item.name || "N/A",
            phone: item.phone || "",
            address: item.address || "",
            website: item.website || "",
            rating: safeRating,
            reviews: safeReviews,
            category: item.category || "Empresa",
            description: (item.description || "").trim() + sourceRef,
            facebook: "",
            instagram: "",
            timestamp: Date.now()
          };
        });
    } catch (e) {
        console.error("Erro ao processar JSON da IA:", e, text);
        return [];
    }
  }
}