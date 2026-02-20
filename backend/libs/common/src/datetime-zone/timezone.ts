export function formatTimeToAMPM(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };
  return date.toLocaleString('en-US', options);
}

export function createDateTime(time: string): Date {
  const today = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  today.setHours(hours, minutes, 0, 0);
  return today;
}
