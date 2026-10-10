/**
 * Voyaro Itinerary Date & Time Utilities (Phase 5)
 *
 * Pure, non-mutating date and time helpers for sorting, formatting,
 * and day-grouping of itinerary items.
 */

import { ConcreteItineraryItem, ItineraryDayGroup } from '@/types/itinerary';

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Safely parse an ISO date-time string into a Date object representing
 * the exact calendar/wall-clock date and time without timezone drift.
 */
export function parseDate(isoString?: string | null): Date | null {
  if (!isoString) return null;
  const match = String(isoString).match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Extract calendar date string (YYYY-MM-DD) from an ISO date string in local time.
 */
export function getLocalDateKey(isoString: string): string {
  const d = parseDate(isoString);
  if (!d) return 'unknown-date';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 1. Sort itinerary items chronologically by startDateTime.
 * Preserves stable order for identical timestamps and does not mutate the input array.
 */
export function sortItineraryItems<T extends { startDateTime: string; endDateTime?: string; id?: string; title?: string }>(
  items: T[]
): T[] {
  if (!items || items.length === 0) return [];

  return [...items].sort((a, b) => {
    const timeA = parseDate(a.startDateTime)?.getTime() ?? 0;
    const timeB = parseDate(b.startDateTime)?.getTime() ?? 0;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // Secondary sort: endDateTime if available
    if (a.endDateTime && b.endDateTime) {
      const endTimeA = parseDate(a.endDateTime)?.getTime() ?? 0;
      const endTimeB = parseDate(b.endDateTime)?.getTime() ?? 0;
      if (endTimeA !== endTimeB) {
        return endTimeA - endTimeB;
      }
    }

    // Tertiary stable fallback: id or title
    const idA = a.id || a.title || '';
    const idB = b.id || b.title || '';
    return idA.localeCompare(idB);
  });
}

/**
 * 2. Format ISO date-time to 12-hour local time (e.g. "8:30 PM", "11:15 AM").
 */
export function formatItineraryTime(isoString?: string | null): string {
  if (!isoString) return '';
  const d = parseDate(isoString);
  if (!d) return '';

  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const minutesStr = minutes < 10 ? `0${minutes}` : String(minutes);

  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * 3. Format ISO date string into readable calendar format.
 * - 'short': "Mar 10"
 * - 'medium': "Mar 10, 2028"
 * - 'full': "Friday, March 10, 2028"
 * - 'dayMonth': "March 10"
 */
export function formatItineraryDate(
  isoString?: string | null,
  format: 'short' | 'medium' | 'full' | 'dayMonth' = 'medium'
): string {
  if (!isoString) return '';
  const d = parseDate(isoString);
  if (!d) return '';

  const monthShort = MONTH_NAMES_SHORT[d.getMonth()];
  const monthFull = MONTH_NAMES_FULL[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const dayName = DAY_NAMES_FULL[d.getDay()];

  switch (format) {
    case 'short':
      return `${monthShort} ${day}`;
    case 'dayMonth':
      return `${monthFull} ${day}`;
    case 'full':
      return `${dayName}, ${monthFull} ${day}, ${year}`;
    case 'medium':
    default:
      return `${monthShort} ${day}, ${year}`;
  }
}

/**
 * 4. Format a date-time range nicely.
 * Handles same-day vs multi-day ranges and missing end dates.
 * Examples:
 *  - Same day: "8:30 PM – 10:30 PM"
 *  - Multi-day: "Mar 10, 8:30 PM – Mar 11, 11:15 AM"
 *  - Dates only: "Mar 10 – Mar 20, 2028"
 */
export function formatDateRange(
  startIso: string,
  endIso?: string | null,
  options: { includeTimes?: boolean } = { includeTimes: true }
): string {
  const startDate = parseDate(startIso);
  if (!startDate) return '';

  const startTimeStr = formatItineraryTime(startIso);
  const startDayStr = formatItineraryDate(startIso, 'short');

  if (!endIso) {
    return options.includeTimes ? `${startDayStr} · ${startTimeStr}` : startDayStr;
  }

  const endDate = parseDate(endIso);
  if (!endDate) {
    return options.includeTimes ? `${startDayStr} · ${startTimeStr}` : startDayStr;
  }

  const endTimeStr = formatItineraryTime(endIso);
  const endDayStr = formatItineraryDate(endIso, 'short');

  const isSameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (isSameDay) {
    if (options.includeTimes) {
      return `${startTimeStr} – ${endTimeStr}`;
    }
    return startDayStr;
  }

  // Multi-day / Overnight
  if (options.includeTimes) {
    return `${startDayStr}, ${startTimeStr} – ${endDayStr}, ${endTimeStr}`;
  }
  return `${startDayStr} – ${endDayStr}`;
}

/**
 * Helper to check if an item spans into next day(s)
 */
export function isMultiDayItem(startIso: string, endIso?: string | null): boolean {
  if (!endIso) return false;
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  if (!start || !end) return false;

  return (
    start.getFullYear() !== end.getFullYear() ||
    start.getMonth() !== end.getMonth() ||
    start.getDate() !== end.getDate()
  );
}

/**
 * 5. Group items by local calendar day in chronological order.
 * - Supports relative day index if `tripStartDate` is provided (e.g. Day 1, Day 2).
 * - Multi-day items (e.g. overnight flight, hotel) are grouped under their start date.
 */
export function groupItemsByDay(
  items: ConcreteItineraryItem[],
  tripStartDate?: string | null
): ItineraryDayGroup[] {
  if (!items || items.length === 0) return [];

  // 1. Sort items chronologically first
  const sorted = sortItineraryItems(items);

  // 2. Determine trip start anchor date
  const anchorDate = tripStartDate ? parseDate(tripStartDate) : null;
  const firstItemDate = sorted.length > 0 ? parseDate(sorted[0].startDateTime) : null;
  const baseDate = anchorDate || firstItemDate || new Date();

  // Strip time for exact day difference calculations
  const baseDayStart = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  ).getTime();

  // 3. Group by YYYY-MM-DD
  const groupMap = new Map<string, ConcreteItineraryItem[]>();

  for (const item of sorted) {
    const dateKey = getLocalDateKey(item.startDateTime);
    const existing = groupMap.get(dateKey) || [];
    existing.push(item);
    groupMap.set(dateKey, existing);
  }

  // 4. Construct sorted ItineraryDayGroup array
  const groups: ItineraryDayGroup[] = [];

  for (const [dateKey, dayItems] of groupMap.entries()) {
    const sampleDate = parseDate(dayItems[0].startDateTime) || new Date(dateKey);
    const currentDayStart = new Date(
      sampleDate.getFullYear(),
      sampleDate.getMonth(),
      sampleDate.getDate()
    ).getTime();

    // Calculate day index (1-based relative to base date, minimum 1)
    const dayDiff = Math.round((currentDayStart - baseDayStart) / (1000 * 60 * 60 * 24));
    const dayNumber = Math.max(1, dayDiff + 1);

    const monthFull = MONTH_NAMES_FULL[sampleDate.getMonth()];
    const day = sampleDate.getDate();
    const dayOfWeek = DAY_NAMES_SHORT[sampleDate.getDay()];
    const shortDate = `${MONTH_NAMES_SHORT[sampleDate.getMonth()]} ${day}`;
    const dayLabel = `Day ${dayNumber} · ${monthFull} ${day}`;

    groups.push({
      date: dateKey,
      dayNumber,
      dayLabel,
      shortDate,
      dayOfWeek,
      items: dayItems,
    });
  }

  // Sort groups by date key
  return groups.sort((a, b) => a.date.localeCompare(b.date));
}
