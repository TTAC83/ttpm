/**
 * Feature flag for Gantt chart rebuild
 * 
 * Values:
 * - 'legacy': Use old Gantt implementation
 * - 'alpha': New Gantt for internal testing only
 * - 'beta': 50% rollout (A/B testing)
 * - 'production': Full rollout of new Gantt
 */
export type GanttFeatureFlag = 'legacy' | 'alpha' | 'beta' | 'production';

export const GANTT_FEATURE_FLAG: GanttFeatureFlag = 'legacy';

export function useNewGantt(): boolean {
  if (GANTT_FEATURE_FLAG === 'production') return true;
  if (GANTT_FEATURE_FLAG === 'beta') {
    // 50% rollout - use user ID hash for consistent experience
    const userId = localStorage.getItem('gantt_beta_user_id');
    if (!userId) {
      const id = Math.random().toString(36).substring(7);
      localStorage.setItem('gantt_beta_user_id', id);
      return parseInt(id, 36) % 2 === 0;
    }
    return parseInt(userId, 36) % 2 === 0;
  }
  if (GANTT_FEATURE_FLAG === 'alpha') {
    // Alpha: check if user has alpha flag in localStorage
    return localStorage.getItem('gantt_alpha_enabled') === 'true';
  }
  return false; // legacy
}
