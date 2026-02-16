import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Factory as FactoryIcon, Trash2, ChevronRight, Pencil } from 'lucide-react';
import { Factory, Portal, Shift, FactoryGroup, GroupLine } from './hooks/useFactoryConfig';
import { Badge } from '@/components/ui/badge';

interface Props {
  portal: Portal | null;
  factories: Factory[];
  shifts: Shift[];
  groups: FactoryGroup[];
  lines: GroupLine[];
  onSavePortalUrl: (url: string) => Promise<void>;
  onAddFactory: (name: string) => Promise<void>;
  onDeleteFactory: (id: string) => Promise<void>;
  onSelectFactory: (factory: Factory) => void;
}

export const PortalLevel: React.FC<Props> = ({
  portal, factories, shifts, groups, lines,
  onSavePortalUrl, onAddFactory, onDeleteFactory, onSelectFactory,
}) => {
  const [portalUrl, setPortalUrl] = useState(portal?.url || '');
  const [urlEditing, setUrlEditing] = useState(!portal);
  const [newFactoryName, setNewFactoryName] = useState('');
  const [addingFactory, setAddingFactory] = useState(false);

  useEffect(() => {
    setPortalUrl(portal?.url || '');
    setUrlEditing(!portal);
  }, [portal]);

  const handleSaveUrl = async () => {
    await onSavePortalUrl(portalUrl);
    setUrlEditing(false);
  };

  const handleAddFactory = async () => {
    if (!newFactoryName.trim()) return;
    await onAddFactory(newFactoryName.trim());
    setNewFactoryName('');
    setAddingFactory(false);
  };

  const getFactoryStats = (factoryId: string) => {
    const factoryGroups = groups.filter(g => g.factory_id === factoryId);
    const groupIds = factoryGroups.map(g => g.id);
    const factoryLines = lines.filter(l => groupIds.includes(l.group_id));
    const factoryShifts = shifts.filter(s => s.factory_id === factoryId);
    return { groups: factoryGroups.length, lines: factoryLines.length, shifts: factoryShifts.length };
  };

  return (
    <div className="space-y-6">
      {/* Portal URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Portal URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="portal-url" className="text-xs text-muted-foreground">Customer portal address</Label>
              <Input
                id="portal-url"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                placeholder="customer.thingtrax.com"
                disabled={!urlEditing}
              />
            </div>
            {urlEditing ? (
              <Button onClick={handleSaveUrl} size="sm">Save</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setUrlEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Factories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Factories</h3>
          {!addingFactory && (
            <Button variant="outline" size="sm" onClick={() => setAddingFactory(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Factory
            </Button>
          )}
        </div>

        {addingFactory && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Factory Name *</Label>
                  <Input
                    value={newFactoryName}
                    onChange={(e) => setNewFactoryName(e.target.value)}
                    placeholder="e.g. Main Production Site"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFactory()}
                  />
                </div>
                <Button size="sm" onClick={handleAddFactory} disabled={!newFactoryName.trim()}>Add</Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddingFactory(false); setNewFactoryName(''); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {factories.length === 0 && !addingFactory && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <FactoryIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No factories added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add a factory to start configuring your production setup</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-2">
          {factories.map((factory) => {
            const stats = getFactoryStats(factory.id);
            return (
              <Card
                key={factory.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors group"
                onClick={() => onSelectFactory(factory)}
              >
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FactoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{factory.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">{stats.groups} group{stats.groups !== 1 ? 's' : ''}</Badge>
                        <Badge variant="outline" className="text-xs">{stats.lines} line{stats.lines !== 1 ? 's' : ''}</Badge>
                        {stats.shifts > 0 && <Badge variant="outline" className="text-xs">{stats.shifts} shift{stats.shifts !== 1 ? 's' : ''}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); onDeleteFactory(factory.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Organogram */}
      {factories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Site Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-0">
              {/* Portal node */}
              <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                {portal?.url || 'Portal'}
              </div>
              {factories.length > 0 && (
                <div className="w-px h-4 bg-border" />
              )}
              {/* Factories row */}
              <div className="relative flex justify-center w-full">
                {factories.length > 1 && (
                  <div
                    className="absolute top-0 h-px bg-border"
                    style={{
                      left: `${50 / factories.length}%`,
                      right: `${50 / factories.length}%`,
                    }}
                  />
                )}
                <div className="flex gap-8 flex-wrap justify-center">
                  {factories.map((factory) => {
                    const factoryGroups = groups.filter(g => g.factory_id === factory.id);
                    return (
                      <div key={factory.id} className="flex flex-col items-center gap-0">
                        {factories.length > 1 && <div className="w-px h-4 bg-border" />}
                        <div className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium border">
                          {factory.name}
                        </div>
                        {factoryGroups.length > 0 && (
                          <>
                            <div className="w-px h-3 bg-border" />
                            <div className="flex gap-4 flex-wrap justify-center relative">
                              {factoryGroups.length > 1 && (
                                <div
                                  className="absolute top-0 h-px bg-border"
                                  style={{
                                    left: `${100 / (factoryGroups.length * 2)}%`,
                                    right: `${100 / (factoryGroups.length * 2)}%`,
                                  }}
                                />
                              )}
                              {factoryGroups.map((group) => {
                                const groupLines = lines.filter(l => l.group_id === group.id);
                                return (
                                  <div key={group.id} className="flex flex-col items-center gap-0">
                                    {factoryGroups.length > 1 && <div className="w-px h-3 bg-border" />}
                                    <div className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs border">
                                      {group.name}
                                    </div>
                                    {groupLines.length > 0 && (
                                      <>
                                        <div className="w-px h-2.5 bg-border" />
                                        <div className="flex gap-2 flex-wrap justify-center">
                                          {groupLines.map((line) => (
                                            <div
                                              key={line.id}
                                              className="px-2 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground border"
                                            >
                                              {line.name}
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
