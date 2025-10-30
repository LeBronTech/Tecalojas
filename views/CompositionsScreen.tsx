import React, { useState, useContext } from 'react';
import { ThemeContext } from '../App';
import { SavedComposition, View } from '../types';
import CompositionViewerModal from '../components/CompositionViewerModal';

interface CompositionsScreenProps {
  savedCompositions: SavedComposition[];
  setSavedCompositions: React.Dispatch<React.SetStateAction<SavedComposition[]>>;
  onNavigate: (view: View) => void;
}

const CompositionsScreen: React.FC<CompositionsScreenProps> = ({ savedCompositions, setSavedCompositions, onNavigate }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [viewerState, setViewerState] = useState<{ open: boolean; startIndex: number }>({ open: false, startIndex: 0 });

  const handleDelete = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    setSavedCompositions(prev => prev.filter(c => c.id !== idToDelete));
  };

  const openViewer = (index: number) => {
    setViewerState({ open: true, startIndex: index });
  };

  const titleClasses = isDark ? "text-white" : "text-gray-900";
  const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
  const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200 shadow-sm";

  return (
    <>
      <div className="h-full w-full flex flex-col relative overflow-hidden">
        <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${titleClasses}`}>Composições Salvas</h1>
             <button
                onClick={() => onNavigate(View.COMPOSITION_GENERATOR)}
                className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
                Criar Nova
            </button>
          </div>
          
          {savedCompositions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCompositions.map((comp, index) => (
                <div key={comp.id} className={`rounded-2xl border ${cardClasses} flex flex-col`}>
                  <button onClick={() => openViewer(index)} className="w-full aspect-square rounded-t-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                    {comp.isGenerating ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/10">
                             <svg className="animate-spin h-8 w-8 text-fuchsia-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="text-sm mt-2 text-fuchsia-300">Gerando imagem...</p>
                        </div>
                    ) : comp.imageUrl ? (
                      <img src={comp.imageUrl} alt={comp.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                        {comp.products.slice(0, 4).map(p => (
                            <img key={p.id} src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ))}
                      </div>
                    )}
                  </button>
                  <div className="p-4 flex justify-between items-start">
                    <div>
                        <p className={`font-bold ${titleClasses}`}>{comp.name}</p>
                        <p className={`text-sm ${subtitleClasses}`}>{comp.size} almofadas</p>
                    </div>
                    <button onClick={(e) => handleDelete(e, comp.id)} className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className={`text-lg font-semibold ${titleClasses}`}>Nenhuma composição salva</p>
              <p className={`mt-2 ${subtitleClasses}`}>Use o Gerador de Composições para criar e salvar suas combinações favoritas.</p>
            </div>
          )}
        </main>
      </div>
      {viewerState.open && (
        <CompositionViewerModal
            compositions={savedCompositions}
            startIndex={viewerState.startIndex}
            onClose={() => setViewerState({ open: false, startIndex: 0 })}
        />
      )}
    </>
  );
};

export default CompositionsScreen;
