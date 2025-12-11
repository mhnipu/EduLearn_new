import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Shield, Plus, Eye, Edit, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Permission {
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface Module {
  id: string;
  name: string;
}

interface UserPermissionData {
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  roles: string[];
  permissions: Record<string, Permission>;
  permission_count: number;
}

interface MobilePermissionCardProps {
  user: UserPermissionData;
  modules: Module[];
  onPermissionChange?: (userId: string, moduleId: string, permission: keyof Permission, value: boolean) => void;
  roleColors: Record<string, { bg: string; text: string; border: string }>;
}

const permissionIcons = {
  can_create: Plus,
  can_read: Eye,
  can_update: Edit,
  can_delete: Trash2,
};

const permissionLabels = {
  can_create: 'Create',
  can_read: 'Read',
  can_update: 'Update',
  can_delete: 'Delete',
};

export function MobilePermissionCard({ 
  user, 
  modules, 
  onPermissionChange,
  roleColors 
}: MobilePermissionCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getPermissionCount = (perms: Permission) => {
    return [perms.can_create, perms.can_read, perms.can_update, perms.can_delete].filter(Boolean).length;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.user_name}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.user_name}</p>
                
                {/* Roles */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.roles.length > 0 ? (
                    user.roles.slice(0, 2).map(r => (
                      <Badge 
                        key={r} 
                        className={cn(
                          roleColors[r]?.bg,
                          roleColors[r]?.text,
                          'border',
                          roleColors[r]?.border,
                          'text-[10px] py-0 px-1.5 h-5'
                        )}
                      >
                        {r.replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                      No Role
                    </Badge>
                  )}
                  {user.roles.length > 2 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                      +{user.roles.length - 2}
                    </Badge>
                  )}
                </div>
                
                {/* Permission count */}
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {user.permission_count} permissions granted
                </div>
              </div>
              
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-0 border-t">
            <div className="divide-y">
              {modules.map((module) => {
                const perms = user.permissions[module.id] || {
                  can_create: false,
                  can_read: false,
                  can_update: false,
                  can_delete: false,
                };
                const permCount = getPermissionCount(perms);

                return (
                  <div key={module.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{module.name}</span>
                        <Badge 
                          variant={permCount === 4 ? 'default' : permCount === 0 ? 'outline' : 'secondary'}
                          className="text-[10px] py-0 px-1.5 h-5"
                        >
                          {permCount}/4
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {(Object.keys(permissionIcons) as Array<keyof typeof permissionIcons>).map((perm) => {
                        const Icon = permissionIcons[perm];
                        const isGranted = perms[perm];
                        
                        return (
                          <div 
                            key={perm}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg transition-colors",
                              isGranted ? "bg-primary/10" : "bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn(
                                "h-4 w-4",
                                isGranted ? "text-primary" : "text-muted-foreground"
                              )} />
                              <span className={cn(
                                "text-sm",
                                isGranted ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {permissionLabels[perm]}
                              </span>
                            </div>
                            <Switch
                              checked={isGranted}
                              onCheckedChange={(checked) => {
                                onPermissionChange?.(user.user_id, module.id, perm, checked);
                              }}
                              className="scale-90"
                            />
                          </div>
                        );
                      })}
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
