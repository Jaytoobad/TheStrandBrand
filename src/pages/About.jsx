 import usePageMeta from '../hooks/usePageMeta'; 
export default function About() {
  usePageMeta('About', 'Learn more about TheStrandBrand and our commitment to providing premium wigs for the modern woman.');
return (
    <div className="container section content-page">
      <h1>About TheStrandBrand</h1>
      <p>TheStrandBrand was founded on a simple belief: every woman deserves hair that makes her feel like herself, only more so. We source and craft premium wigs that are as comfortable to wear as they are beautiful to look at.</p>

      <h2 id="story">Our Story</h2>
      <p>What started as a small passion for quality hair has grown into a trusted destination for women across Ghana looking for wigs that fit their lifestyle, their budget, and their crown.</p>

      <h2>Our Mission</h2>
      <p>To make premium-quality wigs accessible, convenient, and worth trusting — from browsing to delivery.</p>

      <h2>Our Vision</h2>
      <p>To become Ghana's most loved hair brand, known for quality, honesty, and styles that help women feel confident every day.</p>

      <h2>Our Core Values</h2>
      <ul>
        <li>Quality you can trust</li>
        <li>Honesty in every interaction</li>
        <li>Convenience without compromise</li>
        <li>Confidence, one crown at a time</li>
      </ul>

      <h2>Meet the CEO</h2>
      <div className="ceo-section">
        <img src="/assets/placeholder-ceo.jpg" alt="CEO of TheStrandBrand" />
        <div>
          <h3>[CEO Name]</h3>
          <p>[CEO biography — to be supplied by the business owner. Replace this placeholder in src/pages/About.jsx.]</p>
        </div>
      </div>
    </div>
  );
}
