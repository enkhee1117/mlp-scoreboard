import { getProfile } from '@/lib/auth';
import { ChatRoom } from './ChatRoom';
import { createClient } from '@/lib/supabase/server';

export default async function ChatPage() {
  const me = await getProfile();
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('channel', 'general')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url');

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <header className="card p-5">
        <h1 className="font-display text-2xl font-bold">Tournament Lobby Chat</h1>
        <p className="mt-1 text-sm text-text-muted">
          Realtime match talk and tournament announcements.
        </p>
      </header>
      <div className="card h-[70vh] p-0">
        <ChatRoom
          meId={me?.id ?? null}
          meName={me?.display_name ?? 'Guest'}
          initialMessages={(messages ?? []).reverse()}
          profileMap={profileMap}
        />
      </div>
    </div>
  );
}
