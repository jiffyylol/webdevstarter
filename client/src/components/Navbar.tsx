import { Link, NavLink } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/best', label: 'Best of the Bay', end: false },
  { to: '/search', label: 'Search', end: false },
  { to: '/favorites', label: 'Favorites', end: false },
];

export default function Navbar() {
  const { favorites } = useFavorites();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="shrink-0 text-xl font-extrabold tracking-tight">
          🍜 <span className="text-red-600">Bay</span> Bites
        </Link>
        {/* ml-auto pushes the links right; overflow-x-auto lets them scroll on small screens */}
        <nav className="ml-auto flex min-w-0 gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            // NavLink knows whether its page is the current one (isActive).
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  isActive ? 'bg-red-600 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              {link.label}
              {link.to === '/favorites' && favorites.length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-xs">{favorites.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
