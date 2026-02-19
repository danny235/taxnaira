import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
    return (
        <Card className={`w-full bg-card border-border shadow-sm ${className}`}>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight text-center">{title}</CardTitle>
                {description && (
                    <CardDescription className="text-center text-slate-500 dark:text-slate-400">
                        {description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
            {footer && (
                <CardFooter className="flex flex-col gap-4 text-sm text-center text-slate-500 dark:text-slate-400">
                    {footer}
                </CardFooter>
            )}
        </Card>
    );
}
