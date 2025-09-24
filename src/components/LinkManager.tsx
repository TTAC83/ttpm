import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ExternalLink, GripVertical, Trash2, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface Link {
  id: string;
  name: string;
  url: string;
}

interface LinkManagerProps {
  links: Link[];
  onChange: (links: Link[]) => void;
  maxLinks?: number;
  isEditing?: boolean;
  title?: string;
  className?: string;
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const LinkManager = ({ 
  links, 
  onChange, 
  maxLinks = 20, 
  isEditing = false,
  title = "Links",
  className = ""
}: LinkManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addLink = () => {
    if (links.length >= maxLinks) return;
    
    const newLink: Link = {
      id: crypto.randomUUID(),
      name: '',
      url: ''
    };
    
    onChange([...links, newLink]);
    setEditingId(newLink.id);
  };

  const updateLink = (id: string, updates: Partial<Link>) => {
    onChange(links.map(link => 
      link.id === id ? { ...link, ...updates } : link
    ));
  };

  const removeLink = (id: string) => {
    onChange(links.filter(link => link.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newLinks = [...links];
      const draggedLink = newLinks[draggedIndex];
      newLinks.splice(draggedIndex, 1);
      newLinks.splice(dragOverIndex, 0, draggedLink);
      onChange(newLinks);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const saveLink = (id: string) => {
    const link = links.find(l => l.id === id);
    if (link && link.name.trim() && link.url.trim() && isValidUrl(link.url)) {
      setEditingId(null);
    }
  };

  const cancelEdit = (id: string) => {
    const link = links.find(l => l.id === id);
    if (link && (!link.name.trim() || !link.url.trim())) {
      removeLink(id);
    } else {
      setEditingId(null);
    }
  };

  if (!isEditing && links.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {!isEditing && (
          <div>
            <h4 className="font-medium mb-3">{title}</h4>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-accent hover:text-accent-foreground transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                  <span className="hover:underline">{link.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {isEditing && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{title}</h4>
              <Badge variant="secondary" className="text-xs">
                {links.length}/{maxLinks}
              </Badge>
            </div>

            <div className="space-y-3">
              {links.map((link, index) => (
                <Card 
                  key={link.id}
                  className={`transition-all duration-200 ${
                    dragOverIndex === index ? 'ring-2 ring-accent' : ''
                  }`}
                  draggable={editingId !== link.id}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent className="p-3">
                    {editingId === link.id ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${link.id}`} className="text-xs">Link Name</Label>
                          <Input
                            id={`name-${link.id}`}
                            value={link.name}
                            onChange={(e) => updateLink(link.id, { name: e.target.value })}
                            placeholder="Enter link name..."
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`url-${link.id}`} className="text-xs">URL</Label>
                          <Input
                            id={`url-${link.id}`}
                            value={link.url}
                            onChange={(e) => updateLink(link.id, { url: e.target.value })}
                            placeholder="https://example.com"
                            className="text-sm"
                            type="url"
                          />
                          {link.url && !isValidUrl(link.url) && (
                            <p className="text-xs text-destructive">Please enter a valid URL</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveLink(link.id)}
                            disabled={!link.name.trim() || !link.url.trim() || !isValidUrl(link.url)}
                            className="text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEdit(link.id)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{link.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{link.url}</div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(link.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLink(link.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {links.length < maxLinks && (
                <Button
                  variant="outline"
                  onClick={addLink}
                  className="w-full text-sm"
                  disabled={editingId !== null}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};