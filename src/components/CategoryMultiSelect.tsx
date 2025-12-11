import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CategoryMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowCreate?: boolean;
  placeholder?: string;
}

export function CategoryMultiSelect({
  selectedIds,
  onChange,
  allowCreate = false,
  placeholder = 'Select categories...',
}: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📚');
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const handleSelect = (categoryId: string) => {
    const isSelected = selectedIds.includes(categoryId);
    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedIds, categoryId]);
    }
  };

  const handleRemove = (categoryId: string) => {
    onChange(selectedIds.filter((id) => id !== categoryId));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: newCategoryName.trim(),
        icon: newCategoryIcon || '📚',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to create category', variant: 'destructive' });
      return;
    }

    if (data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      onChange([...selectedIds, data.id]);
      toast({ title: 'Category created!' });
    }

    setNewCategoryName('');
    setNewCategoryIcon('📚');
    setCreateDialogOpen(false);
  };

  const selectedCategories = categories.filter((cat) => selectedIds.includes(cat.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => handleSelect(category.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedIds.includes(category.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          
          {allowCreate && (
            <div className="border-t p-2">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Create new category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name</Label>
                      <Input
                        id="name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="icon">Icon (emoji)</Label>
                      <Input
                        id="icon"
                        value={newCategoryIcon}
                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                        placeholder="📚"
                        className="w-20"
                      />
                    </div>
                    <Button onClick={handleCreateCategory} className="w-full">
                      Create Category
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map((category) => (
            <Badge key={category.id} variant="secondary" className="gap-1">
              <span>{category.icon}</span>
              {category.name}
              <button
                type="button"
                onClick={() => handleRemove(category.id)}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple display component for showing categories
interface CategoryBadgesProps {
  categoryIds: string[];
  categories: Category[];
  maxDisplay?: number;
}

export function CategoryBadges({ categoryIds, categories, maxDisplay = 3 }: CategoryBadgesProps) {
  const displayCategories = categories.filter((cat) => categoryIds.includes(cat.id));
  const visibleCategories = displayCategories.slice(0, maxDisplay);
  const remainingCount = displayCategories.length - maxDisplay;

  if (displayCategories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {visibleCategories.map((category) => (
        <Badge key={category.id} variant="outline" className="text-xs">
          <span className="mr-1">{category.icon}</span>
          {category.name}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}