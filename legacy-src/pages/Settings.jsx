import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, Briefcase, Bell, Shield, Loader2, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", 
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", 
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const EMPLOYMENT_TYPES = [
  { value: 'salary_earner', label: 'Salary Earner' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'remote_worker', label: 'Remote Worker' }
];

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    state_of_residence: '',
    residential_address: '',
    employment_type: '',
    annual_income_estimate: '',
    receives_foreign_income: false,
    trades_crypto: false
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.TaxProfile.filter({ user_id: user?.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        state_of_residence: profile.state_of_residence || '',
        residential_address: profile.residential_address || '',
        employment_type: profile.employment_type || '',
        annual_income_estimate: profile.annual_income_estimate || '',
        receives_foreign_income: profile.receives_foreign_income || false,
        trades_crypto: profile.trades_crypto || false
      });
    }
  }, [profile]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const data = {
      ...formData,
      annual_income_estimate: Number(formData.annual_income_estimate) || 0,
      profile_complete: true
    };

    if (profile) {
      await base44.entities.TaxProfile.update(profile.id, data);
    } else {
      await base44.entities.TaxProfile.create({
        user_id: user?.id,
        ...data
      });
    }

    setSaving(false);
    refetch();
    queryClient.invalidateQueries(['profile']);
    toast.success('Profile saved successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Tax Info
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone_number}
                    onChange={(e) => updateField('phone_number', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>State of Residence</Label>
                  <Select value={formData.state_of_residence} onValueChange={(v) => updateField('state_of_residence', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Residential Address</Label>
                  <Input
                    id="address"
                    value={formData.residential_address}
                    onChange={(e) => updateField('residential_address', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Tax Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Employment Type</Label>
                  <Select value={formData.employment_type} onValueChange={(v) => updateField('employment_type', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="income">Estimated Annual Income (₦)</Label>
                  <Input
                    id="income"
                    type="number"
                    value={formData.annual_income_estimate}
                    onChange={(e) => updateField('annual_income_estimate', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Foreign Income</p>
                    <p className="text-sm text-slate-500">Do you receive income in foreign currency?</p>
                  </div>
                  <Switch
                    checked={formData.receives_foreign_income}
                    onCheckedChange={(v) => updateField('receives_foreign_income', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Cryptocurrency Trading</p>
                    <p className="text-sm text-slate-500">Do you trade or hold cryptocurrency?</p>
                  </div>
                  <Switch
                    checked={formData.trades_crypto}
                    onCheckedChange={(v) => updateField('trades_crypto', v)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Tax Deadline Reminders</p>
                  <p className="text-sm text-slate-500">Get notified about important tax deadlines</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Monthly Summaries</p>
                  <p className="text-sm text-slate-500">Receive monthly income and expense summaries</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">New Features</p>
                  <p className="text-sm text-slate-500">Get updates about new features and improvements</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}