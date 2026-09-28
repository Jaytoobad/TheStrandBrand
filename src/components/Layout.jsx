import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import PageLoader from './PageLoader';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import ScrollToHash from './ScrollToHash';

export default function Layout() {
  return (
    <>
      <ScrollToHash />
      <Navbar />

      <main>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
