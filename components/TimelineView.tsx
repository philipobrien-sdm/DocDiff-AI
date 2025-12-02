import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrackedItem, AnalysisResult, AnalysisStatus } from '../types';
import { ChangeCard } from './ChangeCard';
import { Play, Pause, SkipBack, SkipForward, FastForward, Calendar, Clock } from 'lucide-react';

interface TimelineViewProps {
  items: TrackedItem[];
  results: Map<string, AnalysisResult>;
  onUpdateNote: (id: string, note: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ items, results, onUpdateNote }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2000); // ms per slide
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateA === 0 && dateB === 0) return 0;
      if (dateA === 0) return 1;
      if (dateB === 0) return -1;
      return dateA - dateB;
    });
  }, [items]);

  const activeItem = sortedItems[currentIndex];
  const activeResult = results.get(activeItem.id);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= sortedItems.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, sortedItems.length]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeNode = scrollContainerRef.current.children[currentIndex] as HTMLElement;
      if (activeNode) {
        scrollContainerRef.current.scrollTo({
          left: activeNode.offsetLeft - scrollContainerRef.current.clientWidth / 2 + activeNode.clientWidth / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown Date";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (id: string) => {
    const res = results.get(id);
    if (!res) return "bg-slate-300";
    switch (res.status) {
      case AnalysisStatus.ACCEPTED:
        return "bg-emerald-500";
      case AnalysisStatus.ADDRESSED:
        return "bg-blue-500";
      case AnalysisStatus.NOT_ACTIONED:
        return "bg-rose-500";
      case AnalysisStatus.NO_LONGER_RELEVANT:
        return "bg-slate-400";
      default:
        return "bg-amber-400";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={18} />
          <span className="font-semibold">{formatDate(activeItem.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Clock size={16} />
          <span>Event {currentIndex + 1} of {sortedItems.length}</span>
        </div>
      </div>

      <div className="flex-1 p-8 bg-slate-50/50 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-2xl transform transition-all duration-500">
          {activeItem && <ChangeCard item={activeItem} result={activeResult} onUpdateNote={onUpdateNote} />}
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex items-center justify-center gap-6 mb-6">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            disabled={currentIndex === 0}
          >
            <SkipBack size={24} />
          </button>

          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-14 w-14 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform transform active:scale-95"
          >
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>

          <button 
            onClick={() => setCurrentIndex(Math.min(sortedItems.length - 1, currentIndex + 1))}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            disabled={currentIndex === sortedItems.length - 1}
          >
            <SkipForward size={24} />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-2" />

          <button
            onClick={() => setSpeed(speed === 2000 ? 500 : 2000)}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${speed === 500 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
          >
            <FastForward size={14} />
            {speed === 500 ? '2x' : '1x'}
          </button>
        </div>

        <div className="relative h-12">
           <div 
             ref={scrollContainerRef}
             className="absolute inset-0 overflow-x-auto flex items-center gap-1 px-[50%] no-scrollbar scroll-smooth"
             style={{ scrollSnapType: 'x mandatory' }}
           >
             {sortedItems.map((item, idx) => (
               <button
                 key={item.id}
                 onClick={() => {
                   setCurrentIndex(idx);
                   setIsPlaying(false);
                 }}
                 className={`
                   flex-shrink-0 rounded-full transition-all duration-300 cursor-pointer
                   ${idx === currentIndex 
                      ? `w-4 h-4 ring-4 ring-blue-100 ${getStatusColor(item.id)} scale-125 z-10` 
                      : `w-2 h-2 ${getStatusColor(item.id)} hover:scale-150 opacity-60 hover:opacity-100`
                   }
                 `}
                 title={`${item.type}`}
               />
             ))}
           </div>
           
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
             <div className="w-0.5 h-16 bg-blue-500/20" />
           </div>
        </div>
      </div>
    </div>
  );
};
