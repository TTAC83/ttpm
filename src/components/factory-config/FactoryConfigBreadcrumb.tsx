import React from 'react';
import { ChevronRight, Globe } from 'lucide-react';
import { BreadcrumbItem, DrillLevel, Factory, FactoryGroup } from './hooks/useFactoryConfig';

interface Props {
  breadcrumbs: BreadcrumbItem[];
  currentLevel: DrillLevel;
  onNavigate: (level: DrillLevel, factory?: Factory, group?: FactoryGroup) => void;
  selectedFactory?: Factory | null;
}

export const FactoryConfigBreadcrumb: React.FC<Props> = ({ breadcrumbs, currentLevel, onNavigate, selectedFactory }) => {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {breadcrumbs.map((crumb, i) => {
        const isLast = i === breadcrumbs.length - 1;
        const isClickable = !isLast;

        return (
          <React.Fragment key={`${crumb.level}-${crumb.id || 'root'}`}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <button
              onClick={() => {
                if (!isClickable) return;
                if (crumb.level === 'portal') onNavigate('portal');
                if (crumb.level === 'factory') onNavigate('factory', selectedFactory || undefined);
              }}
              disabled={!isClickable}
              className={`flex items-center gap-1 truncate max-w-48 ${
                isClickable
                  ? 'hover:text-foreground cursor-pointer underline-offset-2 hover:underline'
                  : 'text-foreground font-medium cursor-default'
              }`}
            >
              {i === 0 && <Globe className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{crumb.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
