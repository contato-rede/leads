
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, CheckSquare, Square, Search, Plus, X, History, MapPin, Globe } from 'lucide-react';
import { ALL_STATES, STATE_HUBS } from '../services/geographyService';

interface CitySelectorProps {
    selected: string[];
    onSelect: (cities: string[]) => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
    const [manualCity, setManualCity] = useState('');
    const [history, setHistory] = useState<string[]>([]);

    // Carregar histórico do localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem('city_selection_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Erro ao carregar histórico", e);
            }
        }
    }, []);

    const toggleState = (stateCode: string) => {
        const newExpanded = new Set(expandedStates);
        if (newExpanded.has(stateCode)) {
            newExpanded.delete(stateCode);
        } else {
            newExpanded.add(stateCode);
        }
        setExpandedStates(newExpanded);
    };

    const toggleCity = (cityName: string, stateName?: string) => {
        if (stateName && selected.includes(stateName)) return;

        let newSelected = [...selected];
        if (newSelected.includes(cityName)) {
            newSelected = newSelected.filter(c => c !== cityName);
        } else {
            newSelected.push(cityName);
            updateHistory(cityName);
        }
        onSelect(newSelected);
    };

    const toggleAllCitiesInState = (stateName: string, stateCode: string) => {
        const hubs = STATE_HUBS[stateCode] || [];
        const hubNames = hubs.map(h => h.name);
        let newSelected = [...selected];

        const isStateSelected = selected.includes(stateName);

        if (isStateSelected) {
            // Remove state and its hubs
            newSelected = newSelected.filter(c => c !== stateName && !hubNames.includes(c));
        } else {
            // Add state and clean up individual hubs from that state to avoid duplication
            newSelected = [...newSelected.filter(c => !hubNames.includes(c)), stateName];
            updateHistory(stateName);
        }
        onSelect(newSelected);
    };

    const updateHistory = (location: string) => {
        const newHistory = [location, ...history.filter(h => h !== location)].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem('city_selection_history', JSON.stringify(newHistory));
    };

    const addManualCity = () => {
        if (!manualCity.trim()) return;
        const city = manualCity.trim();
        if (!selected.includes(city)) {
            const newSelected = [...selected, city];
            onSelect(newSelected);
            updateHistory(city);
        }
        setManualCity('');
    };

    const removeCity = (city: string) => {
        onSelect(selected.filter(c => c !== city));
    };

    const filteredStates = useMemo(() => {
        if (!searchTerm) return ALL_STATES;
        const lowerSearch = searchTerm.toLowerCase();
        return ALL_STATES.filter(s =>
            s.name.toLowerCase().includes(lowerSearch) ||
            s.code.toLowerCase().includes(lowerSearch) ||
            STATE_HUBS[s.code]?.some(c => c.name.toLowerCase().includes(lowerSearch))
        );
    }, [searchTerm]);

    return (
        <div className="relative w-full">
            {/* Display Selected Tags */}
            <div
                className="w-full min-h-[44px] p-2 flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-xl cursor-text hover:border-blue-400 transition-colors"
                onClick={() => setIsOpen(true)}
            >
                {selected.length === 0 && (
                    <span className="text-slate-400 text-sm py-1 px-1">Selecione cidades ou estados...</span>
                )}
                {selected.map(city => (
                    <span key={city} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                        {city}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeCity(city); }}
                            className="hover:text-blue-900"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[320px] overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                placeholder="Buscar cidade ou estado..."
                                autoFocus
                            />
                        </div>

                        {/* Recent History */}
                        {history.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                <History className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                {history.map(h => (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => toggleCity(h)}
                                        className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${selected.includes(h) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {filteredStates.map(state => (
                            <div key={state.code} className="space-y-0.5">
                                <div
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
                                    onClick={() => toggleState(state.code)}
                                >
                                    {expandedStates.has(state.code) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    <Globe className="w-4 h-4 text-blue-500 opacity-50" />
                                    <span className="flex-1 text-sm font-bold text-slate-700">{state.name} ({state.code})</span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleAllCitiesInState(state.name, state.code); }}
                                        className="text-slate-300 hover:text-blue-600 transition-colors"
                                    >
                                        {selected.includes(state.name) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                                    </button>
                                </div>

                                {expandedStates.has(state.code) && (
                                    <div className="ml-6 space-y-0.5 border-l border-slate-100 pl-2 mt-1 mb-2">
                                        {STATE_HUBS[state.code]?.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(city => (
                                            <div
                                                key={city.name}
                                                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50/50 cursor-pointer text-sm ${selected.includes(state.name) ? 'opacity-60 cursor-default' : 'text-slate-600'}`}
                                                onClick={() => toggleCity(city.name, state.name)}
                                            >
                                                <MapPin className="w-3.5 h-3.5 text-slate-300" />
                                                <span className={`flex-1 ${selected.includes(state.name) ? 'font-semibold text-blue-600' : ''}`}>{city.name}</span>
                                                {(selected.includes(city.name) || selected.includes(state.name)) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                        <div className="flex gap-2">
                            <input
                                value={manualCity}
                                onChange={e => setManualCity(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs"
                                placeholder="Adicionar cidade manualmente..."
                                onKeyDown={e => e.key === 'Enter' && addManualCity()}
                            />
                            <button
                                onClick={addManualCity}
                                className="h-9 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full h-9 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                        >
                            Confirmar Seleção ({selected.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop for closing */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
