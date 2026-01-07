import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { triggerGlitchTransition } from '../lib/glitchTransition';

export function RouteGlitchEffect() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (previousPathRef.current !== location.pathname) {
      triggerGlitchTransition(400);
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  return null;
}
