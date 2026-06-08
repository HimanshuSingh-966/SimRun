'use client';

import { useEffect, useState } from 'react';
import App from '../App';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-muted)',
          fontSize: '1.125rem',
        }}
      >
        Loading...
      </div>
    );
  }

  return <App />;
}

