'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type CreateInput = {
  name: string;
  format: string;
};

type CreateResult = { id: string; error?: undefined } | { id?: undefined; error: string };

export async function createTournamentClient(input: CreateInput): Promise<CreateResult> {
  if (input.name.length < 3) {
    return { error: 'Tournament name must be at least 3 characters.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Please sign in to create a tournament.' };
  }

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      owner_user_id: user.id,
      name: input.name,
      format: input.format,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'Could not create tournament.' };
  }

  revalidatePath('/tournaments');
  return { id: data.id as string };
}
