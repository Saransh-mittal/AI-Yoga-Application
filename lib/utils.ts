// lib/utils.ts
// 🎓 This is a utility function for combining class names
// Useful when you have conditional classes

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
