import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { AvatarUpload } from '@/components/AvatarUpload';
import { ProfileForm } from './_components/ProfileForm';

export default async function ProfilePage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="card mx-auto mt-12 max-w-xl p-6">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-text-muted">
          <Link href="/login?next=/profile" className="font-semibold text-volt hover:text-volt-hover">
            Sign in
          </Link>{' '}
          to view and edit your TourneyPal profile.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <div className="card">
        <AvatarUpload userId={profile.id} initialUrl={profile.avatar_url} />
        <p className="mt-3 text-xs text-text-muted">
          Role: <span className="text-slate-200">{profile.role}</span>
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
