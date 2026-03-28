import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Layout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        redirect('/login');
    }

    // Check if user is verified in public.users
    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile && !profile.is_verified) {
        redirect(`/verify?email=${encodeURIComponent(profile.email)}`);
    }

    return <AppLayout user={user} profile={profile}>{children}</AppLayout>
}
