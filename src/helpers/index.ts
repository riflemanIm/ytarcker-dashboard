import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

/**
 * Возвращает даты начала и конца недели.
 * @param historyNumWeek - Количество недель назад (null - текущая неделя)
 * @returns объект с датами начала и конца недели
 */
export function getWeekRange(historyNumWeek: number | null = null): {
  start: string;
  end: string;
} {
  let date = dayjs();

  if (typeof historyNumWeek === "number" && historyNumWeek > 0) {
    date = date.subtract(historyNumWeek, "week");
  }

  const start = date.startOf("isoWeek").format("YYYY-MM-DD");
  const end = date.endOf("isoWeek").format("YYYY-MM-DD");

  return { start, end };
}

export function sumDurations(durations: string[]): string {
  let totalMinutes = durations.reduce(
    (total, dur) => total + dayjs.duration(dur).asMinutes(),
    0
  );

  const days = Math.floor(totalMinutes / 1440);
  totalMinutes %= 1440;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let result = "P";
  if (days > 0) result += `${days}D`;
  if (hours > 0 || minutes > 0) {
    result += "T";
    if (hours > 0) result += `${hours}H`;
    if (minutes > 0) result += `${minutes}M`;
  }

  return result;
}
export function aggregateDurations<
  T extends { key: string; duration: string; [key: string]: any },
>(data: T[]): T[] {
  const grouped: Record<string, T[]> = {};

  data.forEach((item) => {
    if (!grouped[item.key]) grouped[item.key] = [];
    grouped[item.key].push(item);
  });

  return Object.keys(grouped).map((key) => ({
    ...grouped[key][0],
    duration: sumDurations(grouped[key].map((i) => i.duration)),
    ids: grouped[key].map((i) => i.id),
    durations: grouped[key].map((i) => i.duration),
  }));
}

// Пример использования:
const durations = ["P1D", "PT4H", "PT45M", "PT2H30M"];
const result = sumDurations(durations);

console.log(result); // Выведет максимально возможный формат, например "P1DT7H15M"

export function currencyFormat(num: number | string) {
  return parseFloat(`${num}`)
    .toFixed(2)
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

export function isPetKey(key: string, pet = true) {
  return `${key}${pet ? "_PET" : ""}`;
}

export function getYearNow() {
  const dateNow = new Date();
  return dateNow.getFullYear();
}

export function getNumber(value: unknown, defaultValue: number | null = null) {
  const num = parseInt(String(value), 10);
  return isNaN(num) ? defaultValue : num;
}

const isEmpty = (value: unknown) => {
  return (
    value == null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
};

export const ifEmptyArr = (value: unknown) => {
  return !isEmpty(value) ? value : [];
};
export const ifEmptyObj = (value: unknown) => {
  return !isEmpty(value) ? value : {};
};

export const isString = (val: unknown) => {
  return typeof val === "string" && val != null;
};

export const isObject = (obj: unknown): obj is Record<string, unknown> =>
  Object.prototype.toString.call(obj) === "[object Object]";

export function isNumeric(n: string | number) {
  return !isNaN(parseFloat(n as string)) && isFinite(n as number);
}

// const groupBys = <T, K extends keyof any>(
//   list: T[],
//   getKey: (item: T) => K,
// ) =>
//   list.reduce((previous, currentItem) => {
//     const group = getKey(currentItem);
//     if (!previous[group]) previous[group] = [];
//     previous[group].push(currentItem);
//     return previous;
//   }, {} as Record<K, T[]>);

export function groupBy<T, K extends keyof T>(
  arr: T[],
  key: K,
  convertKeyVal?: (val: T[K]) => string
) {
  const initialValue: Record<string, T[]> = {};
  return arr.reduce((acc, item) => {
    const convKey =
      convertKeyVal != null ? convertKeyVal(item[key]) : item[key];
    acc[String(convKey)] = [...(acc[String(convKey)] || []), item];
    return acc;
  }, initialValue);
}

// export function groupByKey<T, K extends keyof T>(
//   list: T[],
//   key: K,
//   { omitKey = false },
// ) {
//   return list.reduce(
//     (hash, { [key]: value, ...rest }) => ({
//       ...hash,
//       [value]: (hash[value] || []).concat(
//         omitKey ? { ...rest } : { [key]: value, ...rest },
//       ),
//     }),
//     {},
//   );
// }

export function chunksArray<T>(inputArray: T[], perChunk: number) {
  return inputArray.reduce((resultArray: T[][], item: T, index: number) => {
    const chunkIndex = Math.floor(index / perChunk);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [] as T[]; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);
}

export function isArray(obj: []) {
  return obj instanceof Array;
}

export default isEmpty;
