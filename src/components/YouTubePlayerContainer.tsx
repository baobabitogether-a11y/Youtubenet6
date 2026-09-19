import React, { forwardRef } from 'react';

interface YouTubePlayerContainerProps {
  embedUrl: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const YouTubePlayerContainer = forwardRef<HTMLIFrameElement, YouTubePlayerContainerProps>(
  ({ embedUrl, onClick, className = '', children }, ref) => {
    return (
      <div
        id="compact-video-player-container"
        data-testid="compact-video-player-container"
        onClick={onClick}
        className={`relative w-full h-full min-h-[280px] flex-1 flex items-center justify-center bg-black overflow-hidden select-none touch-manipulation ${className}`}
      >
        {/* YouTube Video Iframe */}
        <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
          <iframe
            ref={ref}
            id="youtube-player-iframe"
            data-testid="youtube-video-player-iframe"
            title="YouTube video player"
            src={embedUrl}
            className="w-full h-full aspect-video max-h-screen border-0 pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {children}
      </div>
    );
  }
);

YouTubePlayerContainer.displayName = 'YouTubePlayerContainer';
