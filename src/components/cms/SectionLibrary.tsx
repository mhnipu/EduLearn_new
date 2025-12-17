import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Zap, Grid, Briefcase, BarChart, MessageSquare, ArrowRight, DollarSign, HelpCircle, Clock, Image, FileText, Code } from 'lucide-react';
import { SECTION_SCHEMAS, getAvailableSectionTypes } from '@/lib/cms/sectionSchemas';

interface SectionLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sectionType: string, layoutVariant?: string) => void;
}

const iconMap: Record<string, any> = {
  Zap,
  Grid,
  Briefcase,
  BarChart,
  MessageSquare,
  ArrowRight,
  DollarSign,
  HelpCircle,
  Clock,
  Image,
  FileText,
  Code,
};

export function SectionLibrary({ open, onClose, onSelect }: SectionLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const sectionTypes = getAvailableSectionTypes();

  const filteredSections = sectionTypes.filter((type) => {
    const schema = SECTION_SCHEMAS[type];
    if (!schema) return false;
    return (
      schema.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schema.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSelect = (sectionType: string) => {
    const schema = SECTION_SCHEMAS[sectionType];
    if (schema && schema.layout_variants.length > 0) {
      // Select first layout variant by default
      onSelect(sectionType, schema.layout_variants[0]);
    } else {
      onSelect(sectionType);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Section Library</DialogTitle>
          <DialogDescription>
            Choose a section type to add to your landing page
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-2 gap-4">
              {filteredSections.map((type) => {
                const schema = SECTION_SCHEMAS[type];
                if (!schema) return null;

                const IconComponent = schema.icon ? iconMap[schema.icon] || FileText : FileText;

                return (
                  <Card
                    key={type}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelect(type)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{schema.display_name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {schema.layout_variants.length} layout{schema.layout_variants.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{schema.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
