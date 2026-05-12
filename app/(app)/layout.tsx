import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, settings')
    .eq('id', user.id)
    .single()

  return (
    <AppShell profile={profile as Profile | null} userId={user.id}>
      {children}
    </AppShell>
  )
}
