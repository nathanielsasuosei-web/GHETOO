import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Player from './Player';
import SupportModal from './SupportModal';
import { usePlayer } from '../context/PlayerContext';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { current } = usePlayer();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      {current ? <div className="player-spacer" /> : null}
      <Player />
      <SupportModal />
    </>
  );
}
