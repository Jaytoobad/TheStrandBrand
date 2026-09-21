import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container section empty-state">
      <h1>404</h1>
      <p>We couldn't find the page you're looking for.</p>
      <Link to="/" className="btn btn-primary">Back Home</Link>
    </div>
  );
}
