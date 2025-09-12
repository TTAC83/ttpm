import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useExpenseAccess = () => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data, error } = await supabase.rpc('has_expense_access');
        
        if (error) {
          console.error('Error checking expense access:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data || false);
        }
      } catch (error) {
        console.error('Error checking expense access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  return { hasAccess, loading };
};