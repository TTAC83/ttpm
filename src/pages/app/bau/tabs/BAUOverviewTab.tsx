import { OverviewTab } from '@/components/shared/OverviewTab';
import { BAUCustomer } from '@/lib/bauService';

interface BAUOverviewTabProps {
  customer: BAUCustomer;
  onUpdate: () => void;
}

export const BAUOverviewTab = ({ customer, onUpdate }: BAUOverviewTabProps) => {
  return <OverviewTab data={customer} onUpdate={onUpdate} type="bau" />;
};