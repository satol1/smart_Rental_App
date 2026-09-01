// src/hooks/useIntersectionObserver.ts

import { useEffect, useRef } from 'react';

export function useIntersectionObserver(
  targetRef: React.RefObject<HTMLElement | null>,
  onIntersect: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    // Создаем observer с настройками по умолчанию
    const defaultOptions: IntersectionObserverInit = {
      root: null, // viewport
      rootMargin: '0px',
      threshold: 0,
      ...options
    };

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        onIntersect(entry.isIntersecting);
      },
      defaultOptions
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [targetRef, onIntersect, options]);

  // Возвращаем функцию для ручного отключения observer
  const disconnect = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  };

  return { disconnect };
}
