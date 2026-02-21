
import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, Lock } from 'lucide-react'
import Link from 'next/link'

interface SubscriptionGateProps {
    requiredPlan?: 'free' | 'pro' | 'premium'
    currentPlan?: 'free' | 'pro' | 'premium'
    feature?: string
    children: React.ReactNode
}

export default function SubscriptionGate({
    children
}: SubscriptionGateProps) {
    return <>{children}</>
}

