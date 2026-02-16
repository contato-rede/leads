import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, AlertCircle, Info, Loader2, Database, ChevronDown, ChevronUp, Trash2, Coins, PlayCircle, StopCircle, Activity, Clock, Zap, Coffee, Timer, FolderOpen, Plus, Pencil, FileDown, FileUp, Filter, Star, Phone, Globe, Briefcase, X } from 'lucide-react';
import { LeadExtractorService } from './services/googlePlacesService';
import { StorageService } from './services/storageService';
import { SearchState, Business, Campaign } from './types';
import { ResultsTable } from './components/ResultsTable';
import { ExportButton } from './components/ExportButton';
import { ApiKeyTutorialModal } from './components/ApiKeyTutorialModal';
import { getHubsForLocation, CityHub, ALL_STATES } from './services/geographyService';
import { CitySelector } from './components/CitySelector';

const storageService = new StorageService();
const DEFAULT_CAMPAIGN_ID = 'default';

const NewCampaignModal: React.FC<{
  onConfirm: (name: string, niche: string, locations: string[]) => void;
  onClose: () => void;
  defaultNiche: string;
  defaultLocations: string[];
}> = ({ onConfirm, onClose, defaultNiche, defaultLocations }) => {
  const [name, setName] = useState('');
  const [niche, setNiche] = useState(defaultNiche);
  const [locations, setLocations] = useState<string[]>(defaultLocations);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto pt-10 sm:pt-20" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4 my-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800">Nova campanha</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome da campanha</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm" placeholder="Ex: Prospecção Sul" autoFocus />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">O que buscar?</label>
              <input value={niche} onChange={e => setNiche(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm" placeholder="Ex: Retíficas" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Onde buscar?</label>
            <CitySelector selected={locations} onSelect={setLocations} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 mt-2">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={() => onConfirm(name.trim() || 'Nova campanha', niche, locations)} className="h-11 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Criar Campanha</button>
        </div>
      </div>
    </div>
  );
};

const EditCampaignModal: React.FC<{ campaign: Campaign; onSave: (c: Campaign) => void; onClose: () => void }> = ({ campaign, onSave, onClose }) => {
  const [name, setName] = useState(campaign.name);
  const [niche, setNiche] = useState(campaign.niche || '');
  const [locations, setLocations] = useState<string[]>(campaign.locations || (campaign.location_name ? [campaign.location_name] : []));
  const [targetGoal, setTargetGoal] = useState(campaign.targetGoal);
  const [minRating, setMinRating] = useState(campaign.minRating || 0);
  const [onlyWithPhone, setOnlyWithPhone] = useState(campaign.onlyWithPhone || false);
  const [excludeKeywords, setExcludeKeywords] = useState(campaign.excludeKeywords || '');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto pt-10 sm:pt-20" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 my-8 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800">Editar campanha</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">O que buscar?</label>
              <input value={niche} onChange={e => setNiche(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Onde buscar?</label>
            <CitySelector selected={locations} onSelect={setLocations} />
          </div>

          <div className="pt-3 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Filtros da Campanha</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-slate-600">Avaliação Mínima:</span>
                <select value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="h-9 px-2 rounded-lg border border-slate-200 text-xs">
                  <option value={0}>Qualquer</option>
                  <option value={3.5}>3.5+</option>
                  <option value={4}>4.0+</option>
                  <option value={4.5}>4.5+</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={onlyWithPhone} onChange={e => setOnlyWithPhone(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                <span className="text-xs font-medium text-slate-600">Somente com Telefone</span>
              </label>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Excluir Termos</label>
                <input value={excludeKeywords} onChange={e => setExcludeKeywords(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs" placeholder="Ex: Peças, Usados" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Meta</label>
            <select value={targetGoal} onChange={e => setTargetGoal(Number(e.target.value))} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white font-bold">
              <option value={20}>20</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={() => onSave({
            ...campaign,
            name: name.trim() || campaign.name,
            niche,
            locations,
            location_name: locations.join(', '),
            minRating,
            onlyWithPhone,
            excludeKeywords,
            targetGoal,
            updatedAt: Date.now()
          })} className="h-11 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [targetGoal, setTargetGoal] = useState<number>(100);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string>(DEFAULT_CAMPAIGN_ID);
  const [editCampaignModal, setEditCampaignModal] = useState<Campaign | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
  const [dailyBudget, setDailyBudget] = useState<number>(10.00);
  const [niche, setNiche] = useState<string>('');
  const [locations, setLocations] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyWithPhone, setOnlyWithPhone] = useState<boolean>(false);
  const [excludeKeywords, setExcludeKeywords] = useState<string>('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    isLooping: false,
    currentLoopCount: 0,
    error: null,
    results: [],
    totalCost: 0
  });

  const [configRestored, setConfigRestored] = useState(false);
  const abortControllerRef = useRef<boolean>(false);
  const resultsRef = useRef<Business[]>(searchState.results);
  resultsRef.current = searchState.results;

  useEffect(() => {
    if (process.env.API_KEY) {
      setApiKey(process.env.API_KEY);
    } else {
      const savedKey = localStorage.getItem('google_places_api_key');
      if (savedKey) {
        setApiKey(savedKey);
      } else {
        setShowApiKeyConfig(true);
      }
    }

    const savedBudget = localStorage.getItem('google_places_daily_budget');
    if (savedBudget) {
      setDailyBudget(Number(savedBudget));
    }
  }, []);

  useEffect(() => {
    if (apiKey && !process.env.API_KEY) {
      localStorage.setItem('google_places_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('google_places_daily_budget', dailyBudget.toString());
  }, [dailyBudget]);

  useEffect(() => {
    if (!isDeepSearch) {
      setTargetGoal(20);
    }
  }, [isDeepSearch]);

  useEffect(() => {
    const load = async () => {
      try {
        await storageService.ensureDefaultCampaign();
        const [allCampaigns, config] = await Promise.all([
          storageService.getCampaigns(),
          storageService.getSearchConfig(),
        ]);
        setCampaigns(allCampaigns.length > 0 ? allCampaigns : [{ id: DEFAULT_CAMPAIGN_ID, name: 'Campanha padrão', query: '', targetGoal: 100, updatedAt: Date.now() }]);
        const lastCampaignId = (config as any)?.campaignId || DEFAULT_CAMPAIGN_ID;
        setCurrentCampaignId(lastCampaignId);
        const campaign = allCampaigns.find(c => c.id === lastCampaignId);
        if (campaign) {
          setQuery(campaign.query);
          setNiche(campaign.niche || '');
          setLocations(campaign.locations || (campaign.location_name ? [campaign.location_name] : ['Santa Catarina']));
          setMinRating(campaign.minRating || 0);
          setOnlyWithPhone(campaign.onlyWithPhone || false);
          setExcludeKeywords(campaign.excludeKeywords || '');
          setTargetGoal(campaign.targetGoal);
          setConfigRestored(true);
        }
        const leads = await storageService.getAllLeads(lastCampaignId);
        setSearchState(prev => ({ ...prev, results: leads }));
      } catch (e) { }
    };
    load();
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("Location access denied"),
      { timeout: 5000 }
    );
  }, []);

  const handleSelectCampaign = useCallback(async (campaignId: string) => {
    setCurrentCampaignId(campaignId);
    if (campaignId === '__all__') {
      const leads = await storageService.getAllLeads();
      setSearchState(prev => ({ ...prev, results: leads }));
      return;
    }
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setQuery(campaign.query);
      setNiche(campaign.niche || '');
      setLocations(campaign.locations || (campaign.location_name ? [campaign.location_name] : []));
      setMinRating(campaign.minRating || 0);
      setOnlyWithPhone(campaign.onlyWithPhone || false);
      setExcludeKeywords(campaign.excludeKeywords || '');
      setTargetGoal(campaign.targetGoal);
    }
    const leads = await storageService.getAllLeads(campaignId);
    setSearchState(prev => ({ ...prev, results: leads }));
  }, [campaigns]);

  const handleNewCampaign = useCallback(() => {
    setShowNewCampaignModal(true);
  }, []);

  const handleConfirmNewCampaign = useCallback(async (name: string, newNiche: string, newLocs: string[]) => {
    setShowNewCampaignModal(false);
    const id = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const locNames = newLocs.join(', ');
    const newCampaign: Campaign = {
      id,
      name: name.trim() || 'Nova campanha',
      query: `${newNiche} em ${locNames}`,
      niche: newNiche,
      locations: newLocs,
      location_name: locNames,
      targetGoal: 100,
      updatedAt: Date.now(),
    };
    await storageService.saveCampaign(newCampaign);
    setCampaigns(prev => [newCampaign, ...prev]);
    setCurrentCampaignId(id);
    setQuery(newCampaign.query);
    setNiche(newNiche);
    setLocations(newLocs);
    setTargetGoal(newCampaign.targetGoal);
    setSearchState(prev => ({ ...prev, results: [] }));
  }, [query]);

  const handleSaveEditCampaign = useCallback(async (updated: Campaign) => {
    await storageService.saveCampaign(updated);
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditCampaignModal(null);
    if (currentCampaignId === updated.id) {
      setQuery(updated.query);
      setNiche(updated.niche || '');
      setLocations(updated.locations || (updated.location_name ? [updated.location_name] : []));
      setMinRating(updated.minRating || 0);
      setOnlyWithPhone(updated.onlyWithPhone || false);
      setExcludeKeywords(updated.excludeKeywords || '');
      setTargetGoal(updated.targetGoal);
    }
  }, [currentCampaignId]);

  const handleDeleteCampaign = useCallback(async () => {
    if (currentCampaignId === '__all__' || currentCampaignId === DEFAULT_CAMPAIGN_ID) return;
    if (!window.confirm('Excluir esta campanha? Os leads dela continuarão visíveis em "Todos os leads".')) return;
    try {
      await storageService.deleteCampaign(currentCampaignId);
      setCampaigns(prev => prev.filter(c => c.id !== currentCampaignId));
      setCurrentCampaignId('__all__');
      const leads = await storageService.getAllLeads();
      setSearchState(prev => ({ ...prev, results: leads }));
    } catch (e) {
      setSearchState(prev => ({ ...prev, error: 'Erro ao excluir campanha.' }));
    }
  }, [currentCampaignId]);

  const handleExportBackup = useCallback(async () => {
    try {
      const json = await storageService.exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_rede_uniao_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setSearchState(prev => ({ ...prev, error: 'Erro ao exportar backup.' }));
    }
  }, []);

  const handleImportBackup = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      await storageService.importFromJson(text);
      const allCampaigns = await storageService.getCampaigns();
      setCampaigns(allCampaigns.length > 0 ? allCampaigns : [{ id: DEFAULT_CAMPAIGN_ID, name: 'Campanha padrão', query: '', targetGoal: 100, updatedAt: Date.now() }]);
      setCurrentCampaignId(allCampaigns.length > 0 ? allCampaigns[0].id : DEFAULT_CAMPAIGN_ID);
      const firstId = allCampaigns.length > 0 ? allCampaigns[0].id : DEFAULT_CAMPAIGN_ID;
      const leads = await storageService.getAllLeads(firstId);
      setSearchState(prev => ({ ...prev, results: leads, error: null }));
      if (allCampaigns.length > 0) {
        const c = allCampaigns[0];
        setQuery(c.query);
        setTargetGoal(c.targetGoal);
      }
    } catch (err: any) {
      setSearchState(prev => ({ ...prev, error: err?.message || 'Erro ao importar backup.' }));
    }
  }, []);

  const handleClearData = async () => {
    if (window.confirm("Apagar tudo?")) {
      try {
        await storageService.clearAll();
        setSearchState(prev => ({ ...prev, results: [], totalCost: 0 }));
      } catch (e) { }
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await storageService.deleteLead(id);
      setSearchState(prev => ({ ...prev, results: prev.results.filter(r => r.id !== id) }));
    } catch (e) { }
  };

  const executeSearch = useCallback(async (isAutoLoop: boolean = false, stopWhenNoNewLeads: boolean = false) => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setSearchState(prev => ({ ...prev, error: "⚠️ INSIRA SUA CHAVE API.", isLoading: false, isLooping: false }));
      return;
    }

    abortControllerRef.current = false;
    setSearchState(prev => ({ ...prev, isLoading: true, isLooping: true, error: null }));

    if (isAutoLoop || stopWhenNoNewLeads) {
      try {
        const configPayload = {
          campaignId: currentCampaignId,
          query,
          niche,
          locations,
          location_name: locations.join(', '),
          minRating,
          onlyWithPhone,
          excludeKeywords,
          targetGoal
        };
        await storageService.saveSearchConfig(configPayload);
        const campaign = campaigns.find(c => c.id === currentCampaignId);
        if (campaign) {
          await storageService.saveCampaign({ ...campaign, ...configPayload });
        }
      } catch (e) { }
    }

    let localResults = [...resultsRef.current];
    const knownNamesSet = new Set(localResults.map(b => b.name));
    let leadsFoundInSession = 0;
    const currentGoal = isDeepSearch ? targetGoal : 20;
    const goal = (isAutoLoop || stopWhenNoNewLeads) ? currentGoal : 10;
    let quotaHitCount = 0;

    const BASE_COOLDOWN_MS = 3000;
    const service = new LeadExtractorService(trimmedKey);

    try {
      let locationIndex = 0;

      while (locationIndex < locations.length && leadsFoundInSession < goal && !abortControllerRef.current) {
        const currentLoc = locations[locationIndex];
        let gridPoints: { lat: number; lng: number, hubName?: string }[] = [];
        let currentPointIndex = 0;
        let searchRadius = 2500;

        if (isDeepSearch) {
          setSearchState(prev => ({ ...prev, isLoading: true, error: `📍 Localizando: ${currentLoc}...` }));

          // 1. Check for State Hubs first
          const stateHubs = getHubsForLocation(currentLoc);

          if (stateHubs) {
            console.log(`[Search] State detected: ${currentLoc}. Using ${stateHubs.length} strategic hubs.`);
            gridPoints = stateHubs.map(h => ({ lat: h.lat, lng: h.lng, hubName: h.name }));
            searchRadius = 10000;
          } else {
            // 2. Fallback to Geocoding and Grid
            const geocodeResult = await service.geocode(currentLoc);

            if (geocodeResult && geocodeResult.center) {
              const { center, viewport } = geocodeResult;
              let rangeKm = 10;
              searchRadius = 3500;

              if (viewport) {
                const dLat = Math.abs(viewport.ne.lat - viewport.sw.lat);
                const dLng = Math.abs(viewport.ne.lng - viewport.sw.lng);
                const sizeKm = Math.max(dLat, dLng) * 111;
                if (sizeKm > 50) {
                  rangeKm = 60;
                  searchRadius = 15000;
                }
              }

              const points = service.generateGrid(center, rangeKm, rangeKm / 2);
              gridPoints = points.map(p => ({ ...p }));
            }
          }
        }

        const searchNiche = niche || service.extractCategory(query);

        // Sub-loop for the current location
        let pageInHub = 1;
        while (leadsFoundInSession < goal && !abortControllerRef.current) {
          try {
            if (searchState.totalCost >= dailyBudget) {
              setSearchState(prev => ({
                ...prev,
                isLoading: false,
                isLooping: false,
                error: `🛑 Trava de segurança atingida ($${prev.totalCost.toFixed(2)}).`
              }));
              return;
            }

            const contextNames = Array.from(knownNamesSet).slice(-25);
            let result;

            if (isDeepSearch && gridPoints.length > 0) {
              const point = gridPoints[currentPointIndex];
              const locationInfo = point.hubName ? `${point.hubName}` : `Ponto ${currentPointIndex + 1}/${gridPoints.length}`;
              const statusMsg = `📍 [${currentLoc}] ${locationInfo} (Página ${pageInHub}) · Buscando...`;

              setSearchState(prev => ({ ...prev, error: statusMsg }));

              const specificQuery = point.hubName
                ? `${searchNiche} em ${point.hubName}, ${currentLoc}`
                : `${searchNiche} em ${currentLoc}`;

              result = await service.search(specificQuery, point, contextNames, searchRadius);
              pageInHub++;

              if (service.isFinished()) {
                currentPointIndex++;
                pageInHub = 1;
                service.resetPagination();
                if (currentPointIndex >= gridPoints.length) break;
              }
            } else {
              const fullQuery = `${searchNiche} em ${currentLoc}`;
              const statusMsg = `📍 [${currentLoc}] (Página ${pageInHub}) · Buscando...`;
              setSearchState(prev => ({ ...prev, error: statusMsg }));

              result = await service.search(fullQuery, location || undefined, contextNames);
              pageInHub++;
              if (service.isFinished()) break;
            }

            let batchCost = result.estimatedCost;
            const filteredBusinesses = result.businesses.filter(b => {
              if (minRating > 0) {
                const rating = typeof b.rating === 'string' ? parseFloat(b.rating) : b.rating;
                if (isNaN(rating) || rating < minRating) return false;
              }
              if (onlyWithPhone && (!b.phone || b.phone.trim() === '')) return false;
              if (excludeKeywords.trim() !== '') {
                const keywords = excludeKeywords.split(',').map(k => k.trim().toLowerCase());
                const nameLower = b.name.toLowerCase();
                if (keywords.some(k => k && nameLower.includes(k))) return false;
              }
              return true;
            });

            const uniqueNew = filteredBusinesses.filter(b => !knownNamesSet.has(b.name));
            if (uniqueNew.length > 0) {
              uniqueNew.forEach(b => { b.campaignId = currentCampaignId; });
              await storageService.saveLeadsBulk(uniqueNew);
              uniqueNew.forEach(b => {
                knownNamesSet.add(b.name);
                localResults.unshift(b);
              });
              leadsFoundInSession += uniqueNew.length;
              resultsRef.current = [...localResults];
            }

            setSearchState(prev => {
              const newFoundInBatch = uniqueNew.length;
              let discoveryMsg = "";

              if (newFoundInBatch > 0) {
                discoveryMsg = ` (+${newFoundInBatch} novos)`;
              } else if (result.businesses.length > 0) {
                discoveryMsg = ` (Lote com ${result.businesses.length} duplicados)`;
              } else {
                discoveryMsg = ` (Página sem resultados no Google)`;
              }

              // Re-construct the full status message with the discovery info
              const baseMsg = prev.error ? prev.error.split(' · ')[0] : '📍 Buscando...';
              const finalMsg = `${baseMsg} · ${discoveryMsg}`;

              return {
                ...prev,
                results: [...localResults],
                totalCost: prev.totalCost + batchCost,
                currentLoopCount: leadsFoundInSession,
                error: finalMsg
              };
            });

            if (!isAutoLoop && !stopWhenNoNewLeads) break;
            if (leadsFoundInSession < goal && !abortControllerRef.current) {
              await new Promise(r => setTimeout(r, BASE_COOLDOWN_MS));
            }
          } catch (batchError: any) {
            const isFatal = batchError?.isFatal === true;
            setSearchState(prev => ({
              ...prev,
              error: isFatal ? `🚫 Erro: ${batchError.message}` : `⚠️ Lote falhou: ${batchError.message.slice(0, 50)}`,
              isLooping: !isFatal
            }));
            if (isFatal) { abortControllerRef.current = true; break; }
            await new Promise(r => setTimeout(r, 10000));
          }
        }
        locationIndex++;
      }

      // Final Status Check
      if (leadsFoundInSession >= goal) {
        setSearchState(prev => ({ ...prev, error: `✅ Meta atingida! ${leadsFoundInSession} novos leads.` }));
      } else if (locationIndex >= locations.length) {
        setSearchState(prev => ({ ...prev, error: `🏁 Todas as cidades processadas. ${leadsFoundInSession} leads no total.` }));
      } else if (!abortControllerRef.current) {
        setSearchState(prev => ({ ...prev, error: `✨ Busca concluída. ${leadsFoundInSession} leads processados.` }));
      }

    } catch (fatalError: any) {
      setSearchState(prev => ({ ...prev, error: `Erro: ${fatalError?.message || fatalError}`, isLooping: false, isLoading: false }));
    } finally {
      setSearchState(prev => ({ ...prev, isLoading: false, isLooping: false }));
    }
  }, [apiKey, query, niche, locations, location, targetGoal, currentCampaignId, campaigns, isDeepSearch, minRating, onlyWithPhone, excludeKeywords, dailyBudget]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center justify-between gap-2 min-h-[44px]">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 fill-blue-600 flex-shrink-0" />
              <h1 className="text-base sm:text-xl font-bold">Rede Uniao <span className="text-blue-600">Maps 2.5</span></h1>
            </div>
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={() => setShowApiKeyConfig(!showApiKeyConfig)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${apiKey.trim() ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}
              >
                {apiKey.trim() ? 'Chave ✓' : 'Sem chave'}
              </button>
              <span className="text-xs font-bold text-slate-700">${searchState.totalCost.toFixed(3)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowApiKeyConfig(!showApiKeyConfig)}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${apiKey.trim() ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'}`}
            >
              <Zap className={`w-3.5 h-3.5 ${apiKey.trim() ? 'text-blue-600' : 'text-amber-600'}`} />
              {apiKey.trim() ? 'Gerenciar Chave' : 'Configurar Chave'}
            </button>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-tighter">Investimento IA</span>
              <span className="text-sm font-bold text-slate-700">${searchState.totalCost.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            <label className="text-xs font-bold text-slate-500 uppercase sm:mb-0">Campanha</label>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 flex-1 sm:flex-initial min-w-0 w-full sm:w-auto">
              <select
                value={currentCampaignId}
                onChange={(e) => handleSelectCampaign(e.target.value)}
                className="h-11 sm:h-10 w-full min-w-0 sm:min-w-[180px] flex-1 px-3 rounded-lg border border-slate-200 text-sm bg-white font-medium min-h-[44px]"
              >
                <option value="__all__">Todos os leads</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.query || c.id}</option>
                ))}
              </select>
              <div className="flex gap-2 flex-shrink-0">
                {currentCampaignId !== '__all__' && (
                  <>
                    <button type="button" onClick={() => setEditCampaignModal(campaigns.find(c => c.id === currentCampaignId) ?? null)} className="h-11 w-11 min-h-[44px] rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 shrink-0" title="Editar campanha">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {currentCampaignId !== DEFAULT_CAMPAIGN_ID && (
                      <button type="button" onClick={handleDeleteCampaign} className="h-11 w-11 min-h-[44px] rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 shrink-0" title="Excluir campanha">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                <button type="button" onClick={handleNewCampaign} className="h-11 px-4 rounded-lg border border-slate-200 text-sm font-medium flex items-center gap-1.5 hover:bg-slate-50 min-h-[44px] shrink-0">
                  <Plus className="w-4 h-4" /> <span className="sm:inline">Nova campanha</span>
                </button>
              </div>
            </div>
          </div>
          {showNewCampaignModal && (
            <NewCampaignModal
              onConfirm={handleConfirmNewCampaign}
              onClose={() => setShowNewCampaignModal(false)}
              defaultNiche={niche}
              defaultLocations={locations}
            />
          )}
          {editCampaignModal && (
            <EditCampaignModal
              campaign={editCampaignModal}
              onSave={handleSaveEditCampaign}
              onClose={() => setEditCampaignModal(null)}
            />
          )}
          {showTutorialModal && (
            <ApiKeyTutorialModal onClose={() => setShowTutorialModal(false)} />
          )}

          {showApiKeyConfig && (
            <div className={`mb-4 ${apiKey.trim() ? '' : 'ring-2 ring-amber-200 ring-offset-2 rounded-xl p-1'}`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase block">
                  Chave API Google Places <span className="text-amber-600 font-normal normal-case">(obrigatório)</span>
                </label>
                {apiKey.trim() && (
                  <button onClick={() => setShowApiKeyConfig(false)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
                    Ocultar configurações ×
                  </button>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5 mb-2 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-700">Precisa de ajuda com a chave?</p>
                <p>A chave é necessária para acessar o Google Places. Preparamos um guia passo a passo.</p>
                <button onClick={() => setShowTutorialModal(true)} className="w-full py-2 mt-2 bg-white border border-slate-200 rounded-lg text-blue-600 font-bold hover:bg-blue-50 transition-colors">
                  Ver tutorial de como criar a chave
                </button>
              </div>

              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full h-11 min-h-[44px] px-4 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
                placeholder="Cole sua chave aqui"
                title="Cole só a chave (letras e números)"
                autoComplete="off"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Não tem chave? Use o botão <strong>Abrir Google AI Studio e criar chave</strong> acima, crie uma e depois volte e cole aqui.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Dica: no celular, segure no texto da chave para copiar; aqui, segure no campo para colar.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Cole só a chave (letras e números). Não cole o link da página nem seu e-mail.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Trava de Segurança (Saldo USD)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-32">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0.10"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(Number(e.target.value))}
                      className="w-full h-11 px-8 bg-slate-100 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold text-slate-700"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight flex-1">
                    O robô para de minerar se o <strong>Investimento IA</strong> atingir este valor. Isso protege você de gastos inesperados.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              {/* Ramo de Atividade */}
              <div className="flex-[1.5] min-w-0">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">O que buscar? (Ramo)</label>
                  <label className="flex lg:hidden items-center gap-2 cursor-pointer group px-2 py-0.5 bg-slate-50 rounded-full border border-slate-200">
                    <span className={`text-[9px] font-extrabold uppercase tracking-tight ${isDeepSearch ? 'text-blue-600' : 'text-slate-400'}`}>
                      Mineração Total
                    </span>
                    <input type="checkbox" checked={isDeepSearch} onChange={(e) => setIsDeepSearch(e.target.checked)} className="sr-only peer" />
                    <div className="w-7 h-4 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 relative after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
                <div className="relative group">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full h-11 px-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium transition-all"
                    placeholder="Ex: Retífica de Motores"
                  />
                </div>
              </div>

              {/* Localização */}
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 px-0.5 uppercase tracking-wider block">Onde buscar? (Cidades ou Estados)</label>
                <div className="relative group">
                  <CitySelector selected={locations} onSelect={setLocations} />
                </div>
              </div>

              {/* Meta and Buttons Group */}
              <div className="flex items-end gap-3 sm:gap-4 flex-shrink-0">
                <div className="w-24 sm:w-28 md:w-32">
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${!isDeepSearch ? 'text-slate-300' : 'text-slate-400'}`}>Meta</label>
                    <label className="hidden lg:flex items-center gap-2 cursor-pointer group">
                      <div className="relative inline-flex items-center cursor-pointer" title="Mineração Total (Múltiplos Pontos)">
                        <input type="checkbox" checked={isDeepSearch} onChange={(e) => setIsDeepSearch(e.target.checked)} className="sr-only peer" />
                        <div className="w-6 h-3 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 relative after:content-[''] after:absolute after:top-[1px] after:start-[1px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:after:translate-x-full"></div>
                      </div>
                    </label>
                  </div>
                  <select
                    value={targetGoal}
                    onChange={(e) => setTargetGoal(Number(e.target.value))}
                    disabled={!isDeepSearch}
                    className={`w-full h-11 px-3 rounded-xl border text-sm font-bold transition-all ${!isDeepSearch ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                  >
                    <option value="20">20</option>
                    <option value="100">100</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className={`h-11 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${showAdvancedOptions ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    title="Configurações Avançadas e Filtros"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">Filtros</span>
                  </button>

                  <div className="flex-1 sm:flex-initial">
                    {searchState.isLooping ? (
                      <button onClick={() => abortControllerRef.current = true} className="w-full sm:w-auto h-11 min-h-[44px] px-6 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all touch-manipulation text-sm shadow-sm">
                        <StopCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Parar ({searchState.results.length} · {targetGoal})</span>
                      </button>
                    ) : searchState.isLoading ? (
                      <button onClick={() => abortControllerRef.current = true} className="w-full sm:w-auto h-11 min-h-[44px] px-6 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-[0.98] transition-all touch-manipulation text-sm">
                        <StopCircle className="w-4 h-4 flex-shrink-0" /> Parar
                      </button>
                    ) : (
                      <button onClick={() => executeSearch(true, false)} disabled={currentCampaignId === '__all__'} className="w-full sm:w-auto h-11 min-h-[44px] px-8 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm shadow-md shadow-blue-100">
                        <PlayCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Iniciar Robô</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Options Panel */}
            {showAdvancedOptions && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <Star className="w-3 h-3 text-amber-500" /> Avaliação Mínima
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">Qualquer nota</option>
                    <option value="3.5">3.5+ Estrelas</option>
                    <option value="4.0">4.0+ Estrelas</option>
                    <option value="4.5">4.5+ Estrelas</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <Phone className="w-3 h-3 text-emerald-500" /> Requisitos de Contato
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={onlyWithPhone}
                        onChange={(e) => setOnlyWithPhone(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Somente com Telefone</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <X className="w-3 h-3 text-red-500" /> Excluir Termos
                  </label>
                  <input
                    type="text"
                    value={excludeKeywords}
                    onChange={(e) => setExcludeKeywords(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Peças, Usados, Importados"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Nomes de empresas com estes termos serão ignorados.</p>
                </div>
              </div>
            )}
          </div>

          {configRestored && searchState.results.length > 0 && !searchState.isLoading && !searchState.isLooping && (
            <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
              <span className="min-w-0 truncate">Config. restaurada: <strong>{searchState.results.length} leads</strong> — use Iniciar Robô para meta {targetGoal}.</span>
              <button type="button" onClick={() => setConfigRestored(false)} className="text-blue-600 hover:text-blue-800 font-bold p-1.5 min-w-[32px] min-h-[32px] rounded touch-manipulation flex-shrink-0" aria-label="Fechar">✕</button>
            </div>
          )}
        </div>

        {searchState.error && (
          <div className={`p-3 sm:p-4 rounded-xl flex items-start sm:items-center gap-3 border transition-all ${searchState.error.includes("☕") ? 'bg-blue-50 border-blue-200 text-blue-800 animate-pulse' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {searchState.error.includes("☕") ? <Coffee className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />}
            <span className="text-xs sm:text-sm font-semibold min-w-0 break-words">{searchState.error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-bold">Base Minerada</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{searchState.results.length} leads</span>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button type="button" onClick={handleExportBackup} className="p-3 sm:p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all min-h-[44px] flex items-center gap-2 touch-manipulation border border-slate-200 text-sm font-medium" title="Exportar backup JSON">
                <FileDown className="w-4 h-4" /> <span className="sm:inline">Backup</span>
              </button>
              <button type="button" onClick={() => importInputRef.current?.click()} className="p-3 sm:p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all min-h-[44px] flex items-center gap-2 touch-manipulation border border-slate-200 text-sm font-medium" title="Importar backup JSON">
                <FileUp className="w-4 h-4" /> <span className="sm:inline">Importar</span>
              </button>
              <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackup} />
              {searchState.results.length > 0 && (
                <button onClick={handleClearData} className="p-3 sm:p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation" title="Limpar Banco de Dados">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <ExportButton data={searchState.results} filename="leads_rede_uniao" />
            </div>
          </div>

          {searchState.results.length > 0 ? (
            <ResultsTable results={searchState.results} onDelete={handleDeleteLead} />
          ) : (
            <div className="py-16 sm:py-24 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl text-slate-400 px-4">
              <Database className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-10" />
              <p className="font-semibold text-slate-400 text-sm sm:text-base text-center">O banco de dados está vazio.</p>
              <p className="text-xs text-slate-300 mt-1 text-center">Configure a API e inicie a mineração.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;