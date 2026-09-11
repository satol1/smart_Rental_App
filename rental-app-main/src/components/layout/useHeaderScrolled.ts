// src/components/layout/useHeaderScrolled.ts

import { useEffect, useState } from 'react';

/** Компактное состояние шапки включается после небольшого скролла. */
export function useHeaderScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}
