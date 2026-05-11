import { useEffect, useState } from 'react';

export function useViewportWidth() {
  const [width, setWidth] = useState(() => (
    typeof window === 'undefined' ? 1440 : window.innerWidth
  ));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}
