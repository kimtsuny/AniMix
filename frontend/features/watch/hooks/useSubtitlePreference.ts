"use client";

import { useCallback, useMemo, useState } from "react";
import type { Subtitle } from "../api/services/stream.service";
import {
  getSubtitleLanguageIdentifier,
  resolveActiveSubtitle,
  type SubtitlePreference,
} from "../utils/subtitles";

const STORAGE_KEY = "animix_subtitle_preference";

function getStoredPreference(): SubtitlePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const val = sessionStorage.getItem(STORAGE_KEY);
    if (val && typeof val === "string") {
      return val as SubtitlePreference;
    }
  } catch {
    // Ignore session storage errors
  }
  return "auto";
}

function setStoredPreference(pref: SubtitlePreference): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Ignore session storage errors
  }
}

export interface UseSubtitlePreferenceResult {
  availableSubtitles: Subtitle[];
  preferredSubtitle: SubtitlePreference;
  activeSubtitle: Subtitle | null;
  activeSubtitleIndex: number | null;
  setPreferredSubtitle: (preference: SubtitlePreference) => void;
  selectSubtitleByIndex: (index: number | null) => void;
}

export function useSubtitlePreference(
  availableSubtitles: Subtitle[]
): UseSubtitlePreferenceResult {
  const [preferredSubtitle, setPreferredSubtitleState] =
    useState<SubtitlePreference>(getStoredPreference);

  const setPreferredSubtitle = useCallback((preference: SubtitlePreference) => {
    setPreferredSubtitleState(preference);
    setStoredPreference(preference);
  }, []);

  const selectSubtitleByIndex = useCallback(
    (index: number | null) => {
      if (index === null) {
        setPreferredSubtitle("none");
        return;
      }
      const sub = availableSubtitles[index];
      if (!sub) {
        setPreferredSubtitle("none");
        return;
      }
      const langId = getSubtitleLanguageIdentifier(sub);
      setPreferredSubtitle(langId);
    },
    [availableSubtitles, setPreferredSubtitle]
  );

  const { activeSubtitleIndex, activeSubtitle } = useMemo(() => {
    return resolveActiveSubtitle(availableSubtitles, preferredSubtitle);
  }, [availableSubtitles, preferredSubtitle]);

  return {
    availableSubtitles,
    preferredSubtitle,
    activeSubtitle,
    activeSubtitleIndex,
    setPreferredSubtitle,
    selectSubtitleByIndex,
  };
}
