function formatIsoDateParts(date: string) {
  const [year, month, day] = date.split("T")[0].split("-");
  if (!year || !month || !day) return date;
  return `${day}.${month}.${year}`;
}

export function formatDate(date: string) {
  if (!date || date === "-") return date || "-";
  return formatIsoDateParts(date);
}

export function formatTime(time: string) {
  if (!time) return "";
  const [hours = "", minutes = ""] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export function formatDateTime(date: string, time?: string) {
  const formattedDate = formatDate(date);
  if (!time) return formattedDate;
  return `${formattedDate} ${formatTime(time)}`;
}

export function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function formatDateTimeRange(startDate: string, startTime: string, endDate: string, endTime: string) {
  return `${formatDateTime(startDate, startTime)} - ${formatDateTime(endDate, endTime)}`;
}

export function parseEuropeanDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return "";

  const [, rawDay, rawMonth, year] = match;
  const day = rawDay.padStart(2, "0");
  const month = rawMonth.padStart(2, "0");
  const date = new Date(`${year}-${month}-${day}T00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

export function normalizeEuropeanDateInput(value: string) {
  return value.replace(/[^\d.]/g, "").slice(0, 10);
}

export function isoDateToEuropeanInput(value: string) {
  return value ? formatDate(value) : "";
}
