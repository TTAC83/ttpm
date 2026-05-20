import { AlertTriangle } from 'lucide-react';
import { MissingItem } from '@/pages/app/solutions/hooks/useTabCompleteness';

interface MissingInfoBannerProps {
  items: MissingItem[];
  title?: string;
}

export const MissingInfoBanner = ({ items, title }: MissingInfoBannerProps) => {
  if (!items || items.length === 0) return null;

  const heading = title || `Missing info — ${items.length} ${items.length === 1 ? 'item' : 'items'} needed to complete this tab`;

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{heading}</p>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-foreground/80">
            {items.map(item => (
              <li key={item.key} className="flex items-baseline gap-2">
                <span className="text-destructive">•</span>
                <span>
                  {item.label}
                  {typeof item.count === 'number' && (
                    <span className="ml-1 text-muted-foreground">({item.count})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
