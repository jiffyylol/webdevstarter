import { Link, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import BestOfBayPage from './pages/BestOfBayPage';
import SearchPage from './pages/SearchPage';
import RestaurantPage from './pages/RestaurantPage';
import FavoritesPage from './pages/FavoritesPage';

// React Router: each <Route> maps a URL to a page component.
export default function App() {
  return (
    <div className="flex min-h-screen flex-col text-stone-900">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/best" element={<BestOfBayPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500">
        Restaurant data from Yelp · AI answers by OpenAI and can be wrong
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl">🥡</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <Link to="/" className="mt-6 inline-block font-semibold text-red-600 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
