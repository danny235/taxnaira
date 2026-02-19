import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, MessageCircle, Mail, Phone, FileText, Calculator, Upload, Shield } from 'lucide-react';

const faqs = [
  {
    category: 'Getting Started',
    icon: FileText,
    questions: [
      {
        q: 'How do I upload my bank statement?',
        a: 'Go to the Upload page and drag & drop your PDF or CSV bank statement. Our AI will automatically extract and categorize your transactions.'
      },
      {
        q: 'What file formats are supported?',
        a: 'We support PDF, CSV, and XLSX files. PDF files work best when they are searchable (not scanned images).'
      },
      {
        q: 'How do I complete my tax profile?',
        a: 'Navigate to Settings and fill in your personal information, employment type, and income details. This helps us provide accurate tax calculations.'
      }
    ]
  },
  {
    category: 'Tax Calculations',
    icon: Calculator,
    questions: [
      {
        q: 'How is my tax calculated?',
        a: 'We use the Nigerian 2026 progressive tax brackets. Income below ₦800,000 is exempt. Above that, rates range from 7% to 24% depending on your income level.'
      },
      {
        q: 'What deductions are supported?',
        a: 'We support pension contributions, NHF contributions, insurance premiums, and PAYE credits. These are automatically detected from your transactions.'
      },
      {
        q: 'How do I enter my PAYE credits?',
        a: 'In the Tax Calculator page, there\'s a field to enter your total PAYE already paid by your employer. This is deducted from your final tax liability.'
      }
    ]
  },
  {
    category: 'Foreign Income',
    icon: Upload,
    questions: [
      {
        q: 'How is foreign income converted?',
        a: 'Foreign currency income is automatically converted to Naira using historical exchange rates at the time of the transaction.'
      },
      {
        q: 'Do I need to report foreign income?',
        a: 'Yes, Nigerian residents are taxed on worldwide income. Make sure to include all foreign income sources in your transactions.'
      }
    ]
  },
  {
    category: 'Security & Privacy',
    icon: Shield,
    questions: [
      {
        q: 'Is my data secure?',
        a: 'Yes, all your data is encrypted and stored securely. We never share your information with third parties.'
      },
      {
        q: 'Can I delete my data?',
        a: 'Yes, you can delete individual transactions or documents from the respective pages. Contact support to completely delete your account.'
      }
    ]
  }
];

export default function Help() {
  const [search, setSearch] = useState('');

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(search.toLowerCase()) || 
           q.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Help Center</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Find answers to common questions</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search for help..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-12 text-lg bg-white dark:bg-slate-800"
        />
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Mail className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Email Support</p>
              <p className="text-sm text-slate-500">support@taxpilotng.com</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Phone Support</p>
              <p className="text-sm text-slate-500">+234 800 TAX PILOT</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <MessageCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Live Chat</p>
              <p className="text-sm text-slate-500">Available 9AM - 5PM</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQs */}
      <div className="space-y-6">
        {filteredFaqs.map((category, i) => {
          const Icon = category.icon;
          return (
            <Card key={i} className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="w-5 h-5 text-emerald-500" />
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, j) => (
                    <AccordionItem key={j} value={`${i}-${j}`}>
                      <AccordionTrigger className="text-left font-medium text-slate-900 dark:text-white hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 dark:text-slate-400">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Still Need Help */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-lg">
        <CardContent className="p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
          <p className="opacity-90 mb-6">Our support team is ready to assist you with any questions</p>
          <Button className="bg-white text-emerald-600 hover:bg-slate-100">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}