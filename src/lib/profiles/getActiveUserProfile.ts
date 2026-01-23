/**
 * Active User Profile Resolver
 * 
 * Canonical helper for resolving the current authenticated user's profile.
 * Ensures data integrity by always returning a profile owned by auth.uid().
 * 
 * This is the single source of truth for profile resolution across the app.
 * Use this instead of passing profile IDs from UI context or other sources.
 * 
 * @throws {Error} If user is not authenticated
 * @throws {Error} If no user-owned profile exists
 * @returns {Promise<{ id: string; user_id: string }>} The user's active profile
 */

import { supabase } from '../supabase';

export interface ActiveUserProfile {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
}

/**
 * Get the active profile for the current authenticated user.
 * 
 * This function:
 * - Fetches profiles where profiles.user_id === auth.uid()
 * - Returns the user's own profile (never household/shared profiles)
 * - Throws a clear error if no valid profile exists
 * - Never returns null (fails fast)
 * 
 * @returns {Promise<ActiveUserProfile>} The user's active profile
 * @throws {Error} If user is not authenticated
 * @throws {Error} If no user-owned profile exists
 */
export async function getActiveUserProfile(): Promise<ActiveUserProfile> {
  // 1️⃣ Get authenticated user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('[getActiveUserProfile] Auth error:', {
      error: authError,
      code: authError.message,
    });
    throw new Error('User not authenticated');
  }
  
  if (!authData.user) {
    console.error('[getActiveUserProfile] No user in auth data');
    throw new Error('User not authenticated');
  }
  
  const authUserId = authData.user.id;
  
  // 2️⃣ Fetch user's profile (where user_id matches auth.uid())
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, email')
    .eq('user_id', authUserId)
    .maybeSingle();
  
  if (profileError) {
    console.error('[getActiveUserProfile] Database error fetching profile:', {
      error: profileError,
      authUserId,
      code: profileError.code,
      message: profileError.message,
    });
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }
  
  if (!profile) {
    console.error('[getActiveUserProfile] No profile found for authenticated user:', {
      authUserId,
      possibleCauses: [
        'Profile not created during onboarding',
        'Profile deleted or orphaned',
        'Database inconsistency',
      ],
    });
    throw new Error(
      'Cannot proceed: no user profile found. Please complete your profile setup.'
    );
  }
  
  // 3️⃣ Verify ownership (defensive check - should never fail if RLS is correct)
  if (profile.user_id !== authUserId) {
    console.error('[getActiveUserProfile] Profile ownership mismatch:', {
      profileUserId: profile.user_id,
      authUserId,
      profileId: profile.id,
    });
    throw new Error('Profile ownership verification failed');
  }
  
  // 4️⃣ Return profile
  console.log('[getActiveUserProfile] Resolved active profile:', {
    profileId: profile.id,
    authUserId,
    fullName: profile.full_name,
  });
  
  return {
    id: profile.id,
    user_id: profile.user_id,
    full_name: profile.full_name,
    email: profile.email,
  };
}

/**
 * Get only the profile ID (convenience wrapper)
 * 
 * @returns {Promise<string>} The user's profile ID
 * @throws {Error} If user is not authenticated or no profile exists
 */
export async function getActiveUserProfileId(): Promise<string> {
  const profile = await getActiveUserProfile();
  return profile.id;
}
