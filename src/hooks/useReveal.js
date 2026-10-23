import { useEffect } from 'react';

/** Fades in every `.reveal` element as it enters the viewport. */
export default function useReveal(dep) {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [dep]);
}
