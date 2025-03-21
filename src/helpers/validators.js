import parsePhoneNumberFromString from 'libphonenumber-js/mobile';

import isEmpty from '.';
import dayjs from 'dayjs';
export const RANGE_AGE_GROUP = 18;
export const rexFio = /^[ _a-zßàâäçèéêëîïôöùûüÿа-яё’-]+$/i;

export const notAvalibleBirthDate = (birthDate, limits) => {
  const [min, max] = limits;

  const nowYear = birthDate;
  const minYear = dayjs().add(-1, 'day').add(min, 'years');
  const maxYear = max === 0 ? dayjs() : dayjs().add(max, 'years');
  return (
    birthDate.isValid && (nowYear < minYear || nowYear > maxYear)
  );
};

export const isPastDate = (dateIn) => {
  const date1 = dayjs();
  const date2 = dateIn;

  const diff = date1.diff(date2);

  return diff > 0;
};

export const validateOnlyNumbers = (phone) => {
  return phone.match(/^\d+$/);
};

export const isValidEmail = (email) => {
  // 1. Должна быть не пустая строка
  if (!email || typeof email !== 'string') return false;
  // 2. Должны быть 2 части, разделенные @
  const idx = email.lastIndexOf('@');
  if (idx === -1) return false;

  const account = email.slice(0, idx);
  const address = email.slice(idx + 1);

  // 3. Длины частей
  if (account.length > 64 || address.length > 255) return false;

  // 4. Есть точка в адресе
  if (!address.includes('.')) return false;

  // 5. Длины адресной составляющей
  const domainParts = address.split('.');
  if (domainParts.some((part) => part.length > 63)) return false;

  return true;
};
export const parsePhoneNumber = () => parsePhoneNumberFromString;

export const isValidPhone = (value, countryCode = 'RU') => {
  if (value) {
    const phoneNumber = parsePhoneNumber(countryCode)(value, {
      defaultCountry: countryCode,
      extract: false,
    });
    const isPhoneNumberValid = !!(
      phoneNumber && phoneNumber.isValid()
    );
    return isPhoneNumberValid;
  }
};

const posibleReqFields = [
  'lastName',
  'firstName',
  'birthDate',
  'gender',
];

export const getReqFields = (requiredRegistrationFields) => {
  if (isEmpty(requiredRegistrationFields)) return [];

  return requiredRegistrationFields
    .split(',')
    .map((it) => it.trim())
    .filter((it) => posibleReqFields.includes(it));
};

export const reqRegField = (requiredRegistrationFields, field) => {
  if (isEmpty(requiredRegistrationFields)) return false;
  return getReqFields(requiredRegistrationFields).includes(field);
};
