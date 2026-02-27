# TARS Chat

A production-ready, real-time chat application built with **Next.js 16**, **Convex**, and **Clerk** — featuring WhatsApp-style interactions for both mobile and desktop.

🔗 **Live Demo:** [tars-assignment-gules.vercel.app](https://tars-assignment-gules.vercel.app)

---

## ✨ Features

### 🔐 Authentication
- Sign up / log in via **email or social providers** (powered by Clerk)
- Logged-in user's name and avatar displayed in the sidebar
- User profiles stored and synced in Convex

### 💬 Messaging
- **Real-time one-on-one direct messages** via Convex live subscriptions
- **Group chats** — create groups, name them, add/remove members
- **Message timestamps** — time-only for today, date+time for older messages, year included across years
- **Typing indicators** — live "X is typing…" shown to the other participant
- **Emoji reactions** — react to any message; toggle on/off
- **Reply to messages** — swipe right on mobile, arrow menu on desktop; quoted preview appears above the input and links back to the original message
- **Delete messages** — single delete or bulk delete (multi-select)
- **Deleted message placeholder** — "This message was deleted" shown in place of removed content

### 👥 Group Admin Controls
- **Create group** — pick a name and select members
- **Admin actions** — rename group, add/remove members, promote/demote admins
- **Admin badge** — admin members marked with a crown icon

### 📱 Mobile Experience
- Full-screen sidebar ↔ full-screen chat (no split view on mobile)
- **Swipe right** to reply to a message
- **Long press** to enter multi-select mode for bulk delete
- **Browser/Android back button** returns to the contacts list
- Auto-scroll to latest message when opening a conversation

### 🖥️ Desktop Experience
- **Resizable sidebar** — drag the divider to adjust width (min 240px, max 480px)
- **Hover actions** — emoji picker floats outside the bubble; chevron inside the bubble top-right opens a Reply / Delete dropdown
- **Right-click context menu** on any message for Reply, Reactions, or Delete

### 🎨 UI / UX
- WhatsApp-style message bubbles with tails, timestamps inline, and grouped consecutive messages
- Unread message count badges in the sidebar
- Online/offline status indicators
- Avatar lightbox — click any avatar to view full-size
- Empty states for no conversations, no messages, no search results
- Fixed header (name/avatar) and fixed input bar; only messages scroll

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Database / Real-time | [Convex](https://convex.dev) |
| Authentication | [Clerk](https://clerk.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Date formatting | [date-fns](https://date-fns.org) |
| Language | TypeScript |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account

### 1. Clone the repository
```bash
git clone https://github.com/vaibhavVS18/tars-assignment.git
cd tars-assignment/tars-chat
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 4. Configure Clerk JWT with Convex

In your Convex dashboard, add Clerk as a JWT provider using your Clerk issuer URL.

Update `convex/auth.config.ts`:
```ts
export default {
  providers: [
    {
      domain: "https://<your-clerk-frontend-api>",
      applicationID: "convex",
    },
  ],
};
```

### 5. Deploy Convex backend
```bash
npx convex dev
```

### 6. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
tars-chat/
├── convex/                  # Convex backend
│   ├── schema.ts            # Database schema
│   ├── auth.config.ts       # Clerk JWT config
│   ├── conversations.ts     # Conversation & group mutations/queries
│   ├── messages.ts          # Message send, delete, react, reply queries/mutations
│   ├── users.ts             # User discovery & presence
│   └── typing.ts            # Typing indicator mutations
│
├── src/
│   ├── app/
│   │   ├── page.tsx         # Root layout: mobile/desktop split logic + sidebar resize
│   │   ├── layout.tsx       # App shell, providers
│   │   ├── globals.css      # Global styles
│   │   ├── sign-in/         # Clerk sign-in page
│   │   └── sign-up/         # Clerk sign-up page
│   │
│   ├── components/
│   │   ├── Sidebar.tsx      # Contact list, search, tabs, group create modal
│   │   ├── ChatArea.tsx     # Full chat UI — messages, reactions, reply, delete
│   │   └── AvatarLightbox.tsx  # Full-screen avatar viewer
│   │
│   └── providers/
│       └── ConvexClientProvider.tsx  # Convex + Clerk provider wrapper
│
├── middleware.ts            # Clerk auth middleware
└── next.config.ts
```

---

## 📸 Key Interactions

| Interaction | Mobile | Desktop |
|---|---|---|
| Open chat | Tap from sidebar | Click from sidebar |
| Reply | Swipe right | Hover → chevron → Reply |
| Delete | Long press → select → delete | Hover → chevron → Delete |
| Reactions | Emoji button (outside bubble) | Hover → emoji picker |
| Multi-delete | Long press → select multiple | — |
| Go back | Android back or ← button | — |

---

## 📄 License

This project was built as part of the **TARS Assignment**.
