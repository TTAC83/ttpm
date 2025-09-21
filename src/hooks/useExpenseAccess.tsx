import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useExpenseAccess = () => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        console.log('Checking expense access...');
        const { data, error } = await supabase.rpc('has_expense_access');
        
        if (error) {
          console.error('Error checking expense access:', error);
          setHasAccess(false);
        } else {
          console.log('Expense access result:', data);
          setHasAccess(data || false);
        }
      } catch (error) {
        console.error('Error checking expense access:', error);
        setHasAccess(false);
      } finally {
        console.log('Expense access check completed');
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  return { hasAccess, loading };
};