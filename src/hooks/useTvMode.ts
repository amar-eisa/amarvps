import { useCallback, useEffect, useState } from "react";

// TV Mode: hides header chrome, enlarges text, requests browser fullscreen.
// Controlled via a single class applied to <body>: "tv-mode".
export const useTvMode = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("tv-mode", enabled);
    return () => document.body.classList.remove("tv-mode");
  }, [enabled]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setEnabled(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggle = useCallback(async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      if (next && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (!next && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore — some browsers block fullscreen without user gesture
    }
  }, [enabled]);

  return { enabled, toggle };
};
