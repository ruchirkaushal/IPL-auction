import { useState, useEffect } from 'react';

export default function useDeviceDetect() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      
      // Determine if it's a phone. iPads/tablets have much larger dimensions.
      // A phone in portrait has a narrow width (< 600px).
      // A phone in landscape has a narrow height (< 500px).
      const phone = (portrait && window.innerWidth < 600) || (!portrait && window.innerHeight < 500);

      setIsPortrait(portrait);
      setIsPhone(phone);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return { isPortrait, isLandscape: !isPortrait, isPhone };
}
