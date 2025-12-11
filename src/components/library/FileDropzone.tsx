import { useState, useCallback, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  accept: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  label: string;
  description?: string;
  maxSizeMB?: number;
}

export function FileDropzone({
  accept,
  onFileSelect,
  selectedFile,
  onClear,
  label,
  description,
  maxSizeMB = 100,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const acceptTypes = accept.split(',').map(t => t.trim());
    const fileType = file.type;
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;

    const isValidType = acceptTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExt === type;
      }
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.replace('/*', '/'));
      }
      return fileType === type;
    });

    if (!isValidType) return false;
    if (file.size > maxSizeMB * 1024 * 1024) return false;
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect, accept, maxSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (selectedFile) {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <File className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <Upload className={cn('h-8 w-8 mx-auto mb-2', isDragging ? 'text-primary' : 'text-muted-foreground')} />
      <p className="font-medium text-sm">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      <p className="text-xs text-muted-foreground mt-2">
        Drag & drop or click to browse (max {maxSizeMB}MB)
      </p>
    </div>
  );
}
