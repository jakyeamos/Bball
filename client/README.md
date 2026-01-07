# NBA Draft Simulator - React Client

React frontend for the NBA Draft Simulator with real-time WebSocket communication.

## Features

- **Real-time Updates**: Socket.io integration for live draft and league events
- **Responsive UI**: Works on desktop, tablet, and mobile
- **Type-Safe**: Full TypeScript with shared types from backend
- **Modern Stack**: React 18, Vite, Tailwind CSS

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Real-time**: Socket.io Client
- **State Management**: React Context

## Prerequisites

- Node.js 18+
- Running backend server (see ../server)

## Installation

```bash
# Install dependencies
npm install

# Install shared types
cd ../shared
npm install
npm run build
cd ../client
```

## Development

```bash
# Start dev server
npm run dev

# Server will start on http://localhost:3000
```

Make sure the backend is running on `http://localhost:3001` before starting the client.

## Build for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
client/
├── src/
│   ├── components/       # UI components (dumb)
│   │   └── common/       # Shared components (Button, Card, Input)
│   ├── contexts/         # React Context (AppContext)
│   ├── pages/            # Main pages (Lobby, Draft, Results)
│   ├── services/         # WebSocket service
│   ├── App.tsx           # Main app with routing
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
└── package.json
```

## Pages

1. **Lobby** (`/`) - Create or join a lobby
2. **Waiting Room** (`/waiting-room`) - Wait for lobby to fill
3. **Draft** (`/draft`) - Live draft interface
4. **Draft Recap** (`/draft-recap`) - View rosters after draft
5. **Results** (`/results`) - Regular season standings and playoffs

## Configuration

Environment variables in `.env`:

```env
VITE_SERVER_URL=http://localhost:3001
```

## Dumb UI Philosophy

All components are "dumb" - they receive data via props and emit events via callbacks. State management is handled at the top level via React Context, which listens to WebSocket events from the backend.

Components don't know about business logic, they just render what they're given.

## WebSocket Events

The app listens to these events from the server:

- `LOBBY_CREATED` / `LOBBY_UPDATED` - Lobby state changes
- `DRAFT_STARTED` / `DRAFT_UPDATED` - Draft state changes
- `PICK_MADE` - New pick made
- `TIMER_TICK` - Pick timer countdown
- `DRAFT_COMPLETED` - Draft finished
- `REGULAR_SEASON_STARTED` - Season results ready
- `PLAYOFFS_STARTED` - Playoff results ready
- `LEAGUE_UPDATED` - League phase changed

## State Management

Global state is managed by `AppContext`:

```typescript
const {
  lobby,           // Current lobby state
  draft,           // Current draft state
  league,          // Current league state
  allPlayers,      // All available players
  timeRemaining,   // Pick timer
  error,           // Error messages
} = useApp();
```

WebSocket connection is established automatically when the app mounts and events update the context state in real-time.

## Styling

Tailwind CSS is used for all styling with a custom color palette:

- Primary color: Blue (`primary-*`)
- Grays for text and backgrounds
- Semantic colors (green for success, red for danger, etc.)

Components use Tailwind utility classes directly.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## Troubleshooting

**WebSocket not connecting:**
- Ensure backend is running on port 3001
- Check CORS settings in backend
- Verify `VITE_SERVER_URL` in `.env`

**Types not found:**
- Make sure `../shared` is built: `cd ../shared && npm run build`
- Check that `@nba-draft-sim/shared` is properly linked

**Styles not loading:**
- Run `npm install` to ensure PostCSS and Tailwind are installed
- Check `tailwind.config.js` content paths

## License

MIT
