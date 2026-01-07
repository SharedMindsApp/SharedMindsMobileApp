import { supabase, Member } from './supabase';

export type Household = {
  id: string;
  name: string;
  plan: 'free' | 'premium';
  billing_owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: string;
  space_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'member';
  status: 'pending' | 'active' | 'left';
  invite_token: string | null;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
};

export type CreateMemberInput = {
  household_id: string;
  user_id: string | null;
  name: string;
  age?: number;
  role: string;
};

export type UpdateMemberInput = {
  name?: string;
  age?: number;
  role?: string;
};

export async function createHousehold(name: string, spaceType: 'personal' | 'shared' = 'shared'): Promise<Household> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profile not found. Please complete signup first.');
  }

  const { data, error } = await supabase
    .from('spaces')
    .insert({ name, billing_owner_id: profile.id, space_type: spaceType })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('No data returned from household creation');

  const { error: memberError } = await supabase
    .from('space_members')
    .insert({
      space_id: data.id,
      user_id: profile.id,
      email: userData.user.email || '',
      role: 'owner',
      status: 'active',
      accepted_at: new Date().toISOString(),
    });

  if (memberError) throw memberError;

  return data;
}

export async function getUserHousehold(): Promise<Household | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: householdMember } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!householdMember) {
    const { data: oldMember } = await supabase
      .from('members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!oldMember) return null;

    const { data: household } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', oldMember.household_id)
      .maybeSingle();

    return household;
  }

  const { data: household } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', householdMember.space_id)
    .maybeSingle();

  return household;
}

export async function createMember(input: CreateMemberInput): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMember(memberId: string, input: UpdateMemberInput): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update(input)
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getHouseholdMembers(householdId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function deleteMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function getCurrentMembership(householdId: string): Promise<HouseholdMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: membership } = await supabase
    .from('space_members')
    .select('*')
    .eq('space_id', householdId)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();

  return membership;
}

export async function isBillingOwner(householdId: string): Promise<boolean> {
  const membership = await getCurrentMembership(householdId);
  return membership?.role === 'owner';
}

export async function getHouseholdMembersList(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('space_members')
    .select('*')
    .eq('space_id', householdId)
    .in('status', ['pending', 'active'])
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function inviteHouseholdMember(householdId: string, email: string): Promise<{ inviteUrl: string }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-household-member`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ householdId, email }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to invite member');
  }

  return result;
}

export async function acceptHouseholdInvite(inviteToken: string): Promise<{ household: Household }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-household-invite`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inviteToken }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to accept invite');
  }

  return result;
}

export async function removeHouseholdMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function getPersonalSpace(): Promise<Household | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.space_type', 'personal')
    .limit(1)
    .maybeSingle();

  if (!memberships || !memberships.spaces) return null;

  return memberships.spaces as unknown as Household;
}

export async function getSharedSpaces(): Promise<Household[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return [];

  const { data: memberships } = await supabase
    .from('space_members')
    .select('space_id, spaces!inner(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('spaces.space_type', 'shared')
    .order('created_at', { ascending: false });

  if (!memberships || memberships.length === 0) return [];

  return memberships
    .filter(m => m.spaces)
    .map(m => m.spaces as unknown as Household);
}

export async function getSpaceById(spaceId: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', spaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
