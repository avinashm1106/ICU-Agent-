# ✳ ICU COMMAND — AI-Powered ICU Task Orchestration Platform

> **An enterprise healthcare command-center platform engineered for Intensive Care Unit (ICU) operations and accountability.**  
> Doctor speaks → AI extracts structured tasks → Staff receive individual WhatsApp messages → Staff confirm via YES/NO → Live dashboard updates → Automated reminders & escalations.

---

## 1. Project Overview

In a critical care environment, ICU consultants delegate dozens of urgent clinical operations to cross-functional teams: charge nurses, respiratory technicians, duty doctors, and ward staff. Verbal handovers are vulnerable to miscommunication, forgotten instructions, and lack of closed-loop accountability.

**ICU COMMAND** solves this problem by transforming spoken clinical commands into structured tasks, dispatching individual WhatsApp-style messages to designated staff members, and tracking real-time status (Pending → Completed / Blocked / Overdue) on a centralized live operations board.

> [!IMPORTANT]
> **Safety & Clinical Boundaries**: ICU COMMAND is strictly an **operational task coordination and accountability platform**. It does **NOT** diagnose diseases, suggest clinical interventions, or invent medication regimens. Ambiguous verbal requests are explicitly flagged for consultant confirmation.

---

## 2. System Architecture

```mermaid
flowchart TD
    Consultant[🎙 ICU Consultant Voice / Manual] -->|Audio Stream| VoiceAPI[/api/voice/transcribe - Groq Whisper/]
    VoiceAPI -->|Spoken Transcript| LLM[/api/ai/extract-tasks - Groq Llama 3.3/]
    LLM -->|Structured Task JSON| ReviewModal[Task Review & Confirmation]
    ReviewModal -->|Confirm & Dispatch| TaskEngine[Central Task Engine]
    
    TaskEngine -->|PostgreSQL Transaction| DB[(Prisma / PostgreSQL)]
    TaskEngine -->|Outgoing Notification| MockWhatsApp[Multi-Account Mock WhatsApp Provider]
    
    MockWhatsApp --> Staff1[Nurse Anitha: Bed 8 Meds]
    MockWhatsApp --> Staff2[Ramesh: Bed 12 Ventilator]
    MockWhatsApp --> Staff3[Sister Priya: Crash Trolley]
    
    Staff1 -->|Reply: YES| TaskEngine
    Staff2 -->|Reply: NO + Reason| TaskEngine
    
    TaskEngine -->|State Change Event| EventBus[Server-Sent Events /api/events]
    EventBus -->|Real-Time Broadcast| Dashboard[ICU Command Center Dashboard]
    
    Scheduler[Escalation Cycle /api/cron] -->|Thresholds Exceeded| RemindAction[Automatic Reminders & Consultant Alert]
```

---

## 3. Key Features

- **🎙 Real-time Voice Agent**: Browser `MediaRecorder` recording with audio waveform animation, server-side Whisper transcription, and structured task extraction.
- **🤖 Safe AI Task Extraction**: Parses complex clinical sentences (e.g., *"Nurse Anitha, check medication chart for Bed 8. Ramesh, check ventilator settings for Bed 12."*), resolves names against the hospital staff roster, and detects implied priority.
- **📱 Multi-Account Mock WhatsApp**:
  - Individual inboxes for every staff member (`/whatsapp`).
  - **Privileged 6-Inbox Multi-Account Simulator** (`/demo/whatsapp-simulator`) allowing consultants to watch all staff inboxes simultaneously in split or 6-inbox grid mode.
  - Interactive **[YES — Completed]** and **[NO — Unable]** buttons inside the WhatsApp message bubbles.
- **⚡ Live Command Center Dashboard**: Real-time KPI statistics (Total, Completed, Pending, Overdue, Blocked, Critical), live task board with status tabs, and dynamic staff workload panels.
- **🔄 Closed-Loop Reassignment & Escalation**:
  - Staff replying **NO** marks task as **BLOCKED**, logs reason, alerts the consultant, and opens instant reassignment.
  - Configurable escalation timers: 1st Reminder → 2nd Reminder → Consultant Alert.
  - Fast demo presets: **30 seconds, 1 minute, 2 minutes, 5 minutes**.
- **📊 Real Analytics (Recharts)**: Completion rates, turnaround velocity, overdue percentages, tasks by staff, status donuts, and hourly dispatch volume.
- **🛡 Full Compliance Audit Trail**: Immutable log of every login, voice session, extraction, task dispatch, WhatsApp message, staff response, and escalation trigger.
- **🎮 Demo Toolbar**: Live simulation buttons for `Simulate YES`, `Simulate NO`, `Simulate Delay`, `Trigger Reminder`, and `Run Escalation Check`.

---

## 4. Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Next.js API Routes (Node.js runtime), Server-Sent Events (SSE)
- **Database**: PostgreSQL 16, Prisma ORM 6
- **Authentication**: NextAuth.js (Session & JWT-based RBAC)
- **AI Infrastructure**:
  - Speech-to-Text: Groq Whisper API (`whisper-large-v3-turbo`)
  - LLM Structured Extraction: Groq Llama 3.3 (`llama-3.3-70b-versatile`) with structured JSON mode and rule-based demo fallback
- **Messaging**: Pluggable `WhatsAppProvider` (`MockWhatsAppProvider` with planned `MetaWhatsAppProvider`)
- **Testing**: Vitest for unit & integration testing

---

## 5. Design System

The entire platform uses a calm, clinical healthcare command-center palette:
- **Primary Dark Green**: `#123C2F` (Hospital command identity)
- **Secondary Dark Green**: `#1B5E4B` (Interactive states & primary buttons)
- **Warm Beige Background**: `#FAF8F2` (Low eye fatigue during long shifts)
- **Light Beige Panels**: `#F4EFE3`
- **Muted Sage Border**: `#DDE8DF`
- **Primary Text**: `#18312A`
- **Muted Text**: `#65756E`

---

## 6. Demo Accounts & Credentials

The database is pre-seeded with realistic healthcare roles:

| Role | Name | Email | Password | Responsibilities |
|---|---|---|---|---|
| **CONSULTANT** | Dr. Arjun Mehta | `consultant@icu-demo.com` | `Doctor@123` | Start voice agent, review & dispatch tasks, live dashboard, reassign, remind |
| **ADMIN** | System Admin | `admin@icu-demo.com` | `Admin@123` | User management, ICU ward setup, escalation threshold configuration, audit logs |
| **STAFF** | Nurse Anitha | `anitha@icu-demo.com` | `Staff@123` | Staff nurse (Medication, bedside care) |
| **STAFF** | Ramesh | `ramesh@icu-demo.com` | `Staff@123` | Respiratory & Ventilator Technician |
| **STAFF** | Sister Priya | `priya@icu-demo.com` | `Staff@123` | Charge Nurse (Trolley, inventory, handover) |
| **STAFF** | Dr. Kumar | `kumar@icu-demo.com` | `Staff@123` | ICU Resident Doctor (Lab & ABG review) |
| **STAFF** | Suresh | `suresh@icu-demo.com` | `Staff@123` | ICU Support Technician |
| **STAFF** | Meera | `meera@icu-demo.com` | `Staff@123` | Staff Nurse |

> [!TIP]
> On the `/login` screen, a **Demo Environment panel** provides one-click quick-fill buttons for each user role.

---

## 7. Folder Structure

```
├── app/
│   ├── (main)/
│   │   ├── layout.tsx                 # Role-based responsive navigation layout
│   │   ├── dashboard/page.tsx         # Consultant Command Center
│   │   ├── voice/page.tsx             # Voice Agent recording & task extraction
│   │   ├── tasks/page.tsx             # Task board, filters, search & manual dispatch
│   │   ├── whatsapp/page.tsx          # Staff personal WhatsApp view
│   │   ├── demo/whatsapp-simulator/   # 6-Inbox Multi-Account Simulator
│   │   ├── analytics/page.tsx         # Recharts operations analytics
│   │   ├── voice-history/page.tsx     # Past voice sessions & AI extraction logs
│   │   ├── audit/page.tsx             # Immutable event audit trail
│   │   └── admin/page.tsx             # Ward management & escalation controls
│   ├── api/
│   │   ├── ai/extract-tasks/          # LLM structured JSON task extraction
│   │   ├── audit/                     # Audit trail query endpoint
│   │   ├── auth/[...nextauth]/        # NextAuth authentication handlers
│   │   ├── cron/                      # Scheduled escalation & reminder runner
│   │   ├── dashboard/                 # Aggregated metrics, tasks, and staff workload
│   │   ├── demo/                      # Demo actions (Simulate YES/NO/Delay/Reset)
│   │   ├── escalation/                # Escalation threshold read/write
│   │   ├── events/                    # Server-Sent Events (SSE) live broadcast stream
│   │   ├── notifications/             # Staff & consultant alerts
│   │   ├── staff/                     # ICU staff roster & workload counts
│   │   ├── tasks/                     # Task CRUD, filters, and duplicate prevention
│   │   │   └── [id]/                  # Task detail, patch, remind, reassign, cancel
│   │   ├── users/                     # Admin user management
│   │   ├── voice-sessions/            # Session history
│   │   ├── voice/transcribe/          # Whisper audio transcription
│   │   └── whatsapp/                  # Multi-account WhatsApp messaging & responses
│   ├── login/page.tsx                 # Healthcare command-center login
│   ├── globals.css                    # Tailwind design system tokens
│   └── layout.tsx                     # Root document
├── components/
│   ├── demo/demo-toolbar.tsx          # Simulation & preset toolbar
│   ├── tasks/
│   │   ├── task-card.tsx              # Rich clinical task card
│   │   ├── create-task-modal.tsx      # Manual task creation modal
│   │   └── reassign-modal.tsx         # Dropdown reassignment modal
│   ├── whatsapp/whatsapp-chat.tsx     # Full WhatsApp message bubbles & buttons
│   ├── logout.tsx                     # Logout trigger
│   └── use-data.ts                    # Real-time SSE hooks & data fetchers
├── lib/
│   ├── ai/provider.ts                 # AIProvider interface & GroqProvider
│   ├── audit/audit.ts                 # Centralized audit logger
│   ├── auth.ts                        # NextAuth configuration
│   ├── db.ts                          # Prisma database client
│   ├── escalation/scheduler.ts        # Escalation cycle & overdue evaluation
│   ├── events.ts                      # In-process SSE event bus singleton
│   ├── tasks/task-engine.ts           # Task state machine & atomic operations
│   ├── validation.ts                  # Zod validation schemas
│   └── whatsapp/provider.ts           # WhatsAppProvider & MockWhatsAppProvider
├── prisma/
│   ├── schema.prisma                  # Complete PostgreSQL schema
│   └── seed.ts                        # Database seed script
├── tests/
│   └── task-engine.test.ts            # State machine & provider test suite
├── docker-compose.yml                 # Local PostgreSQL container definition
├── vitest.config.ts                   # Vitest configuration with path aliases
└── package.json
```

---

## 8. Prerequisites & Installation

### Prerequisites
- **Node.js**: v18.18+ or v20+ (tested on Node v24)
- **Package Manager**: npm
- **Database**: PostgreSQL 14+ (or Docker)

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Ensure `.env` contains your preferred configuration:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/icu_command?schema=public"
NEXTAUTH_SECRET="icu-command-secure-production-secret-key-2026-demo"
NEXTAUTH_URL="http://localhost:3000"
AI_PROVIDER="groq"
AI_API_KEY=""
AI_MODEL="llama-3.3-70b-versatile"
AI_TRANSCRIPTION_MODEL="whisper-large-v3-turbo"
WHATSAPP_PROVIDER="mock"
DEMO_MODE="true"
```

> **Note on AI Keys**: If `AI_API_KEY` is not provided, the application runs seamlessly in **DEMO_MODE** using intelligent rule-based parsing. To use live Groq speech-to-text and LLM inference, obtain a free API key at [console.groq.com](https://console.groq.com) and set `AI_API_KEY=gsk_...`.

### Step 3: Start PostgreSQL
With Docker:
```powershell
docker compose up -d
```
*(Or point `DATABASE_URL` in `.env` to any existing PostgreSQL instance).*

### Step 4: Run Prisma Migrations & Seed
```powershell
npx prisma generate
npx prisma db push
npm run db:seed
```

### Step 5: Start Local Development Server
```powershell
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 9. Verification & Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server with hot-reload |
| `npm run build` | Generate Prisma client and compile Next.js production build |
| `npm run start` | Start Next.js production server |
| `npm run test` | Run Vitest unit & integration test suite (16 tests) |
| `npm run db:seed` | Re-seed hospital, ICU, 20 beds, 8 users, and 44 tasks |
| `npm run db:reset`| Reset database and re-seed |

---

## 10. Step-by-Step Demonstration Workflow

Follow this scenario to demonstrate the platform live:

1. **Sign In**: Navigate to `http://localhost:3000/login` and click **Dr. Arjun (Consultant)**.
2. **Start Voice Agent**:
   - Go to **Voice Agent** (`/voice`).
   - Click the prominent **🎙 START VOICE AGENT** button (or click any of the preset sample transcripts).
   - Say: *"Nurse Anitha check the medication chart for Bed 8. Ramesh check ventilator settings for Bed 12. Sister Priya make sure emergency trolley is stocked."*
3. **AI Task Extraction**:
   - The AI transcribes the audio and extracts 3 structured tasks.
   - Review the tasks on the confirmation card:
     - Task 1: Check medication chart → Assigned to *Nurse Anitha*, Bed 8
     - Task 2: Check ventilator settings → Assigned to *Ramesh*, Bed 12
     - Task 3: Check emergency trolley → Assigned to *Sister Priya*
4. **Dispatch Tasks**:
   - Click **CONFIRM & DISPATCH ALL TASKS**.
5. **Observe WhatsApp Multi-Account Simulator**:
   - Open **WhatsApp Simulator** (`/demo/whatsapp-simulator`).
   - Toggle to **6-Inbox Grid View** or click each staff member tab (*Anitha*, *Ramesh*, *Priya*).
   - Notice all 3 dispatch messages arrived in the respective inboxes.
6. **Simulate YES / NO**:
   - In Anitha's inbox, click **[YES — Completed]**.
   - Watch the message update with checkmarks and system confirmation: *"Task marked as COMPLETED"*.
   - In Ramesh's inbox, click **[NO — Unable]** and provide a reason (e.g. *"Assisting with emergency intubation"*).
   - Notice Ramesh's task becomes **BLOCKED**, and an alert banner appears for the consultant.
7. **Live Dashboard Reflection**:
   - Go to **Command Center** (`/dashboard`).
   - Notice the metrics automatically updated without manual page refresh via Server-Sent Events!
   - Completed: `+1`, Blocked: `+1`.
8. **Reassignment**:
   - Click **Reassign** on Ramesh's blocked task and assign it to **Suresh**.
   - Check Suresh's WhatsApp inbox: a new message arrives with the reassigned task.
9. **Automated Escalation**:
   - Use the **Demo Toolbar** to trigger an escalation check or select **⚡ 30s Fast Demo** escalation timing.
   - Pending tasks trigger automated Level 1 and Level 2 reminders and consultant alerts.
10. **Audit Log Verification**:
    - Open **Audit Trail** (`/audit`) to inspect the timestamped, immutable history of each action.

---

## 11. Production WhatsApp Cloud API Migration

The messaging layer is decoupled behind `WhatsAppProvider` (`lib/whatsapp/provider.ts`):

To connect Meta's official WhatsApp Business Cloud API in production:
1. Set `WHATSAPP_PROVIDER=meta` in `.env`.
2. Configure Meta Cloud API credentials:
   - `META_WA_PHONE_NUMBER_ID`
   - `META_WA_ACCESS_TOKEN`
3. Implement `MetaWhatsAppProvider.sendMessage()` to call `https://graph.facebook.com/v21.0/{phone-number-id}/messages`.
4. The core task engine, audit logs, and state machines require zero modification.

---

## 12. Troubleshooting

- **Microphone Access Denied**: Ensure browser permissions allow microphone input for `localhost`. If using a browser without a mic, use the pre-built sample transcript buttons.
- **Port 5432 in Use**: Modify `DATABASE_URL` in `.env` and port mapping in `docker-compose.yml` (e.g., `"5433:5432"`).
- **Prisma Schema Updates**: Whenever editing `prisma/schema.prisma`, execute `npx prisma generate` and `npx prisma db push`.
