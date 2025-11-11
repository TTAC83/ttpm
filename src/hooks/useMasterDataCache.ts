import { useQuery } from "@tanstack/react-query";
import { hardwareCatalog } from "@/lib/hardwareCatalogService";
import { supabase } from "@/integrations/supabase/client";

export function useMasterDataCache() {
  const camerasQuery = useQuery({
    queryKey: ['hardware', 'cameras'],
    queryFn: () => hardwareCatalog.getCameras(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const lensesQuery = useQuery({
    queryKey: ['hardware', 'lenses'],
    queryFn: () => hardwareCatalog.getLenses(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const lightsQuery = useQuery({
    queryKey: ['hardware', 'lights'],
    queryFn: () => hardwareCatalog.getLights(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const plcsQuery = useQuery({
    queryKey: ['hardware', 'plcs'],
    queryFn: () => hardwareCatalog.getPlcs(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const hmisQuery = useQuery({
    queryKey: ['hardware', 'hmis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hardware_master')
        .select('id, sku_no, product_name, hardware_type, description')
        .eq('hardware_type', 'HMI')
        .order('product_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const visionUseCasesQuery = useQuery({
    queryKey: ['vision-use-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vision_use_cases')
        .select('id, name, description, category')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    cameras: camerasQuery.data || [],
    lenses: lensesQuery.data || [],
    lights: lightsQuery.data || [],
    plcs: plcsQuery.data || [],
    hmis: hmisQuery.data || [],
    visionUseCases: visionUseCasesQuery.data || [],
    isLoading: camerasQuery.isLoading || lensesQuery.isLoading || lightsQuery.isLoading || 
               plcsQuery.isLoading || hmisQuery.isLoading || visionUseCasesQuery.isLoading,
    isError: camerasQuery.isError || lensesQuery.isError || lightsQuery.isError || 
             plcsQuery.isError || hmisQuery.isError || visionUseCasesQuery.isError,
  };
}
