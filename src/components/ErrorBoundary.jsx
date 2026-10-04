import { Component } from 'react';
import { reportError } from '../lib/errorReporter';

// Catches a render crash anywhere below it. Without this, a React render error
// is consumed by the nearest error boundary and never reaches window.onerror, so
// it would never be reported at all.
//
// The fallback says the same thing the previous boundary did. It deliberately
// does not show the error text: a crash message can contain an order number or a
// customer's name, and this is rendered to whoever is on screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { source: 'react-boundary', componentStack: info?.componentStack?.slice(0, 500) || null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 60, textAlign: 'center' }}>
          Something went wrong. Please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}