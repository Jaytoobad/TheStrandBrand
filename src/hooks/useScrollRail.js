import { useCallback, useEffect, useRef, useState } from 'react';

// Tracks a horizontally scrolling rail: whether it can scroll either way, how
// far along it is (0..1) and how much of it is visible, plus a helper to move
// it by one "page". Pass the number of items so it re-measures when they load.
export default function useScrollRail(itemCount) {
  const ref = useRef(null);
  const [state, setState] = useState({ canPrev: false, canNext: false, progress: 0, visible: 1 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = {
      canPrev: el.scrollLeft > 4,
      canNext: el.scrollLeft < max - 4,
      progress: max > 0 ? el.scrollLeft / max : 0,
      visible: el.scrollWidth ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
    };
    setState((prev) => (
      prev.canPrev === next.canPrev && prev.canNext === next.canNext
        && Math.abs(prev.progress - next.progress) < 0.005 && Math.abs(prev.visible - next.visible) < 0.005
        ? prev : next
    ));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let frame = 0;
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    el.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(el);
    measure();
    return () => { el.removeEventListener('scroll', onScroll); observer.disconnect(); cancelAnimationFrame(frame); };
  }, [measure, itemCount]);

  const scrollByPage = useCallback((direction) => {
    const el = ref.current;
    if (!el) return;
    const item = el.firstElementChild;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = item ? item.getBoundingClientRect().width + gap : el.clientWidth;
    // Move by as many whole tiles as fit on screen, at least one.
    const tiles = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * tiles * step, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, []);

  return { ref, ...state, scrollByPage };
}
