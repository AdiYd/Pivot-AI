# WhatsApp Inventory & Ordering Bot

A multi-tenant SaaS that lets restaurant owners manage suppliers, inventory, and orders entirely through WhatsApp.

## Features

- Onboard businesses in under 3 minutes
- Allow self-service definition of suppliers & stock baselines
- Proactively remind, complete and send orders
- Log deliveries, shortages & invoices
- Admin Panel for operations & analytics

## Tech Stack

- **Front-end**: Next.js 14 (App Router) with shadcn/ui, React 18, TypeScript
- **Backend**: Firebase Firestore, Cloud Functions, Storage
- **Authentication**: Firebase Auth with magic links
- **Messaging**: Twilio WhatsApp Business API
- **AI**: OpenAI GPT-4o for text understanding/summarization

## Project Structure

```
/
├── apps/
│   └── web-admin/      # Next.js admin panel
├── functions/          # Firebase Cloud Functions
└── packages/
    ├── schema/         # Shared TypeScript types
    └── botEngine/      # WhatsApp conversation state machine
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see below)
4. Start development:
   - Admin panel: `npm run dev`
   - Functions: `npm run dev:functions`

## Environment Variables

Rename `.env.example` to `.env.local` and fill in the required values:

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# OpenAI (for AI features)
OPENAI_API_KEY=
```

## License

Private

## Roadmap

- [x] Setup project structure
- [ ] Implement WhatsApp webhook endpoint
- [ ] Complete conversation state machine
- [ ] Build admin dashboard
- [ ] Add supplier management
- [ ] Integrate payment processing
