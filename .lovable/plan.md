

# Stella OS — Complete Build Plan

## Summary
Build the entire Stella AI cockpit UI from scratch: custom dark theme, 52px icon sidebar, chat view with mock conversation, settings dashboard, composer, and a 240px conversation history drawer. Pure frontend, all mock data.

## New Dependencies
- `framer-motion` — animations (message fade-in, drawer slide, pulsing dots)
- `react-markdown` + `remark-gfm` — render markdown in Stella messages

## Files to Create/Modify

### 1. Theme & Config
- **`tailwind.config.ts`** — Add Stella color tokens (`stella-bg`, `stella-surface`, `stella-sidebar`, `stella-terra`, `stella-green`, `stella-indigo`, text variants), plus `pulse-dot` keyframe animation
- **`src/index.css`** — Replace CSS variables with Stella's warm dark palette, set system font stack, add custom scrollbar styles, global dark background `#1a1916`

### 2. Types — `src/components/stella/types.ts`
Interfaces: `Message` (id, role, content, timestamp, showActions, showRunCard), `Conversation` (id, title, timestamp), `PipelineStage` (name, status, elapsed), `ModelRoute`, `OllamaModel`

### 3. Mock Data — `src/components/stella/mockData.ts`
- Pre-populated chat messages (4 messages: Stella greeting → user idea → Stella response with actions → run progress card)
- Pipeline stages (research, 3 complete, 1 active, rest pending)
- Conversation history list (5 items)
- Settings data (model routing table, monthly stats, Ollama models)

### 4. Components — `src/components/stella/`

| Component | Description |
|-----------|-------------|
| **`Sidebar.tsx`** | 52px fixed icon strip. Stella "S" logo with gradient. Chat + Settings nav icons. Chat icon toggles history drawer. Active state = terra glow. |
| **`ConversationHistory.tsx`** | 240px drawer, fixed at `left: 52px`, slides in via Framer Motion. "New chat" button at top. List of past conversations with title + timestamp. Active = terra highlight. Backdrop overlay to dismiss. |
| **`Topbar.tsx`** | 48px bar. "Stella" title left, "Clear chat" button right. Bottom border. |
| **`ChatView.tsx`** | Scrollable message list, 680px max-width centered, 32px/48px padding. Maps messages to MessageBubble components. |
| **`MessageBubble.tsx`** | Stella messages: avatar (terra circle + sparkle) left, markdown content, no bubble. User messages: right-aligned, terra-tinted bubble with rounded corners. Framer Motion fade+slide. |
| **`ActionButtons.tsx`** | Three pills below a Stella message: Research (terra solid), Build (green outline), Both (indigo outline). |
| **`RunProgressCard.tsx`** | Inline card showing pipeline stages. Completed = star icon + time. Active = pulsing terra dot. Pending = outline circle. Badge for pipeline type. |
| **`Composer.tsx`** | Bottom input bar. Paperclip icon, auto-expanding textarea, send button (gray when empty, terra when has text). Hint text below. |
| **`SettingsView.tsx`** | Three sections: Active Models table, This Month stat cards (runs/cost/tokens), Local Models list with green status dots. |

### 5. Main Page — `src/pages/Index.tsx`
- State: `activeView` (chat/settings), `historyOpen`, `activeConversationId`, `messages`
- Layout: `flex` row — Sidebar (fixed 52px) + ConversationHistory (conditional) + main area (Topbar + ChatView/SettingsView + Composer)
- Handles send message (appends user + mock Stella reply), clear chat, conversation switching, action button clicks

### 6. App.tsx
- No changes needed (Index already at `/`)

## Component Tree
```text
Index (page)
├── Sidebar (fixed left, 52px)
├── ConversationHistory (overlay drawer, 240px, conditional)
└── Main Area (margin-left: 52px)
    ├── Topbar (48px)
    ├── ChatView OR SettingsView
    │   ├── MessageBubble (× N)
    │   │   ├── ActionButtons (conditional)
    │   │   └── RunProgressCard (conditional)
    │   └── ...
    └── Composer (bottom, chat only)
```

## Mobile (≤768px)
- Sidebar hidden, hamburger icon in Topbar toggles it as overlay
- Sidebar + ConversationHistory both slide in as overlays with backdrop
- Chat padding reduced to 20px
- Composer fixed at bottom

## Key Interactions (all local state, no API)
- Click Chat icon → toggle conversation history drawer
- Click conversation → switch active conversation (visual only)
- Click "New chat" → clear messages, close drawer
- Click Research/Build/Both → append run progress card message
- Type + send → append user message + mock Stella reply
- Click Settings → switch to settings view
- Click "Clear chat" → reset messages to empty

