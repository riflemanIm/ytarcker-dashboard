import 'dayjs/locale/fr';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import dayjs from 'dayjs';

const HL7_FORMAT = 'YYYYMMDD';
type dayjsType =
  | string
  | number
  | Date
  | dayjs.Dayjs
  | null
  | undefined;
export function isIsoDate(str: string) {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str))
    return false;
  const d = new Date(str);
  return (
    d instanceof Date &&
    !isNaN(d.getTime()) &&
    d.toISOString() === str
  ); // valid date
}

export const hl7ToUtc = (hl7Date: string) => {
  // this function will return an ISO formatted date string in UTC from the insanity that is hl7 dates
  // the function is now more sane
  const utcDate = new Date();
  if (
    hl7Date == null ||
    hl7Date === '' ||
    typeof hl7Date !== 'string'
  )
    return utcDate;

  if (isIsoDate(hl7Date)) return new Date(hl7Date);

  const year = parseInt(hl7Date.substring(0, 4), 10);
  const month = parseInt(hl7Date.substring(4, 6), 10) - 1;
  const day = parseInt(hl7Date.substring(6, 8), 10);

  utcDate.setFullYear(year, month, day);

  const hour = hl7Date.substring(8, 10)
    ? parseInt(hl7Date.substring(8, 10), 10)
    : 0;
  const min = hl7Date.substring(10, 12)
    ? parseInt(hl7Date.substring(10, 12), 10)
    : 0;

  utcDate.setHours(hour, min);
  return utcDate;
};

export const convertToISODate = (hl7: string) => {
  const utcDate = hl7ToUtc(hl7);
  return utcDate.toISOString();
};

export const dateToHL7 = (date?: dayjsType) => {
  //console.log('date', date, dayjs(date).format(HL7_FORMAT));
  if (dayjs(date).isValid()) return dayjs(date).format(HL7_FORMAT);
  return null;
};
export const HL7ToDateToTime = (HL7_DATE: string) => {
  return dayjs(hl7ToUtc(HL7_DATE)).format('HH:mm');
};
export const HL7ToDateToDate = (HL7_DATE: string) => {
  return dayjs(hl7ToUtc(HL7_DATE)).format(HL7_DATE);
};

export const HL7ToDateToSrtDate = (
  HL7_DATE: string,
  lang = 'ru',
  FORMAT = 'DD MMMM',
) => dayjs(hl7ToUtc(HL7_DATE)).locale(lang).format(FORMAT);

export const formatDate = (
  date: dayjsType,
  lang = 'ru',
  FORMAT = 'DD MMM YYYY',
) => dayjs(date).locale(lang).format(FORMAT);
