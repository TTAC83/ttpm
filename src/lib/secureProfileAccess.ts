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
 * This uses the safe_profiles view which only exposes non-sensitive fields
 */
export async function getSafeProfilesForProject(projectId: string) {
  // First get the user IDs for project members
  const { data: projectMembers, error: membersError } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  if (membersError || !projectMembers) {
    console.error('Error fetching project members:', membersError);
    return [];
  }

  const userIds = projectMembers.map(member => member.user_id);

  if (userIds.length === 0) {
    return [];
  }

  // Then get safe profiles for those users
  const { data, error } = await supabase
    .from('safe_profiles')
    .select('*')
    .in('user_id', userIds);

  if (error) {
    console.error('Error fetching safe profiles:', error);
    return [];
  }

  return data as SafeProfile[];
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