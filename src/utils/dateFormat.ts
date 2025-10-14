export const formatDateTime = (timestamp?: string | number | Date): string => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const day = date.getDate().toString().padStart(2, '0');

  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'Asia/Kolkata' });

  const year = date.getFullYear();

  const time = date.toLocaleString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  return `${day} ${month} ${year}, ${time}`;
};

    




