export function parseLocalDate(dateString: string): Date {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  return new Date(isDateOnly ? `${dateString}T00:00:00` : dateString);
}
