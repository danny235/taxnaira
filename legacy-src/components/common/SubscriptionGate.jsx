import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SubscriptionGate({ requiredPlan = 'pro', currentPlan = 'free', feature, children }) {
  const planOrder = { free: 0, pro: 1, premium: 2 };
  const hasAccess = planOrder[currentPlan] >= planOrder[requiredPlan];

  if (hasAccess) {
    return children;
  }

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600">
      <CardContent className="p-8 text-center">
        <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
          <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          {feature || 'This feature'} requires {requiredPlan === 'pro' ? 'Pro' : 'Premium'}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Upgrade your plan to unlock this feature and get access to advanced tax tools.
        </p>
        <Link to={createPageUrl('Subscription')}>
          <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}