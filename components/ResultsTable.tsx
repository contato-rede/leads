import React, { useState, useMemo, useRef, useEffect } from 'react';
import { List } from 'react-window';
import { Business, SortField, SortOrder } from '../types';
import { Star, MapPin, Phone, Globe, ArrowUpDown, Trash2, ArrowUp, ArrowDown, Facebook, Instagram, Info } from 'lucide-react';

const ROW_HEIGHT = 100;
const HEADER_HEIGHT = 48;
const FOOTER_HEIGHT = 40;

interface ResultsTableProps {
  results: Business[];
  onDelete: (id: string) => void;
}

const gridCols = 'minmax(200px, 1fr) 112px minmax(140px, 1fr) minmax(180px, 1fr) 48px';

function RowContent({ biz, onDelete }: { biz: Business; onDelete: (id: string) => void }) {
  return (
    <>
      <div className="min-w-0 max-w-[280px]">
        <div className="font-medium text-slate-900">{biz.name}</div>
        <div className="flex flex-wrap gap-1 mt-0.5 mb-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">{biz.category}</span>
        </div>
        {biz.description && (
          <div className="flex items-start gap-1.5 text-xs text-slate-500 italic mt-1">
            <Info className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2" title={biz.description}>{biz.description}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-slate-700">{biz.rating || '-'}</span>
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span className="text-xs text-slate-400">({biz.reviews || 0})</span>
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        {biz.phone ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {biz.phone}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Sem telefone</span>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {biz.website && (
            <a href={biz.website} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-md transition-colors" title="Website">
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}
          {biz.instagram && (
            <a href={biz.instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-100 hover:bg-pink-100 text-slate-600 hover:text-pink-600 rounded-md transition-colors" title="Instagram">
              <Instagram className="w-3.5 h-3.5" />
            </a>
          )}
          {biz.facebook && (
            <a href={biz.facebook} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded-md transition-colors" title="Facebook">
              <Facebook className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2 text-sm text-slate-600 min-w-0 max-w-xs">
        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-2" title={biz.address}>{biz.address}</span>
      </div>
      <div className="text-right">
        <button
          onClick={() => onDelete(biz.id)}
          className="p-2 sm:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          title="Remover lead"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ results, onDelete }) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC);
    } else {
      setSortField(field);
      setSortOrder(SortOrder.DESC);
    }
  };

  const sortedResults = useMemo(() => {
    if (!sortField) return results;
    return [...results].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      if (sortField === SortField.RATING || sortField === SortField.REVIEWS) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      if (aValue < bValue) return sortOrder === SortOrder.ASC ? -1 : 1;
      if (aValue > bValue) return sortOrder === SortOrder.ASC ? 1 : -1;
      return 0;
    });
  }, [results, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortOrder === SortOrder.ASC ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(350);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setListHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[min(420px,55vh)] sm:h-[600px]">
      <div className="overflow-x-auto flex-1 flex flex-col min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="min-w-[640px] flex flex-col flex-1 min-h-0">
          <div
            className="bg-slate-50 border-b border-slate-200 shrink-0 grid items-center px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider"
            style={{ gridTemplateColumns: gridCols, height: HEADER_HEIGHT }}
          >
            <div onClick={() => handleSort(SortField.NAME)} className="cursor-pointer active:bg-slate-100 -mx-2 px-2 py-1 rounded flex items-center gap-1 touch-manipulation">
              Empresa / Detalhes <SortIcon field={SortField.NAME} />
            </div>
            <div onClick={() => handleSort(SortField.RATING)} className="cursor-pointer active:bg-slate-100 -mx-2 px-2 py-1 rounded flex items-center gap-1 w-28">
              Avaliação <SortIcon field={SortField.RATING} />
            </div>
            <div>Contato & Social</div>
            <div>Endereço</div>
            <div></div>
          </div>
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-hidden">
            {sortedResults.length === 0 ? (
              <div className="flex items-center justify-center min-h-[200px] text-slate-400 text-sm p-4">Nenhum lead nesta campanha.</div>
            ) : (
              <List
              rowCount={sortedResults.length}
              rowHeight={ROW_HEIGHT}
              overscanCount={4}
              rowComponent={({ index, style }) => {
                const biz = sortedResults[index];
                return (
                  <div className="grid gap-0 border-b border-slate-100 hover:bg-blue-50/50 active:bg-blue-50/50 group items-start py-2 sm:py-3 px-3 sm:px-4" style={{ ...style, display: 'grid', gridTemplateColumns: gridCols, alignItems: 'start' }}>
                    <RowContent biz={biz} onDelete={onDelete} />
                  </div>
                );
              }}
              rowProps={{}}
              style={{ height: listHeight }}
            />
            )}
          </div>
        </div>
      </div>
      <div className="bg-slate-50 px-3 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 text-[10px] sm:text-xs text-slate-500 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 shrink-0">
        <span>Mostrando {sortedResults.length} resultados</span>
        <span className="hidden sm:inline">Dados fornecidos pelo Google Maps & Search</span>
      </div>
    </div>
  );
};
