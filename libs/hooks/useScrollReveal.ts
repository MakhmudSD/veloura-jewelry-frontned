import { useEffect, useRef } from 'react';

export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('v-revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px', ...options },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
