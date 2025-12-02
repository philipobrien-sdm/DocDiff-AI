import React, { useMemo, useState, useRef, useEffect } from 'react';
import { TrackedItem, AnalysisResult } from '../types';
import { ChangeCard } from './ChangeCard';
import { Search } from 'lucide-react';

interface DocumentViewProps {
  fullText: string;
  items: TrackedItem[];
  results: Map<string, AnalysisResult>;
  onUpdateNote: (id: string, note: string) => void;
}

export const DocumentView: React.FC<DocumentViewProps> = ({ fullText, items, results, onUpdateNote }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Split text into paragraphs
  const paragraphs = useMemo(() => fullText.split('\n').filter(p => p.trim()), [fullText]);

  // Helper to scroll sidebar to a card
  const scrollToCard = (itemId: string) => {
    setSelectedItemId(itemId);
    const cardElement = document.getElementById(`card-${itemId}`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Helper to scroll main text to a paragraph
  const scrollToParagraph = (index: number) => {
    const paraElement = document.getElementById(`para-${index}`);
    if (paraElement && scrollContainerRef.current) {
        paraElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // When selected item changes (via sidebar click), scroll to paragraph
  useEffect(() => {
    if (selectedItemId) {
      const item = items.find(i => i.id === selectedItemId);
      if (item && item.paragraphIndex !== undefined) {
        // Adjust index (item.paragraphIndex is 1-based usually from docxService logic)
        // We need to map it to our paragraphs array. 
        // Note: docxService line 50: fullText += pText + "\n". 
        // So paragraphIndex 1 corresponds to paragraphs[0].
        scrollToParagraph(item.paragraphIndex - 1);
      }
    }
  }, [selectedItemId, items]);

  return (
    <div className="flex h-[700px] border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
      
      {/* Left Panel: Document Text */}
      <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-semibold text-slate-800">New Version Preview</h3>
          <div className="text-xs text-slate-500">
             Click highlighted sections to view annotations
          </div>
        </div>
        
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 space-y-4 font-serif text-lg leading-relaxed text-slate-800 scroll-smooth">
          {paragraphs.map((p, idx) => {
            // Find ALL items associated with this paragraph index
            const relevantItems = items.filter(i => (i.paragraphIndex !== undefined) && (i.paragraphIndex - 1 === idx));
            const hasItems = relevantItems.length > 0;
            const isSelectedPara = selectedItemId && relevantItems.some(i => i.id === selectedItemId);

            return (
              <p 
                key={idx} 
                id={`para-${idx}`}
                onClick={() => {
                  if (hasItems) {
                    // Select the first item in this paragraph
                    scrollToCard(relevantItems[0].id);
                  }
                }}
                className={`
                  transition-all duration-300 rounded px-2 py-1 border border-transparent
                  ${isSelectedPara 
                    ? 'bg-blue-100 text-slate-900 ring-2 ring-blue-300' 
                    : hasItems 
                      ? 'bg-yellow-50 hover:bg-yellow-100 cursor-pointer border-yellow-100 hover:border-yellow-300' 
                      : ''
                  }
                `}
              >
                {p}
                {/* Visual indicator for count */}
                {hasItems && (
                   <span className="inline-flex ml-2 items-center justify-center w-5 h-5 bg-yellow-200 text-yellow-800 text-[10px] rounded-full font-sans font-bold align-middle">
                     {relevantItems.length}
                   </span>
                )}
              </p>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Annotations (Diff Bar) */}
      <div className="w-[400px] flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Search size={16} />
            Annotations ({items.length})
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {items.map(item => (
            <div key={item.id} id={`card-${item.id}`}>
              <ChangeCard 
                item={item} 
                result={results.get(item.id)} 
                compact={true}
                highlighted={selectedItemId === item.id}
                onClick={() => {
                   setSelectedItemId(item.id);
                   // Logic to scroll to paragraph handled by useEffect
                }}
                onUpdateNote={onUpdateNote}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
