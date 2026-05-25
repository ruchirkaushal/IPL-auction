import React from 'react';
import useDeviceDetect from '../hooks/useDeviceDetect';
import DesktopAuctionLayout from './DesktopAuctionLayout';
import MobileLandscapeAuction from './MobileLandscapeAuction';
import MobilePortraitAuction from './MobilePortraitAuction';

interface ResponsiveAuctionLayoutProps {
  roomCode: string;
  roomState: any;
  allPlayers: any[];
  myTeamId: string | null;
  socket: any;
  videoManager: any;
  canBid: boolean;
  canUserBid: boolean;
  isHost: boolean;
  soldPlayers: any[];
  unsoldPlayers: any[];
  highestBidderId: string | null;
  actions: any;
}

/**
 * ResponsiveAuctionLayout - Renders appropriate layout based on device and orientation
 * Desktop → DesktopAuctionLayout
 * Tablet → TabletAuctionLayout
 * Mobile Landscape → MobileLandscapeAuction
 * Mobile Portrait → MobilePortraitAuction (NEW)
 */
export const ResponsiveAuctionLayout: React.FC<ResponsiveAuctionLayoutProps> = (props) => {
  const { isPhone, isTablet, isPortrait, isLandscape } = useDeviceDetect();

  // Desktop layout
  if (!isPhone && !isTablet) {
    return <DesktopAuctionLayout {...props} />;
  }

  // Tablet landscape layout
  if (isTablet && isLandscape) {
    return <DesktopAuctionLayout {...props} />;
  }

  // Tablet portrait layout
  if (isTablet && isPortrait) {
    return <MobilePortraitAuction {...props} />;
  }

  // Mobile landscape layout
  if (isPhone && isLandscape) {
    return <MobileLandscapeAuction {...props} />;
  }

  // Mobile portrait layout (NEW - previously showed overlay)
  if (isPhone && isPortrait) {
    return <MobilePortraitAuction {...props} />;
  }

  // Fallback
  return <DesktopAuctionLayout {...props} />;
};

export default ResponsiveAuctionLayout;
