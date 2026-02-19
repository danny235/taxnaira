import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import OnboardingForm from '@/components/profile/OnboardingForm';
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.TaxProfile.filter({ user_id: user?.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user?.id, status: 'active' });
      return subs[0] || { plan: 'free' };
    },
    enabled: !!user?.id
  });

  if (loadingUser || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
          <p className="mt-4 text-slate-500">Loading TaxPilot...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if profile is not complete
  if (user && (!profile || !profile.profile_complete)) {
    return (
      <OnboardingForm 
        userId={user.id} 
        onComplete={() => refetchProfile()} 
      />
    );
  }

  return (
    <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-900", theme === 'dark' && 'dark')}>
      <style>{`
        :root {
          --background: 248 250 252;
          --foreground: 15 23 42;
        }
        .dark {
          --background: 15 23 42;
          --foreground: 248 250 252;
        }
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div className="hidden lg:block print:hidden">
        <Sidebar
          currentPage={currentPageName}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          subscription={subscription}
          isAdmin={user?.role === 'admin'}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 lg:hidden transform transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          currentPage={currentPageName}
          collapsed={false}
          onToggle={() => setMobileMenuOpen(false)}
          subscription={subscription}
          isAdmin={user?.role === 'admin'}
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        <div className="print:hidden">
          <Header
            user={user}
            profile={profile}
            subscription={subscription}
            theme={theme}
            onThemeToggle={toggleTheme}
            onMenuToggle={() => setMobileMenuOpen(true)}
          />
        </div>
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}