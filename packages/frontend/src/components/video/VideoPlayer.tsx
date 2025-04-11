import Hls from "hls.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  controls?: boolean;
  autoplay?: boolean;
  className?: string;
  aspectRatio?: string; // Optional custom aspect ratio as string (e.g. "16:9")
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}

const VideoPlayer = ({
  src,
  poster,
  width = 640,
  height = 360,
  controls = true,
  autoplay = false,
  className = "",
  aspectRatio,
  onLoadedMetadata,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Calculate actual aspect ratio from props or use default
  const videoAspectRatio = aspectRatio || "16:9";
  const numericAspectRatio = aspectRatio
    ? parseFloat(aspectRatio.split(":")[0]) /
      parseFloat(aspectRatio.split(":")[1])
    : width / height;

  // Add CSS to hide volume/mute controls, picture-in-picture and fullscreen toggle
  useLayoutEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .video-js .vjs-mute-control, 
      .video-js .vjs-volume-menu-button,
      .video-js .vjs-volume-panel,
      .video-js .vjs-picture-in-picture-control,
      .video-js .vjs-fullscreen-control {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Measure container size on mount and resize
    const updateContainerSize = () => {
      if (!containerRef.current) return;

      // Get parent element dimensions
      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight || window.innerHeight;

      setContainerSize({ width: parentWidth, height: parentHeight });
    };

    // Initial measurement
    updateContainerSize();

    // Set up resize observer for parent element size changes
    const resizeObserver = new ResizeObserver(updateContainerSize);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    // Also listen for window resize events
    window.addEventListener("resize", updateContainerSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateContainerSize);
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize video.js player
    const videoElement = videoRef.current;

    // Add loadedmetadata event listener if provided
    if (onLoadedMetadata) {
      videoElement.addEventListener("loadedmetadata", onLoadedMetadata as any);
    }

    if (!playerRef.current) {
      const options = {
        controls,
        autoplay,
        fluid: true,
        responsive: true,
        preload: "auto",
        poster,
        aspectRatio: videoAspectRatio, // Format is width:height as string
        controlBar: {
          volumePanel: { inline: false, vertical: true, disabled: true },
          muteToggle: false,
          pictureInPictureToggle: false,
          fullscreenToggle: false,
        },
        muted: true, // Always mute the video
      };

      playerRef.current = videojs(videoElement, options);

      // Ensure the player is muted
      playerRef.current.muted(true);
    }

    // Check if browser supports HLS natively
    const isHlsNativelySupported = videoElement.canPlayType(
      "application/vnd.apple.mpegurl"
    );

    // For browsers that don't support HLS natively, use hls.js
    if (!isHlsNativelySupported && Hls.isSupported() && src.includes(".m3u8")) {
      console.log("Using HLS.js for playback");
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoplay) {
          videoElement.play().catch((error) => {
            console.error("Autoplay failed:", error);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS error:", data);
      });
    } else {
      // For browsers with native HLS support or other video formats
      playerRef.current.src({
        src,
        type: src.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4",
      });
      console.log("Video source set:", src);
    }

    // Set up the canvas overlay to match video dimensions
    if (canvasRef.current && containerRef.current) {
      const updateCanvasSize = () => {
        const container = containerRef.current;
        if (!container) return;

        const videoEl = container.querySelector(".video-js");
        if (!videoEl) return;

        const rect = videoEl.getBoundingClientRect();
        if (canvasRef.current) {
          canvasRef.current.width = rect.width;
          canvasRef.current.height = rect.height;
          canvasRef.current.style.width = `${rect.width}px`;
          canvasRef.current.style.height = `${rect.height}px`;
        }
      };

      // Initial size update
      updateCanvasSize();

      // Update canvas size on window resize
      window.addEventListener("resize", updateCanvasSize);

      // Clean up event listener
      return () => {
        window.removeEventListener("resize", updateCanvasSize);

        // Remove the loadedmetadata event listener
        if (onLoadedMetadata) {
          videoElement.removeEventListener(
            "loadedmetadata",
            onLoadedMetadata as any
          );
        }
      };
    }

    // Clean up the player on unmount
    return () => {
      if (onLoadedMetadata && videoElement) {
        videoElement.removeEventListener(
          "loadedmetadata",
          onLoadedMetadata as any
        );
      }

      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, controls, autoplay, poster, videoAspectRatio, onLoadedMetadata]);

  // Calculate dimensions to fit container while maintaining aspect ratio
  const calculateOptimalDimensions = () => {
    const { width: maxWidth, height: maxHeight } = containerSize;

    if (maxWidth === 0 || maxHeight === 0) {
      // Default dimensions if container size is not yet available
      return { width: "100%", height: "auto" };
    }

    // Calculate dimensions based on aspect ratio constraints
    const heightByWidth = maxWidth / numericAspectRatio;
    const widthByHeight = maxHeight * numericAspectRatio;

    if (heightByWidth <= maxHeight) {
      // Width is the limiting factor
      return { width: maxWidth, height: heightByWidth };
    } else {
      // Height is the limiting factor
      return { width: widthByHeight, height: maxHeight };
    }
  };

  const optimalDimensions = calculateOptimalDimensions();

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width:
          typeof optimalDimensions.width === "number"
            ? `${optimalDimensions.width}px`
            : optimalDimensions.width,
        height:
          typeof optimalDimensions.height === "number"
            ? `${optimalDimensions.height}px`
            : optimalDimensions.height,
        maxWidth: "100%",
        maxHeight: "100%",
        margin: "0 auto",
      }}
    >
      <div
        data-vjs-player
        className="video-js-container"
        style={{ width: "100%", height: "100%" }}
      >
        <video ref={videoRef} className="video-js vjs-big-play-centered" />
      </div>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none z-10"
        style={{
          width: "100%",
          height: "100%",
          opacity: 0.7, // For debugging, make it transparent later
        }}
      />
    </div>
  );
};

export default VideoPlayer;
