import { format, parseISO, isValid, addHours, addMinutes } from 'date-fns'

const IST_OFFSET = 5.5; // IST is UTC+5:30

export const getCurrentDateTime = (): string => {
  const now = new Date()
  const istTime = addMinutes(addHours(now, 0), 0)
  return istTime.toISOString()
}

export const formatDateTime = (dateTime: string | Date | number): string => {
  let date: Date;
  if (dateTime instanceof Date) {
    date = dateTime;
  } else if (typeof dateTime === 'string') {
    date = new Date(dateTime);
  } else if (typeof dateTime === 'number') {
    date = new Date(dateTime);
  } else {
    return 'Invalid Date';
  }

  if (!isValid(date)) {
    return 'Invalid Date';
  }

  return format(date, 'yyyy-MM-dd HH:mm')
}

export const formatDateTimeForInput = (dateTime: string): string => {
  const date = new Date(dateTime)
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

