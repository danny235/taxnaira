
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Loader2, UserCircle, Briefcase, MapPin, DollarSign,
    ArrowRight, ArrowLeft, CheckCircle2, Sparkles,
    Building2, Globe, Bitcoin, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { motion, AnimatePresence } from 'framer-motion'

const STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
    "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
    "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
]

const EMPLOYMENT_TYPES = [
    { value: 'salary_earner', label: 'Salary Earner', description: 'Employed by a company', icon: Briefcase },
    { value: 'self_employed', label: 'Self-Employed', description: 'Freelancer or consultant', icon: UserCircle },
    { value: 'business_owner', label: 'Business Owner', description: 'Own a registered business', icon: Building2 },
    { value: 'remote_worker', label: 'Remote Worker', description: 'Work for foreign companies', icon: Globe }
]

const STEPS = [
    { id: 1, icon: UserCircle, title: 'Personal Info', subtitle: 'Tell us about yourself' },
    { id: 2, icon: MapPin, title: 'Location', subtitle: 'Where do you reside?' },
    { id: 3, icon: Briefcase, title: 'Employment', subtitle: 'Your work & income' },
    { id: 4, icon: DollarSign, title: 'Financials', subtitle: 'Income sources' },
]

interface OnboardingFormProps {
    userId: string
    onComplete?: () => void
}

export default function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
    const [step, setStep] = useState(0) // 0 = welcome screen
    const [saving, setSaving] = useState(false)
    const [done, setDone] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        state_of_residence: '',
        residential_address: '',
        employment_type: '',
        annual_income_estimate: '',
        receives_foreign_income: false,
        trades_crypto: false
    })

    const { } = useAuth()

    const updateField = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }))

    const isStepValid = () => {
        switch (step) {
            case 1: return formData.full_name && formData.phone_number
            case 2: return formData.state_of_residence && formData.residential_address
            case 3: return formData.employment_type && formData.annual_income_estimate
            default: return true
        }
    }

    const handleSubmit = async () => {
        setSaving(true)
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: formData.full_name,
                    phone_number: formData.phone_number,
                    state_of_residence: formData.state_of_residence,
                    residential_address: formData.residential_address,
                    employment_type: formData.employment_type,
                    annual_income_estimate: Number(formData.annual_income_estimate) || 0,
                    receives_foreign_income: formData.receives_foreign_income,
                    trades_crypto: formData.trades_crypto,
                    profile_complete: true
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update profile')
            }

            setDone(true)
            setTimeout(() => { if (onComplete) onComplete() }, 2000)
        } catch (error) {
            console.error('Onboarding failed:', error)
            toast.error('Failed to complete setup. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const progress = step === 0 ? 0 : Math.round((step / STEPS.length) * 100)

    // Welcome screen
    if (step === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md text-center"
                >
                    <div className="mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg">
                            <Sparkles className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome to TaxNaira</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-base leading-relaxed">
                        Your AI-powered tax assistant for Nigeria. Let's set up your profile in just 4 quick steps so we can calculate your taxes accurately.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                        {[
                            { icon: TrendingUp, label: 'Smart Tax Calculations', color: 'text-emerald-500' },
                            { icon: Briefcase, label: 'Income Categorization', color: 'text-teal-500' },
                            { icon: Globe, label: 'Foreign Income Support', color: 'text-blue-500' },
                            { icon: Bitcoin, label: 'Crypto Tax Tracking', color: 'text-purple-500' },
                        ].map(({ icon: Icon, label, color }) => (
                            <div key={label} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
                                <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={() => setStep(1)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base rounded-xl"
                    >
                        Get Started
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <p className="text-xs text-slate-400 mt-3">Takes about 2 minutes · Free to use</p>
                </motion.div>
            </div>
        )
    }

    // Completion screen
    if (done) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg"
                    >
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">You're all set! 🎉</h2>
                    <p className="text-slate-500 dark:text-slate-400">Taking you to your dashboard...</p>
                </motion.div>
            </div>
        )
    }

    const currentStep = STEPS[step - 1]
    const StepIcon = currentStep.icon

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">

                {/* Step indicators */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Step {step} of {STEPS.length}</span>
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                            {progress}% complete
                        </Badge>
                    </div>
                    <Progress value={progress} className="h-2" />

                    <div className="flex justify-between mt-3">
                        {STEPS.map((s) => {
                            const Icon = s.icon
                            const isActive = s.id === step
                            const isDone = s.id < step
                            return (
                                <div key={s.id} className="flex flex-col items-center gap-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 text-white' :
                                        isActive ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' :
                                            'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                        }`}>
                                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                    </div>
                                    <span className={`text-xs hidden sm:block ${isActive ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                        {s.title}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <Card className="bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl overflow-hidden">
                    <CardContent className="pt-6 pb-2">
                        {/* Step header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <StepIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{currentStep.title}</h2>
                                <p className="text-sm text-slate-500">{currentStep.subtitle}</p>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -24 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {step === 1 && (
                                    <>
                                        <div>
                                            <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-300">Full Name</Label>
                                            <Input
                                                id="full_name"
                                                value={formData.full_name}
                                                onChange={(e) => updateField('full_name', e.target.value)}
                                                placeholder="e.g. Chidi Okeke"
                                                className="mt-1.5 h-11"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                value={formData.phone_number}
                                                onChange={(e) => updateField('phone_number', e.target.value)}
                                                placeholder="+234 XXX XXX XXXX"
                                                className="mt-1.5 h-11"
                                            />
                                        </div>
                                    </>
                                )}

                                {step === 2 && (
                                    <>
                                        <div>
                                            <Label className="text-slate-700 dark:text-slate-300">State of Residence</Label>
                                            <Select value={formData.state_of_residence} onValueChange={(v) => updateField('state_of_residence', v)}>
                                                <SelectTrigger className="mt-1.5 h-11">
                                                    <SelectValue placeholder="Select your state" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {STATES.map(state => (
                                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="address" className="text-slate-700 dark:text-slate-300">Residential Address</Label>
                                            <Input
                                                id="address"
                                                value={formData.residential_address}
                                                onChange={(e) => updateField('residential_address', e.target.value)}
                                                placeholder="Street, City"
                                                className="mt-1.5 h-11"
                                            />
                                        </div>
                                    </>
                                )}

                                {step === 3 && (
                                    <>
                                        <div>
                                            <Label className="text-slate-700 dark:text-slate-300 mb-2 block">Employment Type</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {EMPLOYMENT_TYPES.map(type => {
                                                    const Icon = type.icon
                                                    return (
                                                        <button
                                                            key={type.value}
                                                            type="button"
                                                            onClick={() => updateField('employment_type', type.value)}
                                                            className={`p-3 rounded-xl border-2 text-left transition-all ${formData.employment_type === type.value
                                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                                }`}
                                                        >
                                                            <Icon className={`w-5 h-5 mb-1 ${formData.employment_type === type.value ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white">{type.label}</p>
                                                            <p className="text-xs text-slate-500">{type.description}</p>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="income" className="text-slate-700 dark:text-slate-300">Estimated Annual Income (₦)</Label>
                                            <Input
                                                id="income"
                                                type="number"
                                                value={formData.annual_income_estimate}
                                                onChange={(e) => updateField('annual_income_estimate', e.target.value)}
                                                placeholder="e.g. 5000000"
                                                className="mt-1.5 h-11"
                                            />
                                        </div>
                                    </>
                                )}

                                {step === 4 && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-500 mb-4">Help us personalize your tax calculations by telling us about other income sources.</p>
                                        {[
                                            {
                                                field: 'receives_foreign_income', icon: Globe, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
                                                title: 'Foreign Income', desc: 'Receive income in USD, GBP, EUR, etc.'
                                            },
                                            {
                                                field: 'trades_crypto', icon: Bitcoin, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
                                                title: 'Cryptocurrency Trading', desc: 'Trade or hold crypto assets'
                                            }
                                        ].map(({ field, icon: Icon, color, title, desc }) => (
                                            <div
                                                key={field}
                                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${(formData as any)[field] ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white text-sm">{title}</p>
                                                        <p className="text-xs text-slate-500">{desc}</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={(formData as any)[field]}
                                                    onCheckedChange={(v) => updateField(field, v)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>

                    <CardFooter className="flex justify-between pt-4 pb-6 px-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            variant="ghost"
                            onClick={() => setStep(prev => prev - 1)}
                            disabled={step === 1}
                            className="text-slate-500"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>

                        {step < 4 ? (
                            <Button
                                onClick={() => setStep(prev => prev + 1)}
                                disabled={!isStepValid()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Complete Setup
                                    </>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
