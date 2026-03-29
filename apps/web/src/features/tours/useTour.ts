import { useCallback, useState } from "react";

export type TourStepDef = {
  id: string;
  title: string;
  body: string;
  target?: string; // CSS selector for positioning (unused in overlay mode)
};

export type TourDef = {
  id: string;
  steps: TourStepDef[];
};

const STORAGE_KEY = "ois_tours_completed";

function completedTours(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function markCompleted(tourId: string) {
  const tours = completedTours();
  tours.add(tourId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...tours]));
}

export function useTour(tour: TourDef) {
  const alreadyCompleted = completedTours().has(tour.id);
  const [active, setActive] = useState(!alreadyCompleted);
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = active ? tour.steps[stepIndex] ?? null : null;
  const isLast = stepIndex >= tour.steps.length - 1;

  const next = useCallback(() => {
    if (isLast) {
      markCompleted(tour.id);
      setActive(false);
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLast, tour.id]);

  const dismiss = useCallback(() => {
    markCompleted(tour.id);
    setActive(false);
  }, [tour.id]);

  const reset = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  return { active, currentStep, stepIndex, totalSteps: tour.steps.length, isLast, next, dismiss, reset };
}
