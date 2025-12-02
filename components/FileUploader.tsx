import React, { useCallback, useRef, useEffect } from 'react';
import { Upload, FileType, CheckCircle, X } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ label, file, onFileSelect, accept = ".docx" }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If file is null (reset), clear the input value so the same file can be selected again
    if (!file && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [file]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Extension Check
      if (accept) {
          // Accept can be ".docx" or ".docx,.csv,.xlsx"
          const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase().replace('*', ''));
          const fileExt = "." + droppedFile.name.split('.').pop()?.toLowerCase();
          
          const isValid = allowedExtensions.some(ext => fileExt === ext || fileExt.endsWith(ext));

          if (!isValid) {
              alert(`Invalid file type. Allowed: ${accept}`);
              return;
          }
      }
      onFileSelect(droppedFile);
    }
  }, [onFileSelect, accept]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onFileSelect(null);
      if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div 
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out
          flex flex-col items-center justify-center text-center cursor-pointer group
          ${file 
            ? 'border-emerald-400 bg-emerald-50/50' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }
        `}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept={accept} 
          onChange={handleChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {file ? (
          <>
            <button 
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full shadow-sm z-20 transition-all"
                title="Remove file"
            >
                <X size={16} />
            </button>
            <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
              <CheckCircle size={24} />
            </div>
            <p className="text-sm font-semibold text-emerald-800 truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-emerald-600 mt-1">Ready for analysis</p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
              <Upload size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Click to upload or drag & drop</p>
            <p className="text-xs text-slate-500 mt-1">
              {accept === '.docx' ? 'DOCX files only' : 'DOCX, CSV, Excel'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
