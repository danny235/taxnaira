import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started with basic features',
    features: [
      'Upload bank statements',
      'View categorized transactions',
      'Basic dashboard',
      'Up to 100 transactions/year'
    ],
    icon: Zap
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 5000,
    description: 'Everything you need for tax preparation',
    features: [
      'Everything in Free',
      'Full tax calculation',
      'PDF report generation',
      'Foreign income conversion',
      'Capital gains tracking',
      'Unlimited transactions',
      'Priority support'
    ],
    popular: true,
    icon: Crown
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 15000,
    description: 'Advanced features for professionals',
    features: [
      'Everything in Pro',
      'AI tax insights',
      'Year-round tax projection',
      'Multi-year comparison',
      'Dedicated account manager',
      'Early access to new features'
    ],
    icon: Star
  }
];

export default function Subscription() {
  const [upgrading, setUpgrading] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user?.id, status: 'active' });
      return subs[0] || { plan: 'free' };
    },
    enabled: !!user?.id
  });

  const handleUpgrade = async (planId) => {
    if (planId === subscription?.plan) return;
    
    setUpgrading(planId);
    
    // In production, this would integrate with a payment gateway
    // For now, we'll simulate the upgrade
    if (subscription?.id) {
      await base44.entities.Subscription.update(subscription.id, {
        plan: planId,
        start_date: new Date().toISOString().split('T')[0]
      });
    } else {
      await base44.entities.Subscription.create({
        user_id: user?.id,
        plan: planId,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0]
      });
    }

    setUpgrading(null);
    refetch();
    queryClient.invalidateQueries(['subscription']);
    toast.success(`Successfully upgraded to ${planId} plan`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Choose Your Plan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Unlock powerful features to manage your taxes efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const Icon = plan.icon;
          
          return (
            <Card 
              key={plan.id}
              className={cn(
                "relative bg-white dark:bg-slate-800 border-0 shadow-sm transition-all hover:shadow-lg",
                plan.popular && "ring-2 ring-emerald-500"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-white">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <div className={cn(
                  "w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center",
                  plan.id === 'free' && "bg-slate-100 dark:bg-slate-700",
                  plan.id === 'pro' && "bg-emerald-100 dark:bg-emerald-900/30",
                  plan.id === 'premium' && "bg-amber-100 dark:bg-amber-900/30"
                )}>
                  <Icon className={cn(
                    "w-6 h-6",
                    plan.id === 'free' && "text-slate-600 dark:text-slate-400",
                    plan.id === 'pro' && "text-emerald-600 dark:text-emerald-400",
                    plan.id === 'premium' && "text-amber-600 dark:text-amber-400"
                  )} />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    ₦{plan.price.toLocaleString()}
                  </span>
                  {plan.price > 0 && <span className="text-slate-500">/year</span>}
                </div>
                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={cn(
                    "w-full",
                    isCurrent && "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
                    !isCurrent && plan.popular && "bg-emerald-600 hover:bg-emerald-700",
                    !isCurrent && !plan.popular && "bg-slate-900 hover:bg-slate-800 dark:bg-slate-600"
                  )}
                  disabled={isCurrent || upgrading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {upgrading === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    plan.price === 0 ? 'Downgrade' : 'Upgrade'
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        <p>All plans include secure data storage and regular updates.</p>
        <p className="mt-1">Need help choosing? Contact us at support@taxpilotng.com</p>
      </div>
    </div>
  );
}