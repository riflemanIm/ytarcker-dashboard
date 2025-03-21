import md5 from "md5";
import custom from "@/custom";
import { formatIncompletePhoneNumber } from "libphonenumber-js/mobile";
import { parsePhoneNumber } from "./validators";

export const textNoSlotsNoVisitKinds = (visitKindId, appInfo, t) => {
  const noSlotsText = appInfo?.noSlotsText && appInfo.noSlotsText.trim();
  const noVisitKindsText =
    appInfo?.noVisitKindsText && appInfo.noVisitKindsText.trim();
  if (visitKindId && noSlotsText) return noSlotsText;
  if (!visitKindId && noVisitKindsText) return noVisitKindsText;
  if (visitKindId && !noSlotsText) return t("EMPTY_DATA.NO_SLOTS");
  if (!visitKindId && !noVisitKindsText) return t("EMPTY_DATA.NO_VISIT_KIND");
};

export const hhMmSs = (totalSeconds) => {
  let hours = Math.floor(totalSeconds / 3600);
  hours = hours < 10 ? `0${hours}` : hours;
  totalSeconds %= 3600;
  let minutes = Math.floor(totalSeconds / 60);
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  let seconds = totalSeconds % 60;
  seconds = seconds < 10 ? `0${seconds}` : seconds;

  return `${hours}:${minutes}:${seconds}`;
};

export const toUpperCaseFirstLetter = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toLowerCaseFirstLetter = (str) => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

export const transformKeysInData = (data, transformFunc) => {
  if (data === null) return null;

  if (Array.isArray(data))
    return data.map((item) => transformKeysInData(item, transformFunc));

  if (typeof data === "object")
    return Object.keys(data).reduce((result, key) => {
      result[transformFunc(key)] = transformKeysInData(
        data[key],
        transformFunc
      );
      return result;
    }, {});

  return data;
};

export const generateSign = (data, secretKey) => {
  const params = Object.keys(data)
    .sort()
    .filter((key) => key !== "authToken")
    .map((key) => data[key])
    .filter((value) => typeof value !== "object" && value !== undefined)
    .map((value) =>
      typeof value === "boolean"
        ? toUpperCaseFirstLetter(value.toString())
        : value
    );

  return md5(`${params.join("")}${secretKey}`).toString();
};

export const passMd5 = (pass) => md5(pass);

export const cleanPhoneValue = (value) => {
  if (value == null) return "";
  // удаляем разрешенные символы
  const cleanValue = value.replace(/[\s+()-]/gi, "");
  const numbers = cleanValue.replace(/[^\d]/gi, "");
  return numbers;
};
export const formatIncompletePhone = (value, countryCode = "RU") => {
  let phoneFixed = value;
  if (
    countryCode === "RU" &&
    phoneFixed.substring(0, 1) !== "+" &&
    phoneFixed.substring(0, 1) !== "7" &&
    phoneFixed.substring(0, 1) !== "8"
  )
    phoneFixed = "+7 " + formatIncompletePhoneNumber(phoneFixed, countryCode);
  else if (countryCode === "RU" && phoneFixed.substring(0, 1) === "7")
    phoneFixed =
      "+7 " + formatIncompletePhoneNumber(phoneFixed, countryCode).substring(1);
  else if (countryCode === "RU" && phoneFixed && phoneFixed.trim() === "+7")
    phoneFixed = "";
  else phoneFixed = formatIncompletePhoneNumber(value, countryCode);

  return phoneFixed;
};

export const formatPhoneString = (value, countryCode = "RU") => {
  const phoneNumber = parsePhoneNumber(countryCode)(value, {
    defaultCountry: countryCode,
    extract: false,
  });

  if (!phoneNumber?.isValid()) return value;

  let phoneFixed = value;

  switch (phoneNumber.country) {
    case "RU":
      phoneFixed = "+7" + phoneNumber.formatNational().substring(1);
      break;
    default:
      phoneFixed = phoneNumber.formatInternational();
  }
  return phoneFixed;
};

export const getParam = (param) => {
  const QueryString = window.location.search;
  const urlParams = new URLSearchParams(QueryString);
  return urlParams.get(param);
};
const addRemoveAuthMenuItems = (appInfo, key, val) => {
  if (
    appInfo[key] != null &&
    appInfo[key] &&
    appInfo.authMenuItems[val] == null
  ) {
    appInfo.authMenuItems.push(val);
  }
  if (
    appInfo[key] != null &&
    !appInfo[key] &&
    appInfo.authMenuItems[val] !== null
  ) {
    appInfo.authMenuItems = appInfo.authMenuItems.filter((e) => e !== val);
  }
  appInfo.authMenuItems = [...new Set(appInfo.authMenuItems)];

  return appInfo;
};

export function appInfoInit(data) {
  const appInfo = {
    ...custom,
    ...data,
  };

  appInfo.chatServerAddress = appInfo?.chatServerAddress
    ? `${appInfo.chatServerAddress.replace(/\/+$/g, "")}/`
    : `https://${import.meta.env.VITE_APP_HOST_CHAT}/`;

  const chatDomen = new URL(appInfo.chatServerAddress);

  const chatApi = {
    chatBaseURLApi: `https://${chatDomen.host}${chatDomen.pathname || ""}`,
    chatWsUrl: `wss://${chatDomen.host}`,
    chatWsPath: `${chatDomen.pathname || "/"}socket.io`,
  };

  return {
    ...addRemoveAuthMenuItems(appInfo, "showInvoices", "invoices"),
    ...addRemoveAuthMenuItems(appInfo, "isDirectionsEnabled", "directions"),
    ...addRemoveAuthMenuItems(appInfo, "isPrescribedDrugsEnabled", "drugs"),
    // showFastButtonsOnMainPage: true,
    // showLanguageSwitch: true,
    requireStartPageAuth:
      appInfo?.startPage != !null && appInfo.startPage === "auth"
        ? true
        : appInfo?.requireStartPageAuth,
    timeSlotsCacheDepth: appInfo?.timeSlotsCacheDepth
      ? parseInt(appInfo.timeSlotsCacheDepth) - 1
      : 30,
    ...chatApi,
  };
}
