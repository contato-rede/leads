import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Business } from '../types';

interface ExportButtonProps {
  data: Business[];
  filename: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, filename }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const downloadFile = (content: string, type: string, extension: string) => {
     const blob = new Blob([content], { type: `${type};charset=utf-8;` });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.setAttribute('href', url);
     link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.${extension}`);
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const headers = [
        'Campanha (ID)',
        'Nome da Empresa', 
        'Telefone', 
        'Endereço', 
        'Website', 
        'Instagram',
        'Facebook',
        'Nota', 
        'Avaliações', 
        'Categoria',
        'Descrição'
    ];
    const csvContent = [
      headers.join(','),
      ...data.map(item => {
        const escape = (val: string | number | undefined) => {
          if (val === undefined || val === null) return '""';
          const stringVal = String(val);
          if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        };
        return [
          escape(item.campaignId),
          escape(item.name),
          escape(item.phone),
          escape(item.address),
          escape(item.website),
          escape(item.instagram),
          escape(item.facebook),
          escape(item.rating),
          escape(item.reviews),
          escape(item.category),
          escape(item.description)
        ].join(',');
      })
    ].join('\n');

    downloadFile(csvContent, 'text/csv', 'csv');
    setIsOpen(false);
  };

  const handleExportXLS = () => {
     const headers = [
        'Campanha (ID)',
        'Nome da Empresa', 
        'Telefone', 
        'Endereço', 
        'Website', 
        'Instagram',
        'Facebook',
        'Nota', 
        'Avaliações', 
        'Categoria',
        'Descrição'
    ];
     
     let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
     html += '<head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head>';
     html += '<body><table border="1">';
     
     html += '<thead><tr>';
     headers.forEach(h => html += `<th style="background-color: #f0f0f0; font-weight: bold;">${h}</th>`);
     html += '</tr></thead>';
     
     html += '<tbody>';
     data.forEach(item => {
        html += '<tr>';
        const fields = [
            item.campaignId,
            item.name, 
            item.phone, 
            item.address, 
            item.website, 
            item.instagram,
            item.facebook,
            item.rating, 
            item.reviews, 
            item.category,
            item.description
        ];
        fields.forEach(f => {
            html += `<td>${f || ''}</td>`;
        });
        html += '</tr>';
     });
     html += '</tbody></table></body></html>';

     downloadFile(html, 'application/vnd.ms-excel', 'xls');
     setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm active:translate-y-0.5"
      >
        <Download className="w-4 h-4" />
        Exportar Dados
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           <div className="py-1">
              <button 
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                 <FileText className="w-4 h-4 text-slate-400" />
                 <span>Exportar CSV</span>
              </button>
              <button 
                onClick={handleExportXLS}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-50"
              >
                 <FileSpreadsheet className="w-4 h-4 text-green-600" />
                 <span>Exportar Excel (.xls)</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
};