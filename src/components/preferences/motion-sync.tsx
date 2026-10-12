"use client";

import { useEffect } from "react";
import { watchSystemMotion } from "./preferences-store";

export function MotionSync() {
  useEffect(() => watchSystemMotion(), []);
  return null;
}
