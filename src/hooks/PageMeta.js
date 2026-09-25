import { useEffect } from 'react';

// Sets the browser tab title and the page's meta description.
// Call it once near the top of any page component, e.g.:
//   usePageMeta('Shop All', 'Browse premium wigs — body wave, bone straight, curly and more.');
export default function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | TheStrandBrand` : 'TheStrandBrand — Your Hair. Your Crown.';

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}