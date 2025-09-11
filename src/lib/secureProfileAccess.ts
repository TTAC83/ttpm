/**
 * Secure Profile Access Utilities
 * 
 * This module provides secure ways to access profile data while respecting
 * the enhanced Row Level Security (RLS) policies.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SafeProfile {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  company_id: string | null;
  role: string | null;
  is_internal: boolean;
}

/**
 * Get safe profile information for users in shared projects
 * Uses the secure database function that only exposes safe fields
 */
export async function getSafeProfilesForProject(projectId: string) {
  // Get project members using the secure function approach
  const { data: projectMembers, error: membersError } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  if (membersError || !projectMembers) {
    console.error('Error fetching project members:', membersError);
    return [];
  }

  // Use the secure function to get only safe profile information
  const profiles: SafeProfile[] = [];
  
  for (const member of projectMembers) {
    const { data, error } = await supabase
      .rpc('get_safe_profile_info', { target_user_id: member.user_id });

    if (error) {
      console.error('Error fetching safe profile for user:', member.user_id, error);
      continue;
    }

    if (data && data.length > 0) {
      profiles.push({
        user_id: data[0].user_id,
        name: data[0].name,
        avatar_url: data[0].avatar_url,
        job_title: null, // Intentionally excluded for security
        company_id: null, // Intentionally excluded for security  
        role: data[0].role,
        is_internal: data[0].is_internal
      });
    }
  }

  return profiles;
}

/**
 * Get secure profile data with field-level access control
 * This function respects the security policy and only returns allowed fields
 */
export async function getSecureProfile(userId: string): Promise<Partial<SafeProfile> | null> {
  const currentUser = (await supabase.auth.getUser()).data.user;
  if (!currentUser) return null;

  // Use the secure database function which implements proper field-level security
  const { data, error } = await supabase
    .rpc('get_safe_profile_info', { target_user_id: userId });

  if (error) {
    console.error('Error fetching secure profile:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get the current user's full profile (including sensitive data like phone)
 */
export async function getCurrentUserProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (error) {
    console.error('Error fetching current user profile:', error);
    return null;
  }

  return data;
}

/**
 * Security audit function to check if profile access is working correctly
 */
export async function auditProfileAccess() {
  try {
    // Try to access another user's profile (should fail or return limited data)
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*');

    const currentUser = (await supabase.auth.getUser()).data.user;
    
    if (allProfiles && currentUser) {
      const otherUserProfiles = allProfiles.filter(p => p.user_id !== currentUser.id);
      
      if (otherUserProfiles.length > 0) {
        console.warn('Security Alert: Access to other users\' profiles detected');
        return {
          status: 'warning',
          message: 'Other user profiles are accessible',
          profileCount: otherUserProfiles.length
        };
      }
    }

    return {
      status: 'secure',
      message: 'Profile access is properly restricted'
    };
    
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to audit profile access',
      error
    };
  }
}