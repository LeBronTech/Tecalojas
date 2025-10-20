import React, { useState, useContext, useRef } from 'react';
import { ThemeContext } from '../App';
import { CatalogPDF, DynamicBrand } from '../types';

interface CatalogScreenProps {
  catalogs: CatalogPDF[];
  onUploadCatalog: (brandName: string, pdfFile: File) => Promise<void>;
  onMenuClick: () => void;
  canManageStock: boolean;
  brands: DynamicBrand[];
}

const CatalogScreen: React.FC<CatalogScreenProps> = ({ catalogs, onUploadCatalog, onMenuClick, canManageStock, brands }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [selectionMode, setSelectionMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingBrand, setSelectedExistingBrand] = useState('');
  const [newBrandName, setNewBrandName] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadError(null);
    } else {
      setSelectedFile(null);
      setUploadError('Por favor, selecione um arquivo PDF.');
    }
  };

  const handleUpload = async () => {
    const finalBrandName = selectionMode === 'existing' ? selectedExistingBrand : newBrandName;

    if (!finalBrandName.trim()) {
      setUploadError('Por favor, selecione ou digite o nome de uma marca.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Por favor, selecione um arquivo PDF.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      await onUploadCatalog(finalBrandName.trim(), selectedFile);
      // Reset form
      setSelectedExistingBrand('');
      setNewBrandName('');
      setSelectionMode('existing');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      setUploadError(error.message || 'Falha ao enviar o catálogo.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'} ${className}`}>
        {children}
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
        <h1 className={`text-3xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Catálogos</h1>
        
        {canManageStock && (
            <Card className="mb-8">
                 <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Adicionar Novo Catálogo</h2>
                 <div className="space-y-4">
                    <div>
                        <label className={`text-sm font-semibold mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Marca Associada</label>
                        <div className={`flex gap-4 p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                            <button onClick={() => setSelectionMode('existing')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${selectionMode === 'existing' ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-purple-600 text-white') : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200')}`}>
                                Marca Existente
                            </button>
                             <button onClick={() => setSelectionMode('new')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${selectionMode === 'new' ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-purple-600 text-white') : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200')}`}>
                                Nova Marca
                            </button>
                        </div>
                    </div>

                    {selectionMode === 'existing' && (
                        <div className={`p-3 rounded-lg border max-h-40 overflow-y-auto ${isDark ? 'bg-black/10 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex flex-wrap gap-3">
                                {brands.map(brand => (
                                    <button
                                        type="button"
                                        key={brand.id}
                                        onClick={() => setSelectedExistingBrand(brand.name)}
                                        className={`p-2 rounded-lg flex items-center gap-2 transition-all duration-200 border ${
                                            selectedExistingBrand === brand.name 
                                            ? `ring-2 ring-offset-2 ring-fuchsia-500 ${isDark ? 'bg-black/40 border-fuchsia-500' : 'bg-white border-purple-500'}`
                                            : `${isDark ? 'bg-black/20 border-transparent hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-400'}`
                                        }`}
                                    >
                                        <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 rounded-full object-contain bg-white p-1" />
                                        <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{brand.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectionMode === 'new' && (
                        <div>
                             <input 
                                value={newBrandName} 
                                onChange={(e) => setNewBrandName(e.target.value)}
                                placeholder="Digite o nome da nova marca..."
                                className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-50 text-gray-900 border-gray-200'}`}
                            />
                        </div>
                    )}


                     <div>
                        <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Arquivo PDF</label>
                        <input 
                            type="file" 
                            accept="application/pdf" 
                            onChange={handleFileChange} 
                            ref={fileInputRef}
                            className={`w-full text-sm rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDark ? 'text-gray-400 file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600' : 'text-gray-600 file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200'}`}
                        />
                    </div>
                     {uploadError && <p className="text-sm text-red-500 font-semibold">{uploadError}</p>}
                    <button onClick={handleUpload} disabled={isUploading} className="w-full mt-2 bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-cyan-700 transition disabled:bg-gray-500">
                        {isUploading ? 'Enviando...' : 'Enviar Catálogo'}
                    </button>
                 </div>
            </Card>
        )}
        
        <div className="space-y-4">
            {catalogs.length > 0 ? catalogs.map(catalog => (
                <a 
                    key={catalog.id} 
                    href={catalog.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`p-4 rounded-xl flex items-center justify-between border transition-all duration-300 ${isDark ? 'bg-black/20 border-white/10 hover:bg-black/30' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                >
                    <div className="flex items-center gap-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6.414A2 2 0 0017.414 5L14 1.586A2 2 0 0012.586 1H4a2 2 0 00-2 2zm4 8a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 100 2h4a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                             <p className={`font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{catalog.brandName}</p>
                             <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{catalog.fileName}</p>
                        </div>
                    </div>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            )) : (
                 <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Nenhum catálogo foi adicionado ainda.</p>
            )}
        </div>
        
      </main>
    </div>
  );
};

export default CatalogScreen;