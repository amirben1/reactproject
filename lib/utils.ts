import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { toast } from "sonner"

// Function to show a toast message
export function showToast(message: string) {
  if (typeof window !== "undefined") {
    toast(message)
  }
}
