import { Business, SearchConfig, Campaign, BackupData } from "../types";

const SEARCH_CONFIG_ID = 'lastSearch';
const DEFAULT_CAMPAIGN_ID = 'default';

/**
 * Service responsible for persisting data using IndexedDB.
 * Leads (por campanha) + campanhas + última config para continuar de onde parou.
 */
export class StorageService {
  private dbName = 'RedeUniaoDB';
  private storeName = 'leads';
  private configStoreName = 'searchConfig';
  private campaignsStoreName = 'campaigns';
  private version = 3;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject("Erro ao abrir banco de dados");

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('campaignId', 'campaignId', { unique: false });
        } else if (tx.objectStoreNames.contains(this.storeName)) {
          const store = tx.objectStore(this.storeName);
          if (!store.indexNames.contains('campaignId')) {
            store.createIndex('campaignId', 'campaignId', { unique: false });
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result;
              if (cursor) {
                const lead = cursor.value as Business;
                if (!lead.campaignId) {
                  cursor.update({ ...lead, campaignId: DEFAULT_CAMPAIGN_ID });
                }
                cursor.continue();
              }
            };
          }
        }
        if (!db.objectStoreNames.contains(this.configStoreName)) {
          db.createObjectStore(this.configStoreName, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.campaignsStoreName)) {
          db.createObjectStore(this.campaignsStoreName, { keyPath: 'id' });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    await this.initDB();
    if (!this.db) throw new Error("Banco de dados não inicializado");
    return this.db;
  }

  public async saveLead(lead: Business): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      // Ensure we don't overwrite if ID conflicts (rare with timestamp ID), 
      // but put is generally fine.
      const request = store.put(lead);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Erro ao salvar lead");
    });
  }

  public async saveLeadsBulk(leads: Business[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      // Uma transação 'readwrite' garante atomicidade.
      // Se qualquer operação falhar, o evento 'onerror' da transação é chamado
      // e todas as alterações pendentes são revertidas automaticamente pelo IndexedDB.
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      transaction.oncomplete = () => {
        // Só resolve quando TODAS as operações foram commitadas no disco com sucesso.
        resolve();
      };

      transaction.onerror = (event) => {
        // Captura o erro específico do banco de dados para melhor debug
        console.error("Erro na transação Bulk:", transaction.error);
        reject(transaction.error || "Erro ao salvar lote de leads");
      };

      try {
        leads.forEach(lead => {
          store.put(lead);
        });
      } catch (e) {
        // Caso ocorra um erro síncrono na montagem da query (ex: dados inválidos)
        // abortamos manualmente para disparar o reject.
        transaction.abort();
        reject(e);
      }
    });
  }

  /** Normaliza lead antigo sem campaignId para 'default'. */
  private normalizeLead(l: Business): Business {
    return { ...l, campaignId: l.campaignId || DEFAULT_CAMPAIGN_ID };
  }

  public async getAllLeads(campaignId?: string): Promise<Business[]> {
    if (campaignId != null && campaignId !== '') return this.getLeadsByCampaignId(campaignId);
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.getAll();
      request.onsuccess = () => {
        const list = (request.result as Business[]).reverse().map((l: Business) => this.normalizeLead(l));
        resolve(list);
      };
      request.onerror = () => reject("Erro ao buscar leads");
    });
  }

  /** Retorna leads apenas da campanha indicada (por índice para ser rápido). */
  public async getLeadsByCampaignId(campaignId: string): Promise<Business[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('campaignId');
      const request = index.getAll(campaignId);
      request.onsuccess = () => {
        const list = (request.result as Business[]).map((l: Business) => this.normalizeLead(l));
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(list);
      };
      request.onerror = () => reject("Erro ao buscar leads da campanha");
    });
  }

  public async deleteLead(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Erro ao deletar lead");
    });
  }

  public async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => {
        console.error("Transaction error during clearAll:", (e.target as any).error);
        reject("Erro ao limpar banco de dados");
      }
    });
  }

  /** Salva a configuração usada na última busca (para continuar de onde parou). */
  public async saveSearchConfig(config: Omit<SearchConfig, 'id' | 'updatedAt'> & { campaignId?: string }): Promise<void> {
    const db = await this.getDB();
    const payload: SearchConfig = {
      id: SEARCH_CONFIG_ID,
      ...config,
      updatedAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.configStoreName], 'readwrite');
      const store = transaction.objectStore(this.configStoreName);
      store.put(payload);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Erro ao salvar configuração");
    });
  }

  /** Retorna a última configuração de busca salva, ou null. */
  public async getSearchConfig(): Promise<SearchConfig | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.configStoreName], 'readonly');
      const store = transaction.objectStore(this.configStoreName);
      const request = store.get(SEARCH_CONFIG_ID);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject("Erro ao carregar configuração");
    });
  }

  // --- Campanhas ---

  public async getCampaigns(): Promise<Campaign[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.campaignsStoreName], 'readonly');
      const store = transaction.objectStore(this.campaignsStoreName);
      const request = store.getAll();
      request.onsuccess = () => {
        let list = (request.result || []) as Campaign[];
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      request.onerror = () => reject("Erro ao listar campanhas");
    });
  }

  public async saveCampaign(campaign: Campaign): Promise<void> {
    const db = await this.getDB();
    const payload = { ...campaign, updatedAt: Date.now() };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.campaignsStoreName], 'readwrite');
      const store = transaction.objectStore(this.campaignsStoreName);
      store.put(payload);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Erro ao salvar campanha");
    });
  }

  public async deleteCampaign(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.campaignsStoreName], 'readwrite');
      const store = transaction.objectStore(this.campaignsStoreName);
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Erro ao excluir campanha");
    });
  }

  /** Cria a campanha padrão se não existir (para leads antigos sem campanha). */
  public async ensureDefaultCampaign(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.campaignsStoreName], 'readwrite');
      const store = transaction.objectStore(this.campaignsStoreName);
      const request = store.get(DEFAULT_CAMPAIGN_ID);
      request.onsuccess = () => {
        if (request.result == null) {
          store.put({
            id: DEFAULT_CAMPAIGN_ID,
            name: 'Campanha padrão',
            query: '',
            targetGoal: 100,
            updatedAt: Date.now(),
          });
        }
        resolve();
      };
      request.onerror = () => reject("Erro ao verificar campanha padrão");
    });
  }

  /** Exporta campanhas, leads e config em JSON para backup. */
  public async exportToJson(): Promise<string> {
    const [campaigns, leads, searchConfig] = await Promise.all([
      this.getCampaigns(),
      this.getAllLeads(),
      this.getSearchConfig(),
    ]);
    const data: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      campaigns,
      leads,
      searchConfig: searchConfig ?? null,
    };
    return JSON.stringify(data, null, 2);
  }

  /** Importa backup JSON (substitui campanhas e leads). */
  public async importFromJson(json: string): Promise<void> {
    let data: BackupData;
    try {
      data = JSON.parse(json) as BackupData;
    } catch {
      throw new Error("Arquivo JSON inválido.");
    }
    if (data.version !== 1 || !Array.isArray(data.campaigns) || !Array.isArray(data.leads)) {
      throw new Error("Formato de backup inválido (esperado: version 1, campaigns e leads).");
    }
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([this.storeName, this.campaignsStoreName], 'readwrite');
      const leadStore = tx.objectStore(this.storeName);
      const campaignStore = tx.objectStore(this.campaignsStoreName);
      leadStore.clear();
      campaignStore.clear();
      data.campaigns.forEach((c: Campaign) => campaignStore.put({ ...c, updatedAt: c.updatedAt || Date.now() }));
      data.leads.forEach((l: Business) => leadStore.put({ ...l, campaignId: l.campaignId || DEFAULT_CAMPAIGN_ID }));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Erro ao importar"));
    });
    if (data.searchConfig) {
      const c = data.searchConfig;
      await this.saveSearchConfig({
        query: c.query,
        targetGoal: c.targetGoal,
        campaignId: c.campaignId,
        niche: c.niche,
        location_name: c.location_name,
        minRating: c.minRating,
        onlyWithPhone: c.onlyWithPhone,
        excludeKeywords: c.excludeKeywords
      });
    }
    await this.ensureDefaultCampaign();
  }
}