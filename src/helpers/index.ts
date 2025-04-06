import { DayOfWeek, DurationItem } from "./../types/global.d";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import isoWeek from "dayjs/plugin/isoWeek";
import utc from "dayjs/plugin/utc"; // ✅ добавляем utc
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { TaskItem } from "@/types/global";

dayjs.extend(isoWeek);
dayjs.extend(duration);
dayjs.extend(utc); // ✅ расширяем
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale("ru");

export function isDateInCurrentWeek(date: dayjs.Dayjs): boolean {
  const weekStart = dayjs().startOf("isoWeek");
  const weekEnd = dayjs().endOf("isoWeek");
  return date.isSameOrAfter(weekStart) && date.isSameOrBefore(weekEnd);
}
export const isValidDuration = (duration: string): boolean => {
  // Обновлённое регулярное выражение для ISO8601 длительности без поддержки лет и секунд
  console.log("duration", duration);
  const iso8601DurationRegex =
    /^P(?=\d|T\d)(?:(\d+W)?(\d+D)?)(?:T(?=\d+[HM])(?:(\d+H)?(\d+M)?))?$/i;
  return iso8601DurationRegex.test(duration);
};

export const normalizeDuration = (input: string): string => {
  if (isValidDuration(input)) return input;

  // Обновлённое регулярное выражение, разрешающее пробелы между компонентами
  const regex =
    /^\s*(?:(\d+)\s*[yY])?\s*(?:(\d+)\s*[wW])?\s*(?:(\d+)\s*[dD])?\s*(?:(\d+)\s*[hH])?\s*(?:(\d+)\s*[mM])?\s*(?:(\d+)\s*[sS])?\s*$/;
  const match = input.trim().match(regex);

  // Если нет совпадения или ни один компонент не передан – возвращаем исходное значение
  if (!match || match.slice(1).every((v) => !v)) {
    return input; // невалидный формат, возвращаем исходное значение
  }

  const [, years, weeks, days, hours, minutes, seconds] = match;

  let result = "P";
  if (years) result += `${parseInt(years, 10)}Y`;
  if (weeks) result += `${parseInt(weeks, 10)}W`;
  if (days) result += `${parseInt(days, 10)}D`;

  // Добавляем часть времени, если задан хотя бы один компонент
  if (hours || minutes || seconds) {
    result += "T";
    if (hours) result += `${parseInt(hours, 10)}H`;
    if (minutes) result += `${parseInt(minutes, 10)}M`;
    if (seconds) result += `${parseInt(seconds, 10)}S`;
  }

  return result;
};
export const headerWeekName = {
  monday: "Пн",
  tuesday: "Вт",
  wednesday: "Ср",
  thursday: "Чт",
  friday: "Пт",
  saturday: "Сб",
  sunday: "Вс",
};
export const daysMap: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const displayDuration = (duration: string): string => {
  if (duration === "P") return "";
  // Регулярное выражение для ISO8601 длительности с учетом лет, недель, дней, часов, минут и секунд
  const regex =
    /^P(?:([0-9]+)Y)?(?:([0-9]+)W)?(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/;
  const matches = duration.match(regex);
  if (!matches) return duration;

  const [, years, weeks, days, hours, minutes, seconds] = matches;
  const parts = [];
  if (years) parts.push(`${years}y`);
  if (weeks) parts.push(`${weeks}w`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);

  return parts.join(" ");
};
export const dayOfWeekNameByDate = (data: dayjs.Dayjs): string => {
  const dayOfWeek = dayjs.utc(data).isoWeekday();
  const dayOfWeekName = daysMap[dayOfWeek - 1];
  return dayOfWeekName;
};
interface getDateOfCurrentWeekday {
  (isoDay: number): dayjs.Dayjs;
}

export const dayToNumber = (dayName: DayOfWeek): number => {
  return daysMap.indexOf(dayName.toLowerCase() as DayOfWeek) + 1; // ISO-нумерация
};

export const getDateOfDayName = (dayName: string): dayjs.Dayjs => {
  const isoDay = dayToNumber(dayName as DayOfWeek);
  return dayjs()
    .startOf("isoWeek")
    .add(isoDay - 1, "day"); // локально — ОК
};

export const getDateOfCurrentWeekday: getDateOfCurrentWeekday = (
  isoDay: number
): dayjs.Dayjs => {
  return dayjs().startOf("isoWeek").add(isoDay, "day"); // локально — ОК
};

export const getDateOfWeekday: (
  start: dayjs.Dayjs,
  isoDay: number
) => dayjs.Dayjs = (
  start: dayjs.Dayjs, // monday
  isoDay: number
): dayjs.Dayjs => {
  return dayjs(start)
    .startOf("isoWeek")
    .add(isoDay - 1, "day");
};

/**
 * Возвращает даты начала и конца недели.
 * @param historyNumWeek - Количество недель назад (null - текущая неделя)
 */
export function getWeekRange(historyNumWeek: number | null = null): {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
} {
  let date = dayjs(); // локально — ОК, для текущей даты пользователя

  if (typeof historyNumWeek === "number" && historyNumWeek > 0) {
    date = date.subtract(historyNumWeek, "week");
  }

  const start = date.startOf("isoWeek");
  const end = date.endOf("isoWeek");

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

export function aggregateDurations(
  data: Array<{
    id: string;
    duration: string;
    start: string;
    issue: { display: string; key: string };
    updatedBy: { id: string; display: string };
  }>
): TaskItem[] {
  const grouped = data.reduce(
    (acc, item) => {
      const dayOfWeekName = dayOfWeekNameByDate(dayjs(item.start));
      const groupKey = `${item.issue.key}_${item.updatedBy.id}_${dayOfWeekName}`;
      const groupItem: TaskItem = {
        id: item.id,
        key: `${item.issue.key}_${item.updatedBy.id}`,
        issueId: item.issue.key,
        issue: {
          display: item.issue.display,
          href: `https://tracker.yandex.ru/${item.issue.key}`,
          fio: item.updatedBy.display,
        },
        start: item.start,

        duration: item.duration,
      };

      if (!acc[groupKey]) {
        acc[groupKey] = [groupItem];
      } else {
        acc[groupKey].push(groupItem);
      }
      return acc;
    },
    {} as Record<string, TaskItem[]>
  );

  return Object.values(grouped).map((group) => {
    const durations = group.map(
      (i) => ({ id: i.id, duration: i.duration, comment: "" }) as DurationItem
    );
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
