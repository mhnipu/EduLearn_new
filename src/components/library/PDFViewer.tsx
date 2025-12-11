import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, Download, ExternalLink, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title: string;
  onDownload?: () => void;
}

export function PDFViewer({ url, title, onDownload }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Use Google Docs viewer for PDF rendering (works better than native embed)
  const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  
  // Alternative: Use PDF.js viewer from Mozilla
  const pdfJsUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`;

  const handleOpenExternal = () => {
    window.open(url, '_blank');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2 p-2 bg-muted rounded-t-lg border border-b-0">
        <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          {onDownload && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Container */}
      <div className={`relative bg-muted rounded-b-lg border overflow-hidden ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[600px]'}`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-muted-foreground">Could not load the PDF in the viewer.</p>
            <div className="flex gap-2">
              <Button onClick={handleOpenExternal}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
              {onDownload && (
                <Button variant="outline" onClick={onDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        ) : (
          <iframe
            src={googleDocsUrl}
            title={title}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </div>

      {/* Fullscreen close button */}
      {isFullscreen && (
        <Button 
          variant="secondary" 
          className="absolute top-2 right-2"
          onClick={toggleFullscreen}
        >
          Exit Fullscreen
        </Button>
      )}
    </div>
  );
}
