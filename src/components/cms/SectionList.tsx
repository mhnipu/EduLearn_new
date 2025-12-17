import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PageSection {
  id: string;
  section_type: string;
  title: string | null;
  order_index: number;
  is_active: boolean;
  is_locked?: boolean;
}

interface SectionListProps {
  sections: PageSection[];
  onReorder: (newOrder: PageSection[]) => Promise<void>;
  onEdit: (section: PageSection) => void;
  onDelete: (sectionId: string) => void;
  onToggleActive: (section: PageSection) => void;
  onToggleLock?: (section: PageSection) => void;
  onDuplicate?: (section: PageSection) => void;
  renderSectionActions?: (section: PageSection) => React.ReactNode;
}

function SortableSectionItem({
  section,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleLock,
  onDuplicate,
  renderSectionActions,
}: {
  section: PageSection;
  onEdit: (section: PageSection) => void;
  onDelete: (sectionId: string) => void;
  onToggleActive: (section: PageSection) => void;
  onToggleLock?: (section: PageSection) => void;
  onDuplicate?: (section: PageSection) => void;
  renderSectionActions?: (section: PageSection) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!section.is_active ? 'opacity-60' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  {section.title || 'Untitled Section'}
                  <Badge variant={section.is_active ? 'default' : 'secondary'}>
                    {section.section_type}
                  </Badge>
                  {section.is_locked && (
                    <Badge variant="outline" className="gap-1">
                      🔒 Locked
                    </Badge>
                  )}
                  {!section.is_active && (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {renderSectionActions ? (
                renderSectionActions(section)
              ) : (
                <>
                  {onToggleLock && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleLock(section)}
                      title={section.is_locked ? 'Unlock' : 'Lock'}
                    >
                      {section.is_locked ? '🔒' : '🔓'}
                    </Button>
                  )}
                  {onDuplicate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDuplicate(section)}
                      title="Duplicate"
                    >
                      📋
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleActive(section)}
                    title={section.is_active ? 'Hide' : 'Show'}
                  >
                    {section.is_active ? '👁️' : '👁️‍🗨️'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(section)}
                    disabled={section.is_locked}
                    title="Edit"
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(section.id)}
                    title="Delete"
                  >
                    🗑️
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export function SectionList({
  sections,
  onReorder,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleLock,
  onDuplicate,
  renderSectionActions,
}: SectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newOrder = arrayMove(sections, oldIndex, newIndex);
      
      // Update order_index for all sections
      const updatedSections = newOrder.map((section, index) => ({
        ...section,
        order_index: index,
      }));

      await onReorder(updatedSections);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No sections found. Add a section to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            sections.map((section) => (
              <SortableSectionItem
                key={section.id}
                section={section}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                onToggleLock={onToggleLock}
                onDuplicate={onDuplicate}
                renderSectionActions={renderSectionActions}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
