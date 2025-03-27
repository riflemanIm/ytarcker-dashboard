import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import duration from "dayjs/plugin/duration";
import utc from "dayjs/plugin/utc"; // ✅ добавляем utc

dayjs.extend(isoWeek);
dayjs.extend(duration);
dayjs.extend(utc); // ✅ расширяем
dayjs.locale("ru");

export const daysMap = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface GetDateOfWeekday {
  (isoDay: number): dayjs.Dayjs;
}

export const dayToNumber = (dayName: string): number => {
  return daysMap.indexOf(dayName.toLowerCase()) + 1; // ISO-нумерация
};

export const getDateOfDayName = (dayName: string): dayjs.Dayjs => {
  const isoDay = dayToNumber(dayName);
  return dayjs()
    .startOf("isoWeek")
    .add(isoDay - 1, "day"); // локально — ОК
};

export const getDateOfWeekday: GetDateOfWeekday = (
  isoDay: number
): dayjs.Dayjs => {
  return dayjs()
    .startOf("isoWeek")
    .add(isoDay - 1, "day"); // локально — ОК
};

/**
 * Возвращает даты начала и конца недели.
 * @param historyNumWeek - Количество недель назад (null - текущая неделя)
 */
export function getWeekRange(historyNumWeek: number | null = null): {
  start: string;
  end: string;
} {
  let date = dayjs(); // локально — ОК, для текущей даты пользователя

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
  T extends {
    id: string;
    duration: string;
    updatedAt: string;
    issue: { display: string; key: string };
    updatedBy: { id: string; display: string };
    self: string;
    [key: string]: any;
  },
>(
  data: T[]
): (T & { durations: { id: string; duration: string }[]; duration: string })[] {
  // ✅ используем UTC при парсинге даты
  const grouped = data.reduce(
    (acc, item) => {
      const dateKey = dayjs.utc(item.updatedAt).format("YYYY-MM-DD"); // <-- заменено
      const groupKey = `${item.issue.key}_${item.updatedBy.id}_${dateKey}`;
      const groupItem = {
        id: item.id,
        issue: item.issue.display,
        key: groupKey,
        issueId: item.issue.key,
        duration: item.duration,
        updatedAt: item.updatedAt,
        href: item.self,
        updatedBy: item.updatedBy.display,
      };

      if (!acc[groupKey]) {
        acc[groupKey] = [groupItem as unknown as T];
      } else {
        acc[groupKey].push(groupItem as unknown as T);
      }
      return acc;
    },
    {} as Record<string, typeof data>
  );

  return Object.values(grouped).map((group) => {
    const durations = group.map((i) => ({ id: i.id, duration: i.duration }));
    const totalDuration = sumDurations(group.map((i) => i.duration));

    return {
      ...group[0],
      duration: totalDuration,
      durations,
    };
  });
}

//  Пример использования:
// const durations = ["P1D", "PT4H", "PT45M", "PT2H30M"];
// const result = sumDurations(durations);

// console.log(result); // Выведет максимально возможный формат, например "P1DT7H15M"

const isEmpty = (value: unknown) => {
  return (
    value == null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
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

export function isArray(obj: []) {
  return obj instanceof Array;
}

export default isEmpty;
