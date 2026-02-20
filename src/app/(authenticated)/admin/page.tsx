"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Settings, Users, Calculator, Activity, Plus, Edit2, Trash2,
    Loader2, Save, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth-provider';

export default function AdminPage() {
    const [showBracketDialog, setShowBracketDialog] = useState(false);
    const [editingBracket, setEditingBracket] = useState<any>(null);
    const [bracketForm, setBracketForm] = useState({
        min_amount: '',
        max_amount: '',
        rate: '',
        description: '',
        tax_year: new Date().getFullYear()
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const currentYear = new Date().getFullYear();
    const router = useRouter();

    const { user, supabase, role, isLoading: authLoading } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [taxBrackets, setTaxBrackets] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]); // Optional if table exists

    const [settingsForm, setSettingsForm] = useState({
        exemption_threshold: 800000,
        pension_deduction_rate: 8,
        nhf_deduction_rate: 2.5,
        capital_gains_rate: 10
    });

    useEffect(() => {
        const init = async () => {
            if (authLoading) return;

            if (!user || role !== 'admin') {
                if (!authLoading) {
                    // Only redirect if we are sure auth is done loading
                    // However, relying on useEffect for redirect can cause flash.
                    // Better handled by Middleware or Layout, but for now:
                    if (!user) router.push('/login');
                    else if (role !== 'admin') {
                        toast.error("Unauthorized access");
                        router.push('/dashboard');
                    }
                }
                return;
            }

            await Promise.all([
                fetchUsers(),
                fetchBrackets(),
                fetchSettings(),
                fetchLogs()
            ]);
            setLoading(false);
        };
        init();
    }, [user, role, authLoading]);

    useEffect(() => {
        if (settings) {
            setSettingsForm({
                exemption_threshold: settings.exemption_threshold || 800000,
                pension_deduction_rate: settings.pension_deduction_rate || 8,
                nhf_deduction_rate: settings.nhf_deduction_rate || 2.5,
                capital_gains_rate: settings.capital_gains_rate || 10
            });
        }
    }, [settings]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const fetchBrackets = async () => {
        try {
            const res = await fetch(`/api/admin/tax-brackets?year=${currentYear}`);
            if (res.ok) {
                const data = await res.json();
                setTaxBrackets(data);
            }
        } catch (error) {
            console.error('Failed to fetch brackets:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`/api/admin/settings?year=${currentYear}`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/audit-logs');
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
    };

    const handleSaveBracket = async () => {
        setSaving(true);
        const data = {
            min_amount: Number(bracketForm.min_amount),
            max_amount: Number(bracketForm.max_amount),
            rate: Number(bracketForm.rate),
            description: bracketForm.description,
            tax_year: currentYear,
            is_active: true
        };

        try {
            let res;
            if (editingBracket) {
                res = await fetch('/api/admin/tax-brackets', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...data, id: editingBracket.id }),
                });
            } else {
                res = await fetch('/api/admin/tax-brackets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
            }

            if (!res.ok) throw new Error('Failed to save');
            toast.success('Tax bracket saved');
            setShowBracketDialog(false);
            setEditingBracket(null);
            setBracketForm({ min_amount: '', max_amount: '', rate: '', description: '', tax_year: currentYear });
            fetchBrackets();
        } catch (error: any) {
            toast.error("Failed to save bracket");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBracket = async (id: string) => {
        if (confirm("Are you sure?")) {
            const res = await fetch(`/api/admin/tax-brackets?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            fetchBrackets();
            toast.success('Tax bracket deleted');
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        const data = {
            tax_year: currentYear,
            ...settingsForm,
            is_active: true
        };

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, id: settings?.id }),
            });

            if (!res.ok) throw new Error('Failed to save');
            toast.success('Settings saved');
            fetchSettings();
        } catch (error: any) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const openEditBracket = (bracket: any) => {
        setEditingBracket(bracket);
        setBracketForm({
            min_amount: bracket.min_amount,
            max_amount: bracket.max_amount,
            rate: bracket.rate,
            description: bracket.description || '',
            tax_year: bracket.tax_year
        });
        setShowBracketDialog(true);
    };

    const userStats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        freeUsers: users.length, // Placeholder until subscription linking is clear
        proUsers: 0,
        premiumUsers: 0
    };

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!user || role !== 'admin') return null; // Prevent flash of content

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage tax settings and users</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <p className="text-sm text-slate-500">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{userStats.total}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <p className="text-sm text-slate-500">Admins</p>
                    <p className="text-2xl font-bold text-purple-600">{userStats.admins}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <p className="text-sm text-slate-500">Free</p>
                    <p className="text-2xl font-bold text-slate-600">{userStats.freeUsers}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <p className="text-sm text-slate-500">Pro</p>
                    <p className="text-2xl font-bold text-emerald-600">{userStats.proUsers}</p>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
                    <p className="text-sm text-slate-500">Premium</p>
                    <p className="text-2xl font-bold text-amber-600">{userStats.premiumUsers}</p>
                </Card>
            </div>

            <Tabs defaultValue="brackets">
                <TabsList>
                    <TabsTrigger value="brackets" className="gap-2">
                        <Calculator className="w-4 h-4" />
                        Tax Brackets
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-2">
                        <Activity className="w-4 h-4" />
                        Audit Logs
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="brackets" className="mt-6">
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-lg">Tax Brackets ({currentYear})</CardTitle>
                            <Dialog open={showBracketDialog} onOpenChange={setShowBracketDialog}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Bracket
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{editingBracket ? 'Edit' : 'Add'} Tax Bracket</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Min Amount (₦)</Label>
                                                <Input
                                                    type="number"
                                                    value={bracketForm.min_amount}
                                                    onChange={(e) => setBracketForm({ ...bracketForm, min_amount: e.target.value })}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label>Max Amount (₦)</Label>
                                                <Input
                                                    type="number"
                                                    value={bracketForm.max_amount}
                                                    onChange={(e) => setBracketForm({ ...bracketForm, max_amount: e.target.value })}
                                                    placeholder="-1 for unlimited"
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Tax Rate (%)</Label>
                                            <Input
                                                type="number"
                                                value={bracketForm.rate}
                                                onChange={(e) => setBracketForm({ ...bracketForm, rate: e.target.value })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Description</Label>
                                            <Input
                                                value={bracketForm.description}
                                                onChange={(e) => setBracketForm({ ...bracketForm, description: e.target.value })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button onClick={handleSaveBracket} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Bracket'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Range</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {taxBrackets.sort((a, b) => a.min_amount - b.min_amount).map((bracket) => (
                                        <TableRow key={bracket.id}>
                                            <TableCell>
                                                ₦{bracket.min_amount.toLocaleString()} - {bracket.max_amount === -1 ? '∞' : `₦${bracket.max_amount.toLocaleString()}`}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{bracket.rate}%</Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500">{bracket.description || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditBracket(bracket)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBracket(bracket.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Tax Settings ({currentYear})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Exemption Threshold (₦)</Label>
                                    <Input
                                        type="number"
                                        value={settingsForm.exemption_threshold}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, exemption_threshold: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Income below this is tax-free</p>
                                </div>
                                <div>
                                    <Label>Pension Deduction Rate (%)</Label>
                                    <Input
                                        type="number"
                                        value={settingsForm.pension_deduction_rate}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, pension_deduction_rate: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>NHF Deduction Rate (%)</Label>
                                    <Input
                                        type="number"
                                        value={settingsForm.nhf_deduction_rate}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, nhf_deduction_rate: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Capital Gains Rate (%)</Label>
                                    <Input
                                        type="number"
                                        value={settingsForm.capital_gains_rate}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, capital_gains_rate: Number(e.target.value) })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleSaveSettings} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.full_name || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                                                    {u.role || 'user'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500">
                                                {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs" className="mt-6">
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Audit Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Entity</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium">{log.action}</TableCell>
                                            <TableCell>{log.entity_type || '-'}</TableCell>
                                            <TableCell className="text-slate-500">{log.user_id || '-'}</TableCell>
                                            <TableCell className="text-slate-500">
                                                {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm') : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
