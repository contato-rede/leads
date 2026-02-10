import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, AlertCircle, Info, Loader2, Database, ChevronDown, Trash2, Coins, PlayCircle, StopCircle, Activity, Clock, Zap, Coffee, Timer, FolderOpen, Plus, Pencil, FileDown, FileUp } from 'lucide-react';
import { LeadExtractorService } from './services/geminiService';
import { StorageService } from './services/storageService';
import { SearchState, Business, Campaign } from './types';
import { ResultsTable } from './components/ResultsTable';
import { ExportButton } from './components/ExportButton';

const storageService = new StorageService();
const DEFAULT_CAMPAIGN_ID = 'default';

const NewCampaignModal: React.FC<{ onConfirm: (name: string) => void; onClose: () => void }> = ({ onConfirm, onClose }) => {
  const [name, setName] = useState('Nova campanha');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800">Nova campanha</h3>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome da campanha</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm" placeholder="Nova campanha" autoFocus />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={() => onConfirm(name.trim() || 'Nova campanha')} className="h-11 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">OK</button>
        </div>
      </div>
    </div>
  );
};

const EditCampaignModal: React.FC<{ campaign: Campaign; onSave: (c: Campaign) => void; onClose: () => void }> = ({ campaign, onSave, onClose }) => {
  const [name, setName] = useState(campaign.name);
  const [query, setQuery] = useState(campaign.query);
  const [targetGoal, setTargetGoal] = useState(campaign.targetGoal);
  const [concurrency, setConcurrency] = useState(campaign.concurrency);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800">Editar campanha</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm" placeholder="Nome da campanha" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">O que buscar?</label>
            <input value={query} onChange={e => setQuery(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm" placeholder="Ex: Retíficas, Santa Catarina" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Meta</label>
              <select value={targetGoal} onChange={e => setTargetGoal(Number(e.target.value))} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white">
                <option value={20}>20</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Modo</label>
              <select value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white">
                <option value={1}>1x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={() => onSave({ ...campaign, name: name.trim() || campaign.name, query, targetGoal, concurrency, updatedAt: Date.now() })} className="h-11 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Salvar</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [query, setQuery] = useState<string>('Retífica de Motores em Chapecó, SC');
  const [targetGoal, setTargetGoal] = useState<number>(100); 
  const [concurrency, setConcurrency] = useState<number>(1); 
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string>(DEFAULT_CAMPAIGN_ID);
  const [editCampaignModal, setEditCampaignModal] = useState<Campaign | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    isLooping: false,
    currentLoopCount: 0,
    error: null,
    results: [],
    totalCost: 0
  });
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [configRestored, setConfigRestored] = useState(false);
  const abortControllerRef = useRef<boolean>(false);
  const resultsRef = useRef<Business[]>(searchState.results);
  resultsRef.current = searchState.results;

  useEffect(() => {
    if (process.env.API_KEY) {
      setApiKey(process.env.API_KEY);
    } else {
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (apiKey && !process.env.API_KEY) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    const load = async () => {
      try {
        await storageService.ensureDefaultCampaign();
        const [allCampaigns, config] = await Promise.all([
          storageService.getCampaigns(),
          storageService.getSearchConfig(),
        ]);
        setCampaigns(allCampaigns.length > 0 ? allCampaigns : [{ id: DEFAULT_CAMPAIGN_ID, name: 'Campanha padrão', query: '', targetGoal: 100, concurrency: 1, updatedAt: Date.now() }]);
        const lastCampaignId = (config as any)?.campaignId || DEFAULT_CAMPAIGN_ID;
        setCurrentCampaignId(lastCampaignId);
        const campaign = allCampaigns.find(c => c.id === lastCampaignId);
        if (campaign) {
          setQuery(campaign.query);
          setTargetGoal(campaign.targetGoal);
          setConcurrency(campaign.concurrency);
          setConfigRestored(true);
        }
        const leads = await storageService.getAllLeads(lastCampaignId);
        setSearchState(prev => ({ ...prev, results: leads }));
      } catch (e) {}
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
      setTargetGoal(campaign.targetGoal);
      setConcurrency(campaign.concurrency);
    }
    const leads = await storageService.getAllLeads(campaignId);
    setSearchState(prev => ({ ...prev, results: leads }));
  }, [campaigns]);

  const handleNewCampaign = useCallback(() => {
    setShowNewCampaignModal(true);
  }, []);

  const handleConfirmNewCampaign = useCallback(async (name: string) => {
    setShowNewCampaignModal(false);
    const id = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newCampaign: Campaign = {
      id,
      name: name.trim() || 'Nova campanha',
      query: query || 'Retífica de Motores em Chapecó, SC',
      targetGoal: 100,
      concurrency: 1,
      updatedAt: Date.now(),
    };
    await storageService.saveCampaign(newCampaign);
    setCampaigns(prev => [newCampaign, ...prev]);
    setCurrentCampaignId(id);
    setQuery(newCampaign.query);
    setTargetGoal(newCampaign.targetGoal);
    setConcurrency(newCampaign.concurrency);
    setSearchState(prev => ({ ...prev, results: [] }));
  }, [query]);

  const handleSaveEditCampaign = useCallback(async (updated: Campaign) => {
    await storageService.saveCampaign(updated);
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditCampaignModal(null);
    if (currentCampaignId === updated.id) {
      setQuery(updated.query);
      setTargetGoal(updated.targetGoal);
      setConcurrency(updated.concurrency);
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
      setCampaigns(allCampaigns.length > 0 ? allCampaigns : [{ id: DEFAULT_CAMPAIGN_ID, name: 'Campanha padrão', query: '', targetGoal: 100, concurrency: 1, updatedAt: Date.now() }]);
      setCurrentCampaignId(allCampaigns.length > 0 ? allCampaigns[0].id : DEFAULT_CAMPAIGN_ID);
      const firstId = allCampaigns.length > 0 ? allCampaigns[0].id : DEFAULT_CAMPAIGN_ID;
      const leads = await storageService.getAllLeads(firstId);
      setSearchState(prev => ({ ...prev, results: leads, error: null }));
      if (allCampaigns.length > 0) {
        const c = allCampaigns[0];
        setQuery(c.query);
        setTargetGoal(c.targetGoal);
        setConcurrency(c.concurrency);
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
      } catch (e) {}
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
        await storageService.deleteLead(id);
        setSearchState(prev => ({ ...prev, results: prev.results.filter(r => r.id !== id) }));
    } catch (e) {}
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
        await storageService.saveSearchConfig({ campaignId: currentCampaignId, query, targetGoal, concurrency });
        const campaign = campaigns.find(c => c.id === currentCampaignId);
        if (campaign) {
          await storageService.saveCampaign({ ...campaign, query, targetGoal, concurrency });
        }
      } catch (e) {}
    }

    let localResults = [...resultsRef.current];
    const knownNamesSet = new Set(localResults.map(b => b.name));
    let leadsFoundInSession = 0;
    const goal = (isAutoLoop || stopWhenNoNewLeads) ? targetGoal : 10;
    let quotaHitCount = 0;

    // Cooldown entre lotes: mais conservador para evitar 429 (1x = 35s, 2x = 28s)
    const BASE_COOLDOWN_MS = concurrency === 1 ? 35000 : 28000;
    const DELAY_BETWEEN_SAME_BATCH_MS = 3000;

    try {
      while (leadsFoundInSession < goal && !abortControllerRef.current) {
        try {
          const service = new LeadExtractorService(trimmedKey);
          const contextNames = Array.from(knownNamesSet).slice(-25);
          const batchPromises = [];
          const currentBatchSize = (isAutoLoop || stopWhenNoNewLeads) ? concurrency : 1;

          for (let i = 0; i < currentBatchSize; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, DELAY_BETWEEN_SAME_BATCH_MS));
            batchPromises.push(service.search(query, location, contextNames));
          }

          const results = await Promise.allSettled(batchPromises);
          let batchTotalNew = 0;
          let batchCost = 0;
          let hitQuotaLimit = false;

          for (const res of results) {
            if (res.status === 'fulfilled') {
              const result = res.value;
              batchCost += result.estimatedCost;
              const uniqueNew = result.businesses.filter(b => !knownNamesSet.has(b.name));
              if (uniqueNew.length > 0) {
                uniqueNew.forEach(b => { b.campaignId = currentCampaignId; });
                await storageService.saveLeadsBulk(uniqueNew);
                uniqueNew.forEach(b => {
                  knownNamesSet.add(b.name);
                  localResults.unshift(b);
                });
                batchTotalNew += uniqueNew.length;
              }
            } else {
              const err = res.reason;
              if (err?.status === 429) hitQuotaLimit = true;
            }
          }

          if (!hitQuotaLimit) quotaHitCount = 0;
          if (hitQuotaLimit) quotaHitCount += 1;

          leadsFoundInSession += batchTotalNew;
          resultsRef.current = [...localResults];

          const pauseSeconds = Math.min(90 + quotaHitCount * 30, 180);
          setSearchState(prev => ({
            ...prev,
            results: [...localResults],
            totalCost: prev.totalCost + batchCost,
            currentLoopCount: leadsFoundInSession,
            error: hitQuotaLimit ? `☕ LIMITE: Pausando ${pauseSeconds}s (evitar novo 429)...` : null
          }));

          if (hitQuotaLimit) {
            for (let i = pauseSeconds; i > 0; i--) {
              if (abortControllerRef.current) break;
              setSearchState(prev => ({ ...prev, error: `☕ GOOGLE LIMITOU: Retomando em ${i}s...` }));
              await new Promise(r => setTimeout(r, 1000));
            }
            setSearchState(prev => ({ ...prev, error: null }));
          } else if ((isAutoLoop || stopWhenNoNewLeads) && !abortControllerRef.current && leadsFoundInSession < goal) {
            await new Promise(r => setTimeout(r, BASE_COOLDOWN_MS));
          }

          if (stopWhenNoNewLeads && batchTotalNew === 0) break;
          if (!isAutoLoop && !stopWhenNoNewLeads) break;
        } catch (batchError: any) {
          const msg = batchError?.message || String(batchError);
          const is429 = batchError?.status === 429;
          setSearchState(prev => ({
            ...prev,
            results: [...localResults],
            currentLoopCount: leadsFoundInSession,
            error: `⚠️ Lote falhou (continuando em 20s): ${msg.slice(0, 50)}`
          }));
          resultsRef.current = [...localResults];
          if (!abortControllerRef.current && (isAutoLoop || stopWhenNoNewLeads) && leadsFoundInSession < goal) {
            await new Promise(r => setTimeout(r, is429 ? 20000 : 15000));
            setSearchState(prev => ({ ...prev, error: null }));
          }
        }
      }
    } catch (fatalError: any) {
      setSearchState(prev => ({ ...prev, error: `Erro: ${fatalError?.message || fatalError}`, isLooping: false, isLoading: false }));
    } finally {
      setSearchState(prev => ({ ...prev, isLoading: false, isLooping: false }));
    }
  }, [apiKey, query, location, targetGoal, concurrency, currentCampaignId, campaigns]);

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
              <span className={`text-xs font-bold ${apiKey.trim() ? 'text-green-600' : 'text-amber-600'}`}>
                {apiKey.trim() ? 'Chave ✓' : 'Sem chave'}
              </span>
              <span className="text-xs font-bold text-slate-700">${searchState.totalCost.toFixed(3)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
             <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-tighter">Chave API</span>
                <span className={`text-sm font-bold ${apiKey.trim() ? 'text-green-600' : 'text-amber-600'}`}>
                  {apiKey.trim() ? 'Configurada ✓' : 'Não inserida'}
                </span>
             </div>
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-100 px-3 py-2.5 sm:py-1.5 rounded-lg text-blue-600 font-bold hover:bg-blue-50 transition-colors min-h-[44px] inline-flex items-center justify-center flex-1 sm:flex-initial" title="Abrir Google AI Studio e criar chave">
                <span className="hidden sm:inline">Abrir Google AI Studio e criar chave</span>
                <span className="sm:hidden">Criar chave (Google AI Studio)</span>
             </a>
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
              />
            )}
            {editCampaignModal && (
              <EditCampaignModal
                campaign={editCampaignModal}
                onSave={handleSaveEditCampaign}
                onClose={() => setEditCampaignModal(null)}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={apiKey.trim() ? '' : 'ring-2 ring-amber-200 ring-offset-2 rounded-xl p-1 -m-1'}>
                    <label className="text-xs font-bold text-slate-500 uppercase block">
                      Chave API Gemini <span className="text-amber-600 font-normal normal-case">(obrigatório)</span>
                    </label>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5 mb-2 text-xs text-slate-600 space-y-1.5">
                      <p className="font-semibold text-slate-700">Como obter sua chave:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Toque em <strong>&quot;Criar chave (Google AI Studio)&quot;</strong> no topo da tela.</li>
                        <li>Faça login com sua conta Google, se pedir.</li>
                        <li>Toque em <strong>Create API key</strong> e escolha um projeto.</li>
                        <li>Copie a chave e volte aqui para colar no campo abaixo.</li>
                      </ol>
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
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">O que buscar?</label>
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-11 min-h-[44px] px-4 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base" placeholder="Ex: Vidraçarias em Goiânia" />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-3 border-t">
                <div className="flex gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Meta</label>
                        <select value={targetGoal} onChange={(e) => setTargetGoal(Number(e.target.value))} className="w-full h-10 min-h-[44px] px-3 rounded-lg border border-slate-200 text-sm bg-white font-medium">
                            <option value="20">20</option>
                            <option value="100">100</option>
                            <option value="500">500</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-0 max-w-[140px]">
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Modo</label>
                        <select value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} className="w-full h-10 min-h-[44px] px-3 rounded-lg border border-slate-200 text-sm bg-white font-medium">
                            <option value="1">1x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto">
                    {searchState.isLooping ? (
                        <button onClick={() => abortControllerRef.current = true} className="flex-1 sm:flex-initial min-w-0 h-10 min-h-[44px] px-4 bg-slate-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:bg-slate-700 transition-all touch-manipulation text-sm">
                           <StopCircle className="w-4 h-4 flex-shrink-0" /> Parar ({searchState.results.length} · meta {targetGoal})
                        </button>
                    ) : searchState.isLoading ? (
                        <button onClick={() => abortControllerRef.current = true} className="flex-1 min-w-0 h-10 min-h-[44px] px-4 bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all touch-manipulation text-sm">
                           <StopCircle className="w-4 h-4 flex-shrink-0" /> Parar busca
                        </button>
                    ) : (
                        <>
                            <button onClick={() => executeSearch(true, true)} disabled={currentCampaignId === '__all__'} className="h-10 min-h-[44px] px-4 rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 touch-manipulation text-sm" title="Busca até a meta (20/100/500) ou até não encontrar mais leads. Para sozinho.">
                                <Search className="w-4 h-4 flex-shrink-0" /> 1 leva
                            </button>
                            <button onClick={() => executeSearch(true, false)} disabled={currentCampaignId === '__all__'} className="flex-1 min-w-0 h-10 min-h-[44px] px-4 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 transition-all disabled:opacity-50 touch-manipulation text-sm" title={currentCampaignId === '__all__' ? 'Selecione uma campanha para rodar o robô' : 'Loop contínuo até a meta (use Parar para interromper)'}>
                               <PlayCircle className="w-4 h-4 flex-shrink-0" /> Iniciar Robô
                            </button>
                        </>
                    )}
                </div>
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