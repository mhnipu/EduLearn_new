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
  onValidationError?: (error: string) => void;
}

export function FileDropzone({
  accept,
  onFileSelect,
  selectedFile,
  onClear,
  label,
  description,
  maxSizeMB = 100,
  onValidationError,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const acceptTypes = accept.split(',').map(t => t.trim());
    const fileType = file.type.toLowerCase();
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;

    // Helper function to check if file matches a type pattern
    const matchesType = (type: string): boolean => {
      const lowerType = type.toLowerCase();
      
      // Handle extensions (e.g., .pdf, .docx)
      if (lowerType.startsWith('.')) {
        return fileExt === lowerType;
      }
      
      // Handle MIME types with wildcards (e.g., image/*, application/*)
      if (lowerType.endsWith('/*')) {
        const baseType = lowerType.replace('/*', '/');
        return fileType.startsWith(baseType);
      }
      
      // Handle exact MIME type matches
      if (fileType === lowerType) {
        return true;
      }
      
      // Handle common PDF aliases
      if (lowerType.includes('pdf') || lowerType.includes('application/pdf')) {
        return fileType === 'application/pdf' || fileExt === '.pdf';
      }
      
      // Handle PowerPoint file types
      if (lowerType.includes('presentation') || lowerType.includes('powerpoint') || lowerType.includes('ppt')) {
        return (
          fileType === 'application/vnd.ms-powerpoint' ||
          fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
          fileExt === '.ppt' ||
          fileExt === '.pptx'
        );
      }
      
      // Handle Word document types
      if (lowerType.includes('word') || lowerType.includes('wordprocessing') || lowerType.includes('doc')) {
        return (
          fileType === 'application/msword' ||
          fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          fileExt === '.doc' ||
          fileExt === '.docx'
        );
      }
      
      // Handle wildcard (*) - accept all files
      if (lowerType === '*' || lowerType === '*/*') {
        return true;
      }
      
      return false;
    };

    const isValidType = acceptTypes.some(matchesType);

    if (!isValidType) {
      // Create a more user-friendly error message
      const acceptedExtensions = acceptTypes
        .filter(t => t.startsWith('.'))
        .map(t => t.toUpperCase())
        .join(', ');
      const acceptedTypes = acceptTypes
        .filter(t => !t.startsWith('.') && !t.includes('*'))
        .join(', ');
      
      let errorMsg = 'File type not supported.';
      if (acceptedExtensions) {
        errorMsg += ` Accepted file types: ${acceptedExtensions}`;
      }
      if (acceptedTypes) {
        errorMsg += acceptedExtensions ? ` or ${acceptedTypes}` : ` Accepted types: ${acceptedTypes}`;
      }
      return { valid: false, error: errorMsg };
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return { valid: false, error: `File size (${fileSizeMB} MB) exceeds maximum allowed size (${maxSizeMB} MB)` };
    }
    
    return { valid: true };
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        const validation = validateFile(file);
        if (validation.valid) {
          onFileSelect(file);
        } else if (onValidationError && validation.error) {
          onValidationError(validation.error);
        }
      }
    },
    [onFileSelect, accept, maxSizeMB, onValidationError]
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
    if (file) {
      const validation = validateFile(file);
      if (validation.valid) {
        onFileSelect(file);
      } else if (onValidationError && validation.error) {
        onValidationError(validation.error);
      }
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
