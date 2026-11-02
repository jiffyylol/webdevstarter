import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BAY_AREA_LOCATIONS, REGIONS } from '../constants';

export default function HomePage() {
  const [term, setTerm] = useState('');
  const [location, setLocation] = useState('San Francisco, CA');
  const navigate = useNavigate();

  // Send the user to the Search page with their search in the URL.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (term.trim()) params.set('term', term.trim());
    if (location.trim()) params.set('location', location.trim());
    navigate(`/search?${params.toString()}`);
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
        <p className="text-sm font-bold uppercase tracking-widest text-red-600">San Francisco Bay Area</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
          Eat your way around the <span className="text-red-600">Bay</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-600">
          Find great restaurants from San Francisco to Sausalito to Berkeley, read recent reviews, and ask the AI
          assistant anything before you go.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-md ring-1 ring-stone-200 sm:flex-row"
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ramen, brunch, dim sum…"
            className="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            list="home-locations"
            placeholder="City"
            className="min-w-0 flex-1 rounded-xl border-stone-200 px-4 py-3 outline-none sm:border-l"
          />
          <datalist id="home-locations">
            {BAY_AREA_LOCATIONS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
          <button className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700">
            Search
          </button>
        </form>
      </section>

      {/* Regions: spaced-out alternating rows instead of a grid */}
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <h2 className="text-center text-3xl font-extrabold">Best of the Bay</h2>
          <p className="mt-2 text-center text-stone-600">Top-rated spots in each area, ranked by Yelp rating and review count.</p>

          <div className="mt-14 space-y-14">
            {REGIONS.map((r, i) => (
              <Link
                key={r.key}
                to={`/best?region=${r.key}`}
                className={`group flex flex-col items-center gap-6 text-center sm:items-center sm:text-left ${
                  i % 2 === 1 ? 'sm:flex-row-reverse sm:text-right' : 'sm:flex-row'
                }`}
              >
                <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-red-50 text-6xl transition group-hover:scale-105">
                  {r.emoji}
                </span>
                <div>
                  <h3 className="text-2xl font-bold">{r.name}</h3>
                  <p className="mt-1 text-stone-600">{r.blurb}</p>
                  <p className="mt-3 font-semibold text-red-600 group-hover:underline">See the top spots →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-stone-200">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:grid-cols-3">
          {[
            { emoji: '🔎', title: 'Search anywhere', text: 'Filter by price, rating, and distance across the Bay Area.' },
            { emoji: '💬', title: 'Ask the AI', text: '"Is this good for a date?" "What do people say about the service?"' },
            { emoji: '❤️', title: 'Save favorites', text: 'Keep a list of places you want to try.' },
          ].map((f) => (
            <div key={f.title}>
              <p className="text-3xl">{f.emoji}</p>
              <h3 className="mt-2 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
