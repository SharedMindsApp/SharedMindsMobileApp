import { supabase } from './supabase';

export type Report = {
  id: string;
  household_id: string;
  generated_by: string;
  content: string;
  metadata: {
    member_count: number;
    sections_count: number;
    total_answers: number;
  };
  created_at: string;
};

export async function generateHouseholdReport(): Promise<Report> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-household-report`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate report');
  }

  const data = await response.json();
  return data.report;
}

export async function getHouseholdReports(): Promise<Report[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: member } = await supabase
    .from('members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) {
    throw new Error('Member not found');
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('household_id', member.household_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getLatestReport(): Promise<Report | null> {
  const reports = await getHouseholdReports();
  return reports.length > 0 ? reports[0] : null;
}
