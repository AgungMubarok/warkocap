import { useEffect } from "react";
import { getMsUntilNextBusinessDay } from "@/lib/business-time";

/**
 * Hook to automatically trigger a callback when the 04:00 WIB business day rolls over.
 * Also triggers when the tab regains focus (e.g. device wakes up from sleep).
 * 
 * @param onRollover - Callback to execute when rollover happens
 */
export function useBusinessDayRollover(onRollover: () => void) {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scheduleRollover = () => {
      const msUntilRollover = getMsUntilNextBusinessDay();
      
      timeoutId = setTimeout(() => {
        onRollover();
        scheduleRollover(); // schedule the next one
      }, msUntilRollover);
    };

    scheduleRollover();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Clear old timeout and check if we already passed the boundary while asleep
        clearTimeout(timeoutId);
        onRollover(); // Aggressively trigger update on wake to ensure fresh data
        scheduleRollover();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onRollover]);
}
