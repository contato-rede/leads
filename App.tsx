import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, AlertCircle, Info, Loader2, Database, ChevronDown, Trash2, Coins, PlayCircle, StopCircle, Activity, Clock, Zap, Coffee, Timer, FolderOpen, Plus } from 'lucide-react';
import { LeadExtractorService } from './services/geminiService';
import { StorageService } from './services/storageService';
import { SearchState, Business, Campaign } from './types';
import { ResultsTable } from './components/ResultsTable';
import { ExportButton } from './components/ExportButton';

const storageService = new StorageService();
const DEFAULT_CAMPAIGN_ID = 'default';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [query, setQuery] = useState<string>('Retífica de Motores em Chapecó, SC');
  const [targetGoal, setTargetGoal] = useState<number>(100); 
  const [concurrency, setConcurrency] = useState<number>(1); 
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string>(DEFAULT_CAMPAIGN_ID);
  
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

  const handleNewCampaign = useCallback(async () => {
    const id = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newCampaign: Campaign = {
      id,
      name: 'Nova campanha',
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

  const executeSearch = useCallback(async (isAutoLoop: boolean = false) => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setSearchState(prev => ({ ...prev, error: "⚠️ INSIRA SUA CHAVE API.", isLoading: false, isLooping: false }));
      return;
    }

    abortControllerRef.current = false;
    setSearchState(prev => ({ ...prev, isLoading: true, isLooping: isAutoLoop, error: null }));

    if (isAutoLoop) {
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
    const goal = isAutoLoop ? targetGoal : 10;

    // Atraso de segurança aumentado para 20s para respeitar a cota do plano Free
    const BASE_COOLDOWN = 20000; 

    try {
      while (leadsFoundInSession < goal && !abortControllerRef.current) {
        try {
          const service = new LeadExtractorService(trimmedKey);
          const contextNames = Array.from(knownNamesSet).slice(-25);
          const batchPromises = [];
          const currentBatchSize = isAutoLoop ? concurrency : 1;

          for (let i = 0; i < currentBatchSize; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 2000));
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

          leadsFoundInSession += batchTotalNew;
          resultsRef.current = [...localResults];

          setSearchState(prev => ({
            ...prev,
            results: [...localResults],
            totalCost: prev.totalCost + batchCost,
            currentLoopCount: leadsFoundInSession,
            error: hitQuotaLimit ? "☕ LIMITE EXCEDIDO: Pausando 65s para segurança..." : null
          }));

          if (hitQuotaLimit) {
            for (let i = 65; i > 0; i--) {
              if (abortControllerRef.current) break;
              setSearchState(prev => ({ ...prev, error: `☕ GOOGLE LIMITOU: Retomando em ${i}s...` }));
              await new Promise(r => setTimeout(r, 1000));
            }
            setSearchState(prev => ({ ...prev, error: null }));
          } else if (isAutoLoop && !abortControllerRef.current && leadsFoundInSession < goal) {
            await new Promise(r => setTimeout(r, BASE_COOLDOWN));
          }

          if (!isAutoLoop) break;
        } catch (batchError: any) {
          // Erro em um lote não encerra o robô: avisa e continua após cooldown
          const msg = batchError?.message || String(batchError);
          setSearchState(prev => ({
            ...prev,
            results: [...localResults],
            currentLoopCount: leadsFoundInSession,
            error: `⚠️ Lote falhou (continuando em 15s): ${msg.slice(0, 60)}`
          }));
          resultsRef.current = [...localResults];
          if (!abortControllerRef.current && isAutoLoop && leadsFoundInSession < goal) {
            await new Promise(r => setTimeout(r, 15000));
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600 fill-blue-600" />
            <h1 className="text-xl font-bold">Rede Uniao <span className="text-blue-600">Maps 2.5</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-tighter">Chave API</span>
                <span className={`text-sm font-bold ${apiKey.trim() ? 'text-green-600' : 'text-amber-600'}`}>
                  {apiKey.trim() ? 'Configurada ✓' : 'Não inserida'}
                </span>
             </div>
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-blue-600 font-bold hover:bg-blue-50 transition-colors" title="Abre o site para criar/copiar a chave — depois cole no campo abaixo">
                Obter chave
             </a>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-tighter">Investimento IA</span>
                <span className="text-sm font-bold text-slate-700">${searchState.totalCost.toFixed(3)}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Campanha</label>
              <select
                value={currentCampaignId}
                onChange={(e) => handleSelectCampaign(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white font-medium min-w-[200px]"
              >
                <option value="__all__">Todos os leads</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.query || c.id}</option>
                ))}
              </select>
              <button type="button" onClick={handleNewCampaign} className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium flex items-center gap-1.5 hover:bg-slate-50">
                <Plus className="w-4 h-4" /> Nova campanha
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={apiKey.trim() ? '' : 'ring-2 ring-amber-200 ring-offset-2 rounded-xl p-1 -m-1'}>
                    <label className="text-xs font-bold text-slate-500 uppercase block">
                      Chave API Gemini <span className="text-amber-600 font-normal normal-case">(obrigatório)</span>
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full h-11 px-4 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Clique aqui e cole a chave do Google AI Studio"
                      title="Cole a chave que você copiou do link 'Obter chave'"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Obtenha em <strong>Obter chave</strong> (canto superior) → depois <strong>cole neste campo</strong>.
                    </p>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">O que buscar?</label>
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-11 px-4 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Vidraçarias em Goiânia" />
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t">
                <div className="flex gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Meta</label>
                        <select value={targetGoal} onChange={(e) => setTargetGoal(Number(e.target.value))} className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white font-medium">
                            <option value="20">20 Leads</option>
                            <option value="100">100 Leads</option>
                            <option value="500">500 Leads</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Modo Seguro</label>
                        <select value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white font-medium">
                            <option value="1">1x (Recomendado)</option>
                            <option value="2">2x (Rápido/Instável)</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {searchState.isLooping ? (
                        <button onClick={() => abortControllerRef.current = true} className="h-11 flex-1 px-8 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                           <StopCircle className="w-4 h-4" /> Parar Extração ({searchState.results.length} na base · meta {targetGoal})
                        </button>
                    ) : (
                        <button onClick={() => executeSearch(true)} disabled={searchState.isLoading || currentCampaignId === '__all__'} className="h-11 flex-1 px-10 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50" title={currentCampaignId === '__all__' ? 'Selecione uma campanha para rodar o robô' : undefined}>
                           {searchState.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlayCircle className="w-4 h-4" /> Iniciar Robô</>}
                        </button>
                    )}
                </div>
            </div>

            {configRestored && searchState.results.length > 0 && !searchState.isLoading && !searchState.isLooping && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                <span>
                  Configuração da última busca restaurada. Você tem <strong>{searchState.results.length} leads</strong> na base — clique em <strong>Iniciar Robô</strong> para continuar até a meta ({targetGoal}).
                </span>
                <button type="button" onClick={() => setConfigRestored(false)} className="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded" aria-label="Fechar">✕</button>
              </div>
            )}
        </div>

        {searchState.error && (
            <div className={`p-4 rounded-xl flex items-center gap-3 border transition-all ${searchState.error.includes("☕") ? 'bg-blue-50 border-blue-200 text-blue-800 animate-pulse' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {searchState.error.includes("☕") ? <Coffee className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                <span className="text-sm font-semibold">{searchState.error}</span>
            </div>
        )}

        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold">Base Minerada</h2>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{searchState.results.length} leads</span>
                </div>
                <div className="flex gap-2">
                    {searchState.results.length > 0 && (
                        <button onClick={handleClearData} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Limpar Banco de Dados">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <ExportButton data={searchState.results} filename="leads_rede_uniao" />
                </div>
            </div>
            
            {searchState.results.length > 0 ? (
              <ResultsTable results={searchState.results} onDelete={handleDeleteLead} />
            ) : (
              <div className="py-24 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                <Database className="w-16 h-16 mb-4 opacity-10" />
                <p className="font-semibold text-slate-400">O banco de dados está vazio.</p>
                <p className="text-xs text-slate-300 mt-1">Configure a API e inicie a mineração.</p>
              </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;