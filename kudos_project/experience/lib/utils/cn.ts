/**
 * Tailwind class merging helper.
 * Combina `clsx` (conditional classes) + `tailwind-merge` (resolve conflicts).
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
