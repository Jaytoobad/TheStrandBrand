import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't automatically scroll to a URL's #section the way a
// traditional page reload does. This fixes that: whenever the URL has a
// #hash, it scrolls that element into view once the page has rendered.
export default function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const timeout = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return null;
}