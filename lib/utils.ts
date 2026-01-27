import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency (USD)
 * @param value The number to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
}

/**
 * Formats a date string or timestamp
 * @param date Date to format
 * @param format Format style ('short', 'medium', 'long')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'short' : 'long',
    day: 'numeric',
  };

  if (format === 'long') {
    options.hour = 'numeric';
  }

  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Formats a timestamp to display time in HH:MM format
 * @param dateString The date string to format
 * @returns Formatted time string
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a partner ID to show first and last parts with middle part truncated
 * @param id The partner ID to format
 * @returns Formatted partner ID string
 */
export function formatPartnerId(id: string): string {
  if (!id) return "-";
  const [first, middle, last] = id.split('-');
  return `${first}-${middle.slice(0, 3)}-${last}`;
}

/**
 * Generates a random password with mixed characters
 * @param length Length of the password (default: 10)
 * @returns A random password string
 */
export function generatePassword(length: number = 10): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=";
  let password = "";

  // Ensure we have at least one character from each character class
  password += charset.slice(0, 26).charAt(Math.floor(Math.random() * 26)); // lowercase
  password += charset.slice(26, 52).charAt(Math.floor(Math.random() * 26)); // uppercase
  password += charset.slice(52, 62).charAt(Math.floor(Math.random() * 10)); // number
  password += charset.slice(62).charAt(Math.floor(Math.random() * (charset.length - 62))); // special

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle the password to avoid predictable pattern
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}


export const compactCurrency = (value: number | string | undefined): string => {
  if (value === undefined) return 'TZS 0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return 'TZS 0';
  }

  if (numValue >= 1000) {
    const formatted = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(numValue).toLowerCase();
    return `TZS ${formatted}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue).replace('TZS', 'TZS ');
};