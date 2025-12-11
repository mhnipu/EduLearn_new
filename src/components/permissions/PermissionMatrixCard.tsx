import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Shield, ChevronDown, Plus, Eye, Edit, Trash2 } from 'lucide-react';

type Module = {
  id: string;
  name: string;
  description: string | null;
};

type PermissionMatrix = {
  user_id: string;
  user_name: string;
  email?: string;
  avatar_url?: string | null;
  roles: string[];
  created_at: string;
  permissions: Record<string, {
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
  }>;
  permission_count: number;
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  admin: { bg: 'bg-chart-1/10', text: 'text-chart-1', border: 'border-chart-1/30' },
  teacher: { bg: 'bg-chart-2/10', text: 'text-chart-2', border: 'border-chart-2/30' },
  student: { bg: 'bg-chart-3/10', text: 'text-chart-3', border: 'border-chart-3/30' },
  guardian: { bg: 'bg-chart-4/10', text: 'text-chart-4', border: 'border-chart-4/30' },
};

interface PermissionMatrixCardProps {
  userRow: PermissionMatrix;
  modules: Module[];
  matrixModuleFilter: string;
  onPermissionToggle: (userId: string, moduleId: string, field: 'can_create' | 'can_read' | 'can_update' | 'can_delete', value: boolean) => void;
}

export function PermissionMatrixCard({ 
  userRow, 
  modules, 
  matrixModuleFilter,
  onPermissionToggle 
}: PermissionMatrixCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayModules = matrixModuleFilter === 'all' ? modules : modules.filter(m => m.id === matrixModuleFilter);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
            <div className="flex items-center gap-3">
              {userRow.avatar_url ? (
                <img 
                  src={userRow.avatar_url} 
                  alt={userRow.user_name}
                  className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-2 ring-border">
                  <span className="text-lg font-semibold text-primary">
                    {userRow.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{userRow.user_name}</p>
                
                <div className="flex flex-wrap gap-1 mt-1">
                  {userRow.roles.length > 0 ? (
                    userRow.roles.slice(0, 2).map(r => (
                      <Badge 
                        key={r} 
                        className={`${ROLE_COLORS[r]?.bg} ${ROLE_COLORS[r]?.text} border ${ROLE_COLORS[r]?.border} text-[10px] py-0 px-1.5 h-5`}
                      >
                        {r.replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                      No Role
                    </Badge>
                  )}
                  {userRow.roles.length > 2 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                      +{userRow.roles.length - 2}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {userRow.permission_count} permissions
                </div>
              </div>
              
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="border-t p-0">
            <div className="divide-y">
              {displayModules.map(m => {
                const perms = userRow.permissions[m.id] || { can_create: false, can_read: false, can_update: false, can_delete: false };
                const permCount = [perms.can_create, perms.can_read, perms.can_update, perms.can_delete].filter(Boolean).length;
                
                return (
                  <div key={m.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-medium">
                          {m.name}
                        </Badge>
                        <span className={`text-xs ${permCount === 4 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {permCount}/4
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Create</span>
                        </div>
                        <Switch 
                          checked={perms.can_create}
                          onCheckedChange={(checked) => onPermissionToggle(userRow.user_id, m.id, 'can_create', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Read</span>
                        </div>
                        <Switch 
                          checked={perms.can_read}
                          onCheckedChange={(checked) => onPermissionToggle(userRow.user_id, m.id, 'can_read', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Update</span>
                        </div>
                        <Switch 
                          checked={perms.can_update}
                          onCheckedChange={(checked) => onPermissionToggle(userRow.user_id, m.id, 'can_update', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Delete</span>
                        </div>
                        <Switch 
                          checked={perms.can_delete}
                          onCheckedChange={(checked) => onPermissionToggle(userRow.user_id, m.id, 'can_delete', checked)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
