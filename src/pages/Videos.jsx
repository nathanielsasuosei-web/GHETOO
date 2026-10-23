import VideoSection from '../components/VideoSection';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { compact } from '../lib/format';

export default function Videos() {
  const { site } = useSite();
  useReveal(site);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Visuals · {compact(site.stats.views)} views</span>
          <h1>Videos</h1>
          <p>Visuals, live sessions and studio diaries. Shot in Accra, mostly on borrowed cameras and stubbornness.</p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          {site.videos.length ? (
            <VideoSection videos={site.videos} />
          ) : (
            <div className="empty">No visuals published yet. Check back soon.</div>
          )}
        </div>
      </section>
    </>
  );
}
