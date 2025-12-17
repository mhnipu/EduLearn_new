import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Clock, User } from 'lucide-react';
import { VersionService, SectionVersion } from '@/lib/cms/versionService';
import { formatDistanceToNow } from 'date-fns';

interface VersionHistoryProps {
  sectionId: string;
  onRollback?: (versionId: string) => void;
}

export function VersionHistory({ sectionId, onRollback }: VersionHistoryProps) {
  const [versions, setVersions] = useState<SectionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [sectionId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await VersionService.getVersionHistory(sectionId);
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = (versionId: string) => {
    if (onRollback) {
      onRollback(versionId);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading versions...</p>
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No version history available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
          <Badge variant="secondary">{versions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedVersion === version.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedVersion(version.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{version.version_number}</Badge>
                    {version.version_number === versions[0]?.version_number && (
                      <Badge variant="default" className="text-xs">Latest</Badge>
                    )}
                  </div>
                  {onRollback && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRollback(version.id);
                      }}
                    >
                      Rollback
                    </Button>
                  )}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {version.created_by_name || 'Unknown'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
