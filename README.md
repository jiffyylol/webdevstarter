# 🍜 Bay Bites

A full-stack restaurant guide for the San Francisco Bay Area. It uses the **Yelp Fusion API** for restaurant data and reviews, and the **OpenAI API** for an AI assistant that answers questions about specific restaurants.

Built for UC Berkeley Full Stack Decal, Project 2: APImagination.

## Features

- **Best of the Bay**: top-rated restaurants in San Francisco, Sausalito & Marin, and the East Bay (Berkeley, Oakland, Richmond, Emeryville, Albany, El Cerrito). Rankings are cached in MongoDB for 24 hours.
- **Search**: by keyword and location, with price, rating, and sort filters, plus "Load more".
- **Restaurant pages**: photos, hours, address, phone, and recent review excerpts.
- **AI assistant**: a side panel on every list and restaurant page. Ask things like "Is this good for a date?" or "Which of these is cheapest?". Conversations are saved in MongoDB.
- **Favorites**: save restaurants with the heart button. They're stored in MongoDB.

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React + TypeScript (Vite), React Router, Axios, Tailwind CSS |
| Backend | Node.js + Express, Axios |
| Database | MongoDB + Mongoose |
| APIs | Yelp Fusion, OpenAI Chat Completions |

## Folder structure

```
bay-bites/
├── client/                    React app (port 5173)
│   └── src/
│       ├── main.tsx           Starts React, wraps the app in the router + favorites provider
│       ├── App.tsx            All the routes (pages)
│       ├── api.ts             Every Axios call to our backend
│       ├── types.ts           TypeScript types for our data
│       ├── constants.ts       Regions, locations, sort options
│       ├── context/FavoritesContext.tsx   Shared favorites state (useContext)
│       ├── components/        Navbar, RestaurantCard, ChatPanel, StarRating, Status
│       └── pages/             Home, BestOfBay, Search, Restaurant, Favorites
└── server/                    Express API (port 5001)
    ├── index.js               Starts Express, connects to MongoDB, error handling
    ├── routes/                restaurants.js, favorites.js, chat.js
    ├── services/              yelp.js, openai.js, best.js (talk to outside APIs)
    ├── models/                Mongoose schemas: Favorite, ChatSession, BestCache
    └── utils/                 ApiError, asyncHandler, requireSession
```

## How data flows

```
Browser (React)  --Axios-->  /api/...  --Vite proxy-->  Express (localhost:5001)
                                                          ├── Yelp Fusion API  (restaurant data)
                                                          ├── OpenAI API       (chatbot answers)
                                                          └── MongoDB          (favorites, chats, cached rankings)
```

The browser never talks to Yelp or OpenAI directly. That keeps the API keys secret on the server, and Yelp blocks browser requests (CORS) anyway.

## Setup

You need Node.js and MongoDB running locally.

### 1. Start MongoDB

```bash
~/Downloads/mongodb-macos-aarch64-7.0.43/bin/mongod --dbpath ~/mongodb-data
```

Leave that terminal open.

### 2. Add your API keys

In `server/`, copy `.env.example` to `.env` and fill in:

- `YELP_API_KEY`: from https://www.yelp.com/developers (create an app)
- `OPENAI_API_KEY`: from https://platform.openai.com/api-keys (the API needs billing credits, separate from ChatGPT Plus)

`.env` is listed in `.gitignore`, so your keys never get pushed to GitHub.

### 3. Run the backend

```bash
cd server
npm install
npm run dev
```

You should see `MongoDB connected` and `API server running on http://localhost:5001`.

### 4. Run the frontend (in a second terminal)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## API routes

| Method | Route | What it does |
|---|---|---|
| GET | `/api/restaurants/search?term=&location=&price=&minRating=&sortBy=&offset=` | Search Yelp |
| GET | `/api/restaurants/best?region=sf\|marin\|eastbay` | Top-rated list (cached 24h in MongoDB) |
| GET | `/api/restaurants/:id` | Details + recent reviews |
| GET | `/api/favorites` | This browser's saved restaurants |
| POST | `/api/favorites` | Save a restaurant |
| DELETE | `/api/favorites/:yelpId` | Remove a favorite |
| GET | `/api/chat?contextKey=` | Saved chat messages |
| POST | `/api/chat` | Send a message to the AI |
| DELETE | `/api/chat?contextKey=` | Clear a chat |

## Checkoff guide: where each requirement is

**useState and useEffect**
- `pages/SearchPage.tsx`: useState holds the form, results, and loading/error state. useEffect re-runs the search whenever the URL's query string changes.
- `pages/RestaurantPage.tsx` and `pages/BestOfBayPage.tsx`: useEffect fetches data when `id` or `region` changes. The `cancelled` flag ignores responses from old requests.
- `components/ChatPanel.tsx`: useEffect loads chat history when the conversation changes, and scrolls to the newest message.
- Other hooks: `useContext` + a custom `useFavorites()` hook (`context/FavoritesContext.tsx`), `useMemo`, `useCallback`, `useRef` (chat scrolling), and React Router's `useParams`, `useSearchParams`, `useNavigate`.

**Multiple pages + React Router**
- `App.tsx` defines 5 routes: `/`, `/best`, `/search`, `/restaurant/:id`, `/favorites`, plus a 404 page.
- `components/Navbar.tsx` uses `NavLink` to highlight the current page.
- Search filters and the Best of the Bay region live in the URL (`useSearchParams`), so the back button and shared links work.

**Axios calling an HTTPS API**
- Frontend: `client/src/api.ts` creates an Axios instance for our backend.
- Backend: `server/services/yelp.js` and `server/services/openai.js` use Axios to call `https://api.yelp.com/v3` and `https://api.openai.com/v1`.

**Express server**
- `server/index.js` sets up Express, JSON parsing, the routes, a 404 handler, and an error handler.
- Routes are split into `routes/restaurants.js`, `routes/favorites.js`, and `routes/chat.js`.

**Database (MongoDB + Mongoose)**
- `models/Favorite.js`: saved restaurants per browser session.
- `models/ChatSession.js`: chat conversations, so they survive a refresh.
- `models/BestCache.js`: cached rankings with a TTL index that deletes them after 24 hours.

**How the chatbot works**
1. The user types a question in `ChatPanel`, which POSTs it to `/api/chat`.
2. On a restaurant page, the server fetches that restaurant's details and reviews from Yelp. On list pages, it uses the restaurants currently shown.
3. The server builds a system prompt telling the AI to use only that data, adds the last 10 messages, and calls OpenAI.
4. The reply is saved in MongoDB and sent back.

## Notes and limits

- Yelp's reviews endpoint only returns a few short review excerpts per restaurant, so the page links to Yelp for full reviews. Some Yelp API plans don't include reviews at all; the page handles that.
- The minimum-rating filter is applied by our server to each page of Yelp results (Yelp has no rating filter), so a page can show fewer than 20 results.
- Yelp only returns the first 240 results of a search.
- Change the AI model with `OPENAI_MODEL` in `server/.env`.
- Favorites and chats are tied to a random id stored in your browser's localStorage, so each browser has its own.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` | Start `mongod` (see Setup step 1) |
| "Can't reach the server" in the browser | Start the backend: `cd server && npm run dev` |
| "Yelp rejected the API key" | Check `YELP_API_KEY` in `server/.env`, then restart the server |
| "OpenAI account is out of credits" | Add billing at platform.openai.com |
| Port 5001 in use | Change `PORT` in `server/.env` and the proxy target in `client/vite.config.ts` |
