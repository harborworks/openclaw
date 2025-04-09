import Hls from "hls.js";
import { useEffect, useRef } from "react";
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
}

const VideoPlayer = ({
  src,
  poster,
  width = 640,
  height = 360,
  controls = true,
  autoplay = false,
  className = "",
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize video.js player
    const videoElement = videoRef.current;

    if (!playerRef.current) {
      const options = {
        controls,
        autoplay,
        fluid: true,
        responsive: true,
        preload: "auto",
        poster,
        width,
        height,
      };

      playerRef.current = videojs(videoElement, options);

      console.log("Video player initialized with width:", width);
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
      };
    }

    // Clean up the player on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, controls, autoplay, poster, width, height]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: `${width}px`, maxWidth: "100%", margin: "0 auto" }}
    >
      <div data-vjs-player className="video-js-container">
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
