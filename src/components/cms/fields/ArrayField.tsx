import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageField } from './ImageField';

interface ArrayFieldProps {
  label: string;
  value: any[];
  onChange: (value: any[]) => void;
  itemSchema: Record<string, string>; // e.g., { icon: 'text', title: 'text', description: 'textarea' }
  required?: boolean;
  disabled?: boolean;
}

export function ArrayField({
  label,
  value,
  onChange,
  itemSchema,
  required,
  disabled,
}: ArrayFieldProps) {
  const addItem = () => {
    const newItem: any = {};
    Object.keys(itemSchema).forEach((key) => {
      if (itemSchema[key] === 'array') {
        newItem[key] = [];
      } else {
        newItem[key] = '';
      }
    });
    onChange([...value, newItem]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, fieldValue: any) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: fieldValue };
    onChange(updated);
  };

  const renderField = (
    item: any,
    itemIndex: number,
    fieldName: string,
    fieldType: string
  ) => {
    const fieldValue = item[fieldName] || '';

    switch (fieldType) {
      case 'text':
        return (
          <Input
            value={fieldValue}
            onChange={(e) => updateItem(itemIndex, fieldName, e.target.value)}
            placeholder={`Enter ${fieldName}`}
            disabled={disabled}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={fieldValue}
            onChange={(e) => updateItem(itemIndex, fieldName, e.target.value)}
            placeholder={`Enter ${fieldName}`}
            rows={2}
            disabled={disabled}
          />
        );
      case 'image':
        return (
          <ImageField
            label=""
            value={fieldValue}
            onChange={(val) => updateItem(itemIndex, fieldName, val)}
            disabled={disabled}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={fieldValue}
            onChange={(e) => updateItem(itemIndex, fieldName, parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${fieldName}`}
            disabled={disabled}
          />
        );
      case 'array':
        // Nested array (e.g., features in pricing plans)
        return (
          <ArrayField
            label=""
            value={fieldValue || []}
            onChange={(val) => updateItem(itemIndex, fieldName, val)}
            itemSchema={{ item: 'text' }} // Default nested schema
            disabled={disabled}
          />
        );
      default:
        return (
          <Input
            value={fieldValue}
            onChange={(e) => updateItem(itemIndex, fieldName, e.target.value)}
            placeholder={`Enter ${fieldName}`}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No items. Click "Add Item" to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    Item {index + 1}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {Object.entries(itemSchema).map(([fieldName, fieldType]) => (
                  <div key={fieldName} className="space-y-1">
                    <Label className="text-xs text-muted-foreground capitalize">
                      {fieldName.replace(/_/g, ' ')}
                    </Label>
                    {renderField(item, index, fieldName, fieldType)}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
