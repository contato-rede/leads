import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
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

  const parseCityUF = (address: string) => {
    if (!address) return '';
    try {
      // Formato esperado: "Logradouro, Numero - Bairro, Cidade - UF, CEP, Pais"
      // ou "Logradouro - Cidade - UF, CEP, Pais"
      const parts = address.split(' - ');
      if (parts.length >= 3) {
        const city = parts[1].trim();
        const statePart = parts[2].split(',')[0].trim();
        if (statePart.length === 2 && statePart === statePart.toUpperCase()) {
          return `${city} / ${statePart}`;
        }
      } else if (parts.length === 2) {
        // Tenta pegar do segundo pedaço: "Cidade - UF, CEP..."
        const subParts = parts[1].split(',');
        const cityStatePart = subParts[0].trim(); // "Cidade - UF"
        if (cityStatePart.includes(' - ')) {
          const [city, state] = cityStatePart.split(' - ');
          if (state.trim().length === 2) {
            return `${city.trim()} / ${state.trim().toUpperCase()}`;
          }
        }
      }
    } catch (e) {
      console.error("Erro ao parsear endereço:", e);
    }
    return '';
  };

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
      'Cidade/UF',
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
          escape(parseCityUF(item.address)),
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
    // Prepare data for Excel
    const worksheetData = data.map(item => ({
      'Campanha (ID)': item.campaignId || '',
      'Nome da Empresa': item.name || '',
      'Cidade/UF': parseCityUF(item.address),
      'Telefone': item.phone || '',
      'Endereço': item.address || '',
      'Website': item.website || '',
      'Instagram': item.instagram || '',
      'Facebook': item.facebook || '',
      'Nota': item.rating || '',
      'Avaliações': item.reviews || '',
      'Categoria': item.category || '',
      'Descrição': item.description || ''
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Adjust column widths automatically
    const colWidths = [
      { wch: 15 }, // Campanha
      { wch: 30 }, // Nome
      { wch: 20 }, // Cidade/UF
      { wch: 15 }, // Telefone
      { wch: 40 }, // Endereço
      { wch: 25 }, // Website
      { wch: 20 }, // Instagram
      { wch: 20 }, // Facebook
      { wch: 10 }, // Nota
      { wch: 10 }, // Avaliações
      { wch: 20 }, // Categoria
      { wch: 30 }  // Descrição
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    // Generate file
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm active:bg-green-800 min-h-[44px] touch-manipulation w-full sm:w-auto justify-center"
      >
        <Download className="w-4 h-4 flex-shrink-0" />
        Exportar Dados
        <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};