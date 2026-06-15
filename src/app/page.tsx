import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  ArrowRight,
  Play,
  Check,
  Brain,
  Target,
  MessageSquare,
  BarChart3,
  Swords,
  ShieldAlert,
  Library,
  Lightbulb,
  Bot,
  Zap,
  Star,
  ChevronDown,
  TrendingUp,
  Users,
  Database,
} from "lucide-react";

// Inline Youtube icon
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const metadata: Metadata = {
  title: "Nexus Insights — AI YouTube Comment Intelligence That Drives Revenue",
  description:
    "Turn thousands of YouTube comments into qualified leads, audience insights, and sales intelligence — in seconds. Trusted by creators and agencies worldwide.",
};

const FEATURES = [
  {
    icon: Brain,
    title: "14-Node AI Pipeline",
    tagline: "Deep intelligence, not surface stats",
    desc: "Every scan runs a full map-reduce critique loop, semantic deduplication, like-weighting, and Llama-3 summaries — surfacing insights no spreadsheet can match.",
    color: "red",
  },
  {
    icon: Target,
    title: "Lead Engine",
    tagline: "Find buyers hiding in comments",
    desc: "We auto-tag commenters expressing buying intent, asking for recommendations, or complaining about competitors — so your sales team gets warm leads, not noise.",
    color: "blue",
  },
  {
    icon: Bot,
    title: "Auto-Responder",
    tagline: "Reply at scale, on autopilot",
    desc: "Set tone-aware rules to reply to comments automatically. Drive traffic, answer FAQs, and nurture leads 24/7 — with a jitter queue to stay safe from YouTube's spam filters.",
    color: "emerald",
  },
  {
    icon: Swords,
    title: "Competitor Radar",
    tagline: "See what they're missing",
    desc: "Monitor competitor channels, intercept their defectors, and spot content gaps you can own. Know exactly what their audience is asking for — before they do.",
    color: "purple",
  },
  {
    icon: ShieldAlert,
    title: "Objection Mining",
    tagline: "Write sales copy that actually converts",
    desc: "Surface the top doubts, hesitations, and objections your audience voices in comments — so your landing pages and ads answer them before they're even asked.",
    color: "amber",
  },
  {
    icon: BarChart3,
    title: "Audience Health Score",
    tagline: "Know your community's pulse",
    desc: "Get a real-time health index derived from viewer loyalty, engagement velocity, sentiment deltas, and skill breakdowns across beginner, mid, and expert segments.",
    color: "teal",
  },
  {
    icon: Lightbulb,
    title: "Content Intelligence",
    tagline: "Know what to make next",
    desc: "Trending topics, high-performing formats, and untapped keyword opportunities — all extracted from comment patterns so your next video starts with demand data.",
    color: "orange",
  },
  {
    icon: Library,
    title: "Proof Library",
    tagline: "Social proof at your fingertips",
    desc: "Automatically curate the best testimonials, success stories, and positive signals from comments. Use them in ads, landing pages, and sales decks instantly.",
    color: "rose",
  },
  {
    icon: MessageSquare,
    title: "Comment Stream",
    tagline: "Every signal, one place",
    desc: "Browse the full classified comment stream with categories (BUG, FEATURE, LEAD, PRAISE), intensity scores, and one-click AI reply drafts — all filterable.",
    color: "indigo",
  },
];

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    priceUsd: "$0",
    period: "forever",
    features: [
      "2 video scans / month",
      "100 comments per scan",
      "10 auto-replies / month",
      "Core comment classifier",
      "Basic audience summary",
    ],
    cta: "Get Started Free",
    href: "/signup",
    highlight: false,
  },
  {
    id: "CREATOR",
    name: "Creator",
    priceUsd: "$39",
    period: "/month",
    features: [
      "Unlimited own-channel scans",
      "500 comments per scan",
      "Delta, Persona & Gap reports",
      "500 auto-replies / month",
      "5 competitor scans / month",
      "Up to 3 YouTube channels",
    ],
    cta: "Start Creator Plan",
    href: "/signup",
    highlight: false,
  },
  {
    id: "GROWTH",
    name: "Growth",
    priceUsd: "$99",
    period: "/month",
    badge: "Most Popular",
    features: [
      "All 14 intelligence nodes",
      "2,000 comments per scan",
      "Leads + Competitor Radar",
      "Objections + Proof Library",
      "2,000 auto-replies / month",
      "Up to 5 YouTube channels",
      "Priority support",
    ],
    cta: "Start Growth Plan",
    href: "/signup",
    highlight: true,
  },
  {
    id: "AGENCY",
    name: "Agency",
    priceUsd: "$199",
    period: "/month",
    features: [
      "Everything in Growth",
      "Unlimited channels",
      "White-label PDF reports",
      "REST API + webhooks",
      "Bring Your Own API Key",
      "Dedicated account manager",
    ],
    cta: "Contact Us",
    href: "/contact",
    highlight: false,
  },
];

const STATS = [
  { value: "14", label: "AI Intelligence Nodes" },
  { value: "2 sec", label: "Average Scan Kickoff" },
  { value: "10,000+", label: "Comments Analyzed Daily" },
  { value: "99.9%", label: "Uptime SLA" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Paste any YouTube URL",
    desc: "Drop in any YouTube video link — your own content or a competitor's. Nexus extracts and deduplicates every comment thread instantly.",
  },
  {
    step: "02",
    title: "14-node AI runs in the background",
    desc: "Our pipeline classifies every comment, weights it by likes, runs a dual-mapper critique loop, builds audience personas, and computes pain & demand signals.",
  },
  {
    step: "03",
    title: "Get actionable intelligence",
    desc: "Review your executive summary, lead list, competitor gaps, objection map, and content ideas — all in one dashboard, ready to act on.",
  },
];

const FAQS = [
  {
    q: "How does Nexus compare to just reading comments manually?",
    a: "Manual comment reading misses patterns across thousands of data points. Nexus classifies every comment by category, weights it by engagement, and aggregates signals that would take hours of human review — in seconds.",
  },
  {
    q: "What YouTube channels can I analyze?",
    a: "Any public YouTube channel or video. For your own channels, you can connect via OAuth to unlock auto-reply features. Competitor channels work without authentication.",
  },
  {
    q: "Is my YouTube data secure?",
    a: "Yes. We encrypt all OAuth tokens at rest, never store raw video content, and are compliant with YouTube's API terms of service. Agency users can also Bring Your Own API Key.",
  },
  {
    q: "What is the 14-node pipeline?",
    a: "Each scan runs through 14 distinct AI processing steps — ingestion, deduplication, semantic caching, classification, like-weighting, persona mapping, gap analysis, sentiment scoring, lead scoring, and more — producing a comprehensive intelligence report.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes, all paid plans are month-to-month. Cancel from your billing portal any time with no lock-in and no questions asked.",
  },
];

const colorMap: Record<string, string> = {
  red:     "bg-red-50    border-red-100    text-red-600",
  blue:    "bg-blue-50   border-blue-100   text-blue-600",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
  purple:  "bg-purple-50  border-purple-100  text-purple-600",
  amber:   "bg-amber-50   border-amber-100   text-amber-600",
  teal:    "bg-teal-50    border-teal-100    text-teal-600",
  orange:  "bg-orange-50  border-orange-100  text-orange-600",
  rose:    "bg-rose-50    border-rose-100    text-rose-600",
  indigo:  "bg-indigo-50  border-indigo-100  text-indigo-600",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">

      {/* ─── Navbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-zinc-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-red-600 to-red-800 shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-zinc-900">
              NE<span className="text-red-600">X</span>US
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Features",   href: "#features" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Pricing",    href: "#pricing" },
              { label: "FAQ",        href: "#faq" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-all"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 text-sm font-bold bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl shadow-sm transition-all active:scale-[0.97]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-linear-to-b from-zinc-50 to-white pt-20 pb-24 px-6">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-125 h-125 rounded-full bg-red-50 blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-100 h-100 rounded-full bg-zinc-100 blur-3xl opacity-50 pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-bold text-red-600 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered YouTube Comment Intelligence
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.1] mb-6">
            Turn YouTube Comments<br />
            Into <span className="text-red-600">Revenue</span>
          </h1>

          <p className="text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Nexus scans thousands of comments in seconds — classifying every signal, identifying high-intent leads,
            surfacing audience objections, and auto-replying — so you close more without the manual grind.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-red-200 transition-all active:scale-[0.97] w-full sm:w-auto justify-center"
            >
              <Play className="h-4 w-4 fill-current" />
              Start Free — No Credit Card
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 px-8 py-4 text-base font-semibold text-zinc-700 transition-all w-full sm:w-auto justify-center"
            >
              See How It Works
              <ChevronDown className="h-4 w-4" />
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Free plan available</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> YouTube ToS compliant</span>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ───────────────────────────────────── */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-10 px-6">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-zinc-900">{s.value}</p>
              <p className="text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest block mb-3">Process</span>
            <h2 className="text-4xl font-extrabold text-zinc-900">From URL to Intelligence in 3 Steps</h2>
            <p className="text-zinc-500 mt-4 max-w-xl mx-auto">No setup. No data science degree. Just paste a video URL and let the 14-node pipeline do the heavy lifting.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative p-8 rounded-2xl border border-zinc-200 bg-white hover:border-red-200 hover:shadow-md transition-all group">
                <div className="text-5xl font-extrabold text-zinc-100 group-hover:text-red-50 transition-colors mb-4 leading-none">{step.step}</div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-zinc-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest block mb-3">Features</span>
            <h2 className="text-4xl font-extrabold text-zinc-900">Everything Your Team Needs</h2>
            <p className="text-zinc-500 mt-4 max-w-xl mx-auto">Nine powerful modules, one dashboard. Each powered by AI and tuned for creators, marketers, and agencies.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const iconCls = colorMap[f.color] ?? colorMap["red"];
              return (
                <div key={f.title} className="p-6 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md transition-all group">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${iconCls} mb-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{f.tagline}</p>
                  <h3 className="text-base font-bold text-zinc-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Pipeline Deep-Dive ──────────────────────────── */}
      <section className="py-24 px-6 bg-zinc-900 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-3">Under the Hood</span>
              <h2 className="text-4xl font-extrabold leading-tight mb-6">
                Not just AI hype —<br />a real 14-node pipeline
              </h2>
              <p className="text-zinc-400 leading-relaxed mb-8">
                Most tools give you a word cloud. Nexus runs a full map-reduce critique loop,
                semantic vector caching, and Groq Llama-3 70B summarization — delivering executive-grade
                intelligence from raw comment data.
              </p>
              <Link href="/signup" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all">
                Try It Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { icon: Database, label: "Semantic vector cache (avoids re-classifying identical comments)" },
                { icon: Brain,    label: "Dual-mapper critique loop (Llama-3 70B cross-validates every classification)" },
                { icon: TrendingUp, label: "Like-weight computation — signals from top commenters count more" },
                { icon: Users,    label: "Audience persona engine — segments your viewers by skill & motivation" },
                { icon: Zap,      label: "Real-time delta alerts — detects sudden complaint surges" },
                { icon: YoutubeIcon,  label: "YouTube Data API v3 integration with BYOK support for full quota" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800 border border-zinc-700">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-red-400 mt-0.5">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-zinc-300">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest block mb-3">Pricing</span>
            <h2 className="text-4xl font-extrabold text-zinc-900">Simple, Transparent Pricing</h2>
            <p className="text-zinc-500 mt-4">Start free. Scale when ready. No contracts, cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  plan.highlight
                    ? "border-red-300 bg-red-600 text-white shadow-xl shadow-red-200 scale-[1.02]"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-zinc-900 text-white px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-4">
                  <h3 className={`font-bold text-base ${plan.highlight ? "text-white" : "text-zinc-900"}`}>{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className={`text-3xl font-extrabold ${plan.highlight ? "text-white" : "text-zinc-900"}`}>{plan.priceUsd}</span>
                    <span className={`text-sm ${plan.highlight ? "text-red-100" : "text-zinc-400"}`}>{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.highlight ? "text-red-100" : "text-emerald-500"}`} />
                      <span className={plan.highlight ? "text-red-50" : "text-zinc-600"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block text-center text-sm font-bold py-2.5 rounded-xl transition-all ${
                    plan.highlight
                      ? "bg-white text-red-600 hover:bg-red-50"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Comparison footnote */}
          <p className="text-center text-xs text-zinc-400 mt-8">
            All prices in USD. INR pricing available at checkout. Payments via Razorpay (India) & Dodo (International).
          </p>
        </div>
      </section>

      {/* ─── Testimonials placeholder ────────────────────── */}
      <section className="py-20 px-6 bg-zinc-50">
        <div className="mx-auto max-w-5xl text-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
          </div>
          <blockquote className="text-2xl font-bold text-zinc-900 max-w-2xl mx-auto leading-snug mb-6">
            &ldquo;We found 47 warm leads from a single video scan. Our sales team was blown away — this would have taken two days manually.&rdquo;
          </blockquote>
          <p className="text-sm font-semibold text-zinc-500">Agency client · Growth plan · YouTube creator niche</p>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest block mb-3">FAQ</span>
            <h2 className="text-4xl font-extrabold text-zinc-900">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {FAQS.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className="font-bold text-zinc-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────── */}
      <section className="py-24 px-6 bg-zinc-900 text-white text-center">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-2 text-red-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Start today</span>
          </div>
          <h2 className="text-4xl font-extrabold mb-6">Ready to unlock your audience?</h2>
          <p className="text-zinc-400 mb-10 text-lg">
            Join creators and agencies turning comment noise into their biggest competitive advantage.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-red-900/40 transition-all active:scale-[0.97] w-full sm:w-auto justify-center"
            >
              <Play className="h-4 w-4 fill-current" />
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 rounded-2xl border border-zinc-700 hover:border-zinc-500 bg-transparent hover:bg-zinc-800 px-8 py-4 text-base font-semibold text-zinc-300 transition-all w-full sm:w-auto justify-center"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-6 text-xs text-zinc-600">No credit card required · Free plan available · Cancel anytime</p>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="bg-black border-t border-zinc-900 py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-tr from-red-600 to-red-800">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="font-bold text-zinc-400">NE<span className="text-red-600">X</span>US Insights</span>
            <span className="text-zinc-700">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Refunds", href: "/refund" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-zinc-400 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
