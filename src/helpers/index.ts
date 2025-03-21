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
