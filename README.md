# Nexus Insights

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.8-1B222D?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css)

**Nexus Insights** is a next-generation YouTube intelligence tool. It scans thousands of comments in seconds, runs a dual-mapper critique loop, computes engagement weights, and aggregates product pain & demand signals automatically to help creators and businesses unlock the intent hidden in their audience.

---

## ✨ Key Features

- **14-Node AI Scan Pipeline**: A sophisticated AI workflow that analyzes sentiment, extracts audience personas, flags leads, and detects competitor mentions.
- **Map-Reduce Critique Loop**: Utilizes Groq (Llama 3) for intelligent conflict resolution, ensuring high-accuracy analysis across massive comment threads.
- **Semantic Vector Cache**: Drastically reduces AI costs (up to 90%) by leveraging Google Gemini embeddings and `pgvector` to bypass LLM calls on repetitive queries.
- **Audience Persona Engine**: Automatically categorizes viewers, tracks loyalty risk shifts, and identifies super-fans.
- **Smart Auto-Responder**: Context-aware, safety-guarded automated replies to help manage community engagement at scale.
- **Comprehensive Reporting**: Generate downloadable PDF reports detailing channel health, content gaps, and viral hooks.

---

## 🛠 Tech Stack

- **Frontend & Core**: [Next.js 16](https://nextjs.org/) (App Router), React 19, Tailwind CSS v4
- **Database & ORM**: PostgreSQL, `pgvector`, [Prisma](https://www.prisma.io/)
- **Backend Services**: [InsForge](https://insforge.com/) (Auth & PostgreSQL), [Inngest](https://www.inngest.com/) (Background Jobs & Workflows)
- **AI & ML**: Groq (Llama 3 8B/70B), Google GenAI (Gemini Embeddings)
- **Payments**: Razorpay (India) & Dodo (International)
- **Caching & Rate Limiting**: Upstash Redis

---

## 📁 Project Structure

```text
nexus-insights/
├── docs/                 # Documentation (API, Environment setup, AI Context)
├── prisma/               # Database schema configuration
├── public/               # Static assets (images, icons)
├── scripts/              # Utility scripts for DB syncing and usage reporting
└── src/
    ├── app/              # Next.js App Router (Pages, Layouts, API Routes)
    │   ├── (dashboard)/  # Protected authenticated routes
    │   ├── actions/      # Next.js Server Actions (Auth, Settings, YouTube)
    │   └── api/          # REST endpoints & Webhook listeners
    ├── components/       # Reusable React components (UI primitives, Layouts)
    ├── inngest/          # Background workflows (Auto-responder, Syncs)
    └── lib/              # Core business logic and integrations
        ├── ai/           # The 14-Node Agentic AI Engine
        ├── billing/      # Stripe/Razorpay/Dodo integration
        └── ...
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- An [InsForge](https://insforge.com/) account
- API Keys for Groq, Google GenAI, and your payment providers

### Installation & Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Rename `.env.example` to `.env` and fill in your keys. See `docs/INSFORGE_ENV.md` for a detailed breakdown of where to find InsForge keys.
   - You will need the **Project URL**, **Anon Key**, and **Postgres URL** from InsForge.
   - Ensure `DATABASE_URL` and `INSFORGE_DATABASE_URL` match your Postgres connection string.

3. **Database Initialization:**
   Run the SQL script found in `scripts/insforge-schema.sql` inside your InsForge SQL console to enable `pgvector`. Then, push your Prisma schema:
   ```bash
   npm run db:push
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

---

## 💳 Subscription Tiers

Nexus Insights uses a tiered usage model to support everyone from indie creators to massive agencies:

- **FREE** — 2 scans/month, access to core sentiment nodes.
- **CREATOR** — Delta comparison, persona engine, content gaps, and thread consensus.
- **GROWTH** — All 14 AI nodes, including leads engine, competitor radar, and objection mapping.
- **AGENCY** — Newsroom alerts, Bring Your Own Key (BYOK), API access, Webhooks, and PDF reports.

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start the production server |
| `npm run db:push` | Push Prisma schema changes to the database |
| `npm run db:studio` | Open Prisma Studio to view database contents |

---

© 2026 Nexus Insights Inc. All rights reserved.
