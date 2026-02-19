"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Shield,
  Zap,
  RefreshCw,
  BarChart3,
  FileText,
  PieChart,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
      },
    },
  };

  const features = [
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: "Seamless Migration",
      description:
        "Effortlessly migrate your tax data from legacy systems with our automated tools.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Bank-Grade Security",
      description:
        "Your financial data is protected with state-of-the-art encryption and security protocols.",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Calculations",
      description:
        "Get real-time tax calculations and insights as you input your financial data.",
    },
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Compliance Guaranteed",
      description:
        "Always up-to-date with the latest Nigerian tax laws and regulations.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/10 selection:text-primary">


      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 backdrop-blur-xl bg-background/70 sticky top-0 z-50 transition-all">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity"
        >
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm">
            TN
          </div>
          <span className="text-foreground">TaxNaira</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link
            href="#features"
            className="hover:text-primary transition-colors"
          >
            Features
          </Link>
          <Link
            href="/calculator"
            className="hover:text-primary transition-colors"
          >
            Calculator
          </Link>
          <Link
            href="/pricing"
            className="hover:text-primary transition-colors"
          >
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Link href="/dashboard/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              Log in
            </Button>
          </Link>
          <Link href="/dashboard/register">
            <Button size="sm" className="font-semibold shadow-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 px-6 lg:py-32 overflow-hidden">
          <motion.div
            className="container max-w-5xl mx-auto text-center space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex justify-center">
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-sm font-medium text-emerald-600 backdrop-blur-sm dark:bg-emerald-500/10 dark:text-emerald-400"
              >
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                Tax Season is Here - Start Filing Today
              </motion.div>
            </div>

            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground"
              variants={itemVariants}
            >
              Simplify Your Taxes <br className="hidden md:block" />
              in <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-500 to-teal-600">Nigeria</span>
            </motion.h1>

            <motion.p
              className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              The modern, secure, and fast way to manage your tax filings.
              Designed for individuals and businesses who value time and
              accuracy.
            </motion.p>

            <motion.div
              className="flex justify-center flex-wrap gap-4 pt-6"
              variants={itemVariants}
            >
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8 text-lg gap-2 shadow-lg hover:shadow-xl transition-all">
                  Start Filing Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-lg border-primary/20 hover:bg-primary/5 hover:border-primary/40 backdrop-blur-sm bg-background/50"
                >
                  Watch Demo
                </Button>
              </Link>
            </motion.div>

            {/* Abstract Dashboard Preview */}
            <motion.div
              className="mt-20 relative rounded-2xl border bg-background/50 shadow-2xl overflow-hidden aspect-video max-w-5xl mx-auto transform hover:scale-[1.01] transition-transform duration-500 will-change-transform"
              variants={itemVariants}
            >
              {/* Mock UI Header */}
              <div className="absolute top-0 w-full h-12 bg-muted/30 border-b flex items-center px-4 gap-2 backdrop-blur-md">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                </div>
                <div className="flex-1 text-center text-xs font-mono text-muted-foreground/50">
                  dashboard.taxnaira.com
                </div>
              </div>

              {/* Mock UI Content */}
              <div className="pt-12 p-6 h-full grid grid-cols-12 gap-6 bg-background/40">
                {/* Sidebar Mock */}
                <div className="hidden md:block col-span-3 space-y-4 pt-4 px-2">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-medium text-sm">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium text-sm">Reports</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Users className="h-5 w-5" />
                    <span className="font-medium text-sm">Clients</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors">
                    <PieChart className="h-5 w-5" />
                    <span className="font-medium text-sm">Expenses</span>
                  </div>
                </div>

                {/* Main Content Mock */}
                <div className="col-span-12 md:col-span-9 grid gap-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-background/80 p-4 shadow-sm flex flex-col justify-between h-32">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-2">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs font-medium uppercase">Total Revenue</div>
                        <div className="text-2xl font-bold tracking-tight">₦4.2M</div>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-4 shadow-sm flex flex-col justify-between h-32">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-2">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs font-medium uppercase">Tax Liability</div>
                        <div className="text-2xl font-bold tracking-tight">₦350k</div>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background/80 p-4 shadow-sm flex flex-col justify-between h-32">
                      <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center mb-2">
                        <RefreshCw className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs font-medium uppercase">Pending</div>
                        <div className="text-2xl font-bold tracking-tight">3</div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="h-64 rounded-xl border bg-background/80 p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-sm">Monthly Revenue</h4>
                        <p className="text-xs text-muted-foreground">Jan - Jun 2025</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-muted-foreground">Income</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3 h-40">
                      {/* Realistic Mock Chart Bars */}
                      {[35, 50, 45, 70, 60, 85, 55, 75, 65, 90, 80, 95].map((h, i) => (
                        <div key={i} className="w-full relative group">
                          <div
                            className="w-full bg-emerald-500/20 rounded-t-sm group-hover:bg-emerald-500/40 transition-colors"
                            style={{ height: `${h}%` }}
                          ></div>
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity"
                            style={{ height: `${h * 0.6}%` }} // Inner bar
                          ></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Glass Overlay/Glint */}
              <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative">
          <div className="hidden md:block absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent"></div>

          <div className="container max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Everything You Need</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Comprehensive tools to handle your tax obligations with <span className="text-emerald-600 dark:text-emerald-400 font-semibold">confidence</span>.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="group relative">
                  <div className="absolute -inset-0.5 bg-linear-to-br from-primary/20 to-primary/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                  <motion.div
                    className="relative bg-background p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all h-full flex flex-col space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-primary/5 skew-y-3 transform origin-bottom-right scale-110"></div>

          <motion.div
            className="container max-w-3xl mx-auto space-y-8 relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
              Ready to Simplify Your Finances?
            </h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Join thousands of Nigerians who have switched to <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-500 to-teal-600 font-bold">TaxNaira</span> for stress-free tax filing.
            </p>
            <div className="flex justify-center gap-4 pt-6">
              <Link href="/dashboard/register">
                <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t py-16 px-6 bg-background">
        <div className="container mx-auto grid md:grid-cols-4 gap-12 text-sm">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm">
                TN
              </div>
              <span className="text-foreground">TaxNaira</span>
            </Link>
            <p className="text-muted-foreground max-w-xs leading-relaxed">
              Making tax compliance simple, accessible, and automated for everyone in Nigeria.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4 text-base">Product</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/calculator" className="hover:text-primary transition-colors">
                  Calculator
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4 text-base">Company</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-primary transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4 text-base">Legal</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto mt-16 pt-8 border-t border-border/40 text-center text-muted-foreground text-xs">
          <p>&copy; {new Date().getFullYear()} TaxNaira. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
