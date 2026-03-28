'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { Bell, Send, Users, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

export default function AdminNotificationsPage() {
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [type, setType] = useState('info')
    const [isGlobal, setIsGlobal] = useState(true)
    const [targetUserId, setTargetUserId] = useState('')
    const [sending, setSending] = useState(false)

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !message) {
            toast.error('Please fill in both title and message')
            return
        }

        setSending(true)
        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    message,
                    type,
                    user_id: isGlobal ? null : targetUserId
                })
            })

            if (res.ok) {
                toast.success('Notification sent successfully!')
                setTitle('')
                setMessage('')
            } else {
                throw new Error('Failed to send')
            }
        } catch (error) {
            toast.error('Failed to send notification')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Bell className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Manage Notifications</h1>
                    <p className="text-slate-500 text-sm">Send updates and alerts to users</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Compose New Notification</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSend} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Notification Title</Label>
                            <Input 
                                id="title"
                                placeholder="e.g., Tax Deadline Reminder"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message Body</Label>
                            <Textarea 
                                id="message"
                                placeholder="Enter the detailed notification message..."
                                className="min-h-[120px]"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Notification Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Information (Blue)</SelectItem>
                                        <SelectItem value="success">Success (Green)</SelectItem>
                                        <SelectItem value="warning">Warning (Yellow)</SelectItem>
                                        <SelectItem value="error">Critical (Red)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4">
                                <Label>Target Audience</Label>
                                <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <Checkbox 
                                        id="isGlobal" 
                                        checked={isGlobal} 
                                        onCheckedChange={(checked) => setIsGlobal(!!checked)}
                                    />
                                    <Label htmlFor="isGlobal" className="flex items-center gap-2 cursor-pointer">
                                        <Users className="w-4 h-4 text-slate-500" />
                                        Send to all users
                                    </Label>
                                </div>

                                {!isGlobal && (
                                    <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                                        <Label htmlFor="userId" className="text-xs">Specific User UUID</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input 
                                                id="userId"
                                                placeholder="Enter user UUID..."
                                                className="pl-10"
                                                value={targetUserId}
                                                onChange={(e) => setTargetUserId(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={sending}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11"
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Broadcast Notification
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
