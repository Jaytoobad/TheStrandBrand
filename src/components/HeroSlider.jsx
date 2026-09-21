import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../config/siteConfig';

export default function HeroSlider() {
  const slides = siteConfig.heroSlides;
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  useEffect(() => {
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next]);

  const slide = slides[index];

  return (
    <section className="hero" style={{ backgroundImage: `url(${slide.image})` }}>
      <div className="hero-overlay" />
      <div className="container hero-content fade-in" key={index}>
        <h1>{slide.heading}</h1>
        <p>{slide.subheading}</p>
        <div className="hero-ctas">
          <Link to={slide.primaryCta.href} className="btn btn-primary">{slide.primaryCta.label}</Link>
          <Link to={slide.secondaryCta.href} className="btn btn-outline-light">{slide.secondaryCta.label}</Link>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button className="hero-arrow hero-arrow-left" onClick={prev} aria-label="Previous slide">‹</button>
          <button className="hero-arrow hero-arrow-right" onClick={next} aria-label="Next slide">›</button>
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button key={i} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
