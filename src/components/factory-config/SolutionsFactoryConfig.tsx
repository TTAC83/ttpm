import React from 'react';
import { Loader2 } from 'lucide-react';
import { useFactoryConfig } from './hooks/useFactoryConfig';
import { FactoryConfigBreadcrumb } from './FactoryConfigBreadcrumb';
import { PortalLevel } from './PortalLevel';
import { FactoryLevel } from './FactoryLevel';
import { GroupLevel } from './GroupLevel';
import { FactoryConfigGaps } from './FactoryConfigGaps';

interface Props {
  projectId: string;
}

export const SolutionsFactoryConfig: React.FC<Props> = ({ projectId }) => {
  const {
    loading, portal, factories, shifts, groups, lines,
    currentLevel, selectedFactory, selectedGroup, breadcrumbs,
    savePortalUrl, addFactory, updateFactory, deleteFactory,
    addShift, deleteShift,
    addGroup, updateGroup, deleteGroup,
    addLine, updateLine, deleteLine,
    navigateTo,
  } = useFactoryConfig(projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <FactoryConfigGaps portal={portal} factories={factories} shifts={shifts} groups={groups} lines={lines} />

      {currentLevel !== 'portal' && (
        <FactoryConfigBreadcrumb
          breadcrumbs={breadcrumbs}
          currentLevel={currentLevel}
          onNavigate={navigateTo}
          selectedFactory={selectedFactory}
        />
      )}

      {currentLevel === 'portal' && (
        <PortalLevel
          portal={portal}
          factories={factories}
          shifts={shifts}
          groups={groups}
          lines={lines}
          onSavePortalUrl={savePortalUrl}
          onAddFactory={addFactory}
          onDeleteFactory={deleteFactory}
          onSelectFactory={(f) => navigateTo('factory', f)}
        />
      )}

      {currentLevel === 'factory' && selectedFactory && (
        <FactoryLevel
          factory={selectedFactory}
          shifts={shifts}
          groups={groups}
          lines={lines}
          onUpdateFactory={updateFactory}
          onAddShift={addShift}
          onDeleteShift={deleteShift}
          onAddGroup={addGroup}
          onDeleteGroup={deleteGroup}
          onSelectGroup={(g) => navigateTo('group', selectedFactory, g)}
        />
      )}

      {currentLevel === 'group' && selectedGroup && (
        <GroupLevel
          group={selectedGroup}
          lines={lines}
          onUpdateGroup={updateGroup}
          onAddLine={addLine}
          onUpdateLine={updateLine}
          onDeleteLine={deleteLine}
        />
      )}
    </div>
  );
};
