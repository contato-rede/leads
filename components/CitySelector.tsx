
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    const [history, setHistory] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

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

        // Close on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
        setSearchTerm(''); // Clear search on select for better flow
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
        if (!searchTerm.trim()) return;
        const city = searchTerm.trim();
        if (!selected.includes(city)) {
            const newSelected = [...selected, city];
            onSelect(newSelected);
            updateHistory(city);
        }
        setSearchTerm('');
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

    // Check if search term matches any known city or state EXACTLY to avoid showing "Add custom" when it exists
    const isExactMatch = useMemo(() => {
        if (!searchTerm) return false;
        const lowerSearch = searchTerm.toLowerCase();

        // Check states
        if (ALL_STATES.some(s => s.name.toLowerCase() === lowerSearch)) return true;

        // Check cities
        for (const stateCode in STATE_HUBS) {
            if (STATE_HUBS[stateCode].some(c => c.name.toLowerCase() === lowerSearch)) return true;
        }

        return false;
    }, [searchTerm]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            {/* Display Selected Tags - Refined Look */}
            <div
                className="w-full min-h-[44px] p-2 flex flex-wrap gap-2 bg-white border border-slate-200 rounded-xl cursor-text hover:border-blue-400 transition-colors focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400"
                onClick={() => setIsOpen(true)}
            >
                {selected.length === 0 && (
                    <span className="text-slate-400 text-sm py-1 px-1">Selecione ou digite uma cidade...</span>
                )}
                {selected.map(city => (
                    <span key={city} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100 group">
                        {city}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeCity(city); }}
                            className="text-blue-400 hover:text-blue-700 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </span>
                ))}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[400px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
                        {/* Unified Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    // Auto-expand states when searching
                                    if (e.target.value) {
                                        setExpandedStates(new Set(ALL_STATES.map(s => s.code)));
                                    } else {
                                        setExpandedStates(new Set());
                                    }
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addManualCity();
                                    }
                                }}
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                                placeholder="Buscar ou adicionar nova cidade..."
                                autoFocus
                            />
                        </div>

                        {/* Quick Add Custom City */}
                        {searchTerm && !isExactMatch && (
                            <button
                                onClick={addManualCity}
                                className="w-full flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar "{searchTerm}" como local personalizado
                            </button>
                        )}

                        {/* Recent History */}
                        {!searchTerm && history.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Recentes</span>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar mask-linear-fade">
                                    {history.map(h => (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => toggleCity(h)}
                                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${selected.includes(h) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:shadow-sm'}`}
                                        >
                                            <History className={`w-3 h-3 ${selected.includes(h) ? 'text-white' : 'text-slate-400'}`} />
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-white">
                        {filteredStates.length === 0 && searchTerm && (
                            <div className="p-8 text-center text-slate-500">
                                <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">Nenhum estado ou cidade encontrado.</p>
                                <p className="text-xs text-slate-400 mt-1">Pressione Enter para adicionar "{searchTerm}"</p>
                            </div>
                        )}

                        {filteredStates.map(state => (
                            <div key={state.code} className="rounded-xl overflow-hidden border border-transparent hover:border-slate-100 transition-colors">
                                <div
                                    className={`flex items-center gap-2 p-2.5 hover:bg-slate-50 cursor-pointer select-none ${expandedStates.has(state.code) ? 'bg-slate-50/80' : ''}`}
                                    onClick={() => toggleState(state.code)}
                                >
                                    <div className={`transition-transform duration-200 ${expandedStates.has(state.code) ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                                        {state.code}
                                    </div>
                                    <span className="flex-1 text-sm font-semibold text-slate-700">{state.name}</span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleAllCitiesInState(state.name, state.code); }}
                                        className="text-slate-300 hover:text-blue-600 transition-colors p-1"
                                    >
                                        {selected.includes(state.name) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                                    </button>
                                </div>

                                {expandedStates.has(state.code) && (
                                    <div className="pl-9 pr-2 pb-2 space-y-0.5">
                                        {STATE_HUBS[state.code]?.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(city => (
                                            <div
                                                key={city.name}
                                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors group ${selected.includes(state.name) ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-blue-50/50'}`}
                                                onClick={() => toggleCity(city.name, state.name)}
                                            >
                                                <span className={`flex-1 ${selected.includes(city.name) ? 'font-semibold text-blue-700' : 'text-slate-600 group-hover:text-slate-900'}`}>{city.name}</span>
                                                {(selected.includes(city.name) || selected.includes(state.name)) ?
                                                    <CheckSquare className="w-4 h-4 text-blue-600" /> :
                                                    <Square className="w-4 h-4 text-slate-200 group-hover:text-blue-300" />
                                                }
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-slate-100 bg-white sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full h-10 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                        >
                            Confirmar Seleção
                            <span className="bg-white/20 text-white text-[10px] py-0.5 px-1.5 rounded-full min-w-[20px] text-center">
                                {selected.length}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
