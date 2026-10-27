import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Music from './pages/Music';
import Videos from './pages/Videos';
import Events from './pages/Events';
import Merch from './pages/Merch';
import Support from './pages/Support';
import About from './pages/About';
import ThankYou from './pages/ThankYou';
import NotFound from './pages/NotFound';
import Studio from './pages/Studio';
import { useSite } from './context/SiteContext';

function Shell({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { loading, error, reload } = useSite();

  if (loading) {
    return (
      <div className="loading-screen">
        <div>
          <div className="loader" />
          <p className="muted" style={{ letterSpacing: '0.2em', fontSize: 11, textTransform: 'uppercase' }}>
            Young Silence
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-screen">
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, marginBottom: 12 }}>The music is offline.</h1>
          <p className="muted" style={{ marginBottom: 8 }}>
            {error}
          </p>
          <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
            If the site was quiet for a while the server may still be waking up — give it a
            minute, then try again.
          </p>
          <button className="btn btn--gold" onClick={reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/studio/*" element={<Studio />} />
      <Route
        path="/"
        element={
          <Shell>
            <Home />
          </Shell>
        }
      />
      <Route
        path="/music"
        element={
          <Shell>
            <Music />
          </Shell>
        }
      />
      <Route
        path="/videos"
        element={
          <Shell>
            <Videos />
          </Shell>
        }
      />
      <Route
        path="/events"
        element={
          <Shell>
            <Events />
          </Shell>
        }
      />
      <Route
        path="/merch"
        element={
          <Shell>
            <Merch />
          </Shell>
        }
      />
      <Route
        path="/support"
        element={
          <Shell>
            <Support />
          </Shell>
        }
      />
      <Route
        path="/about"
        element={
          <Shell>
            <About />
          </Shell>
        }
      />
      <Route
        path="/thank-you"
        element={
          <Shell>
            <ThankYou />
          </Shell>
        }
      />
      <Route
        path="*"
        element={
          <Shell>
            <NotFound />
          </Shell>
        }
      />
    </Routes>
  );
}
