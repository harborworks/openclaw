import Hls from "hls.js";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { Slider } from "../ui/slider";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  controls?: boolean;
  autoplay?: boolean;
  className?: string;
}

// Format time in seconds to MM:SS or HH:MM:SS format
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

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

  // State for video controls
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize video.js player
    const videoElement = videoRef.current;

    if (!playerRef.current) {
      const options = {
        controls: false, // We're implementing our own controls
        autoplay,
        fluid: true,
        responsive: true,
        preload: "auto",
        poster,
        width,
        height,
      };

      playerRef.current = videojs(videoElement, options);

      // Add event listeners for time updates
      playerRef.current.on("timeupdate", () => {
        if (!seeking) {
          setCurrentTime(playerRef.current.currentTime());
        }
      });

      playerRef.current.on("durationchange", () => {
        setDuration(playerRef.current.duration());
      });

      playerRef.current.on("play", () => {
        setIsPlaying(true);
      });

      playerRef.current.on("pause", () => {
        setIsPlaying(false);
      });

      playerRef.current.on("ended", () => {
        setIsPlaying(false);
      });

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

  // Handle timeline slider change
  const handleTimeChange = (value: number[]) => {
    if (!playerRef.current) return;
    setSeeking(true);
    setCurrentTime(value[0]);
  };

  // Handle slider commit (when user finishes scrubbing)
  const handleTimeCommit = (value: number[]) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime(value[0]);
    setSeeking(false);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: `${width}px`, maxWidth: "100%", margin: "0 auto" }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div
        data-vjs-player
        className="video-js-container cursor-pointer"
        onClick={togglePlayPause}
      >
        <video ref={videoRef} className="video-js vjs-big-play-centered" />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none z-10"
        style={{
          width: "100%",
          height: "100%",
          opacity: 0,
        }}
      />

      {/* Play/Pause button in center */}
      <div
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 
                   bg-black/40 rounded-full p-3 cursor-pointer 
                   transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}
        onClick={togglePlayPause}
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 text-white" />
        ) : (
          <Play className="w-6 h-6 text-white" />
        )}
      </div>

      {/* Video player controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-black/60 p-3 z-20 
                   transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        {/* Timeline area with increased click target */}
        <div
          className="w-full h-12 flex items-center relative cursor-pointer"
          onClick={(e) => {
            if (!playerRef.current || !duration) return;

            // Get click position relative to the container
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const containerWidth = rect.width;

            // Calculate the time based on the click position
            const clickPercent = clickX / containerWidth;
            const newTime = clickPercent * duration;

            // Set the video time
            playerRef.current.currentTime(newTime);
            setCurrentTime(newTime);
          }}
        >
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.01}
            onValueChange={handleTimeChange}
            onValueCommit={handleTimeCommit}
            className="w-full absolute top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>
        <div className="flex justify-between text-white text-xs mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
