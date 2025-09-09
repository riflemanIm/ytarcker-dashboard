import { DataItem, DayOfWeek, DurationItem } from "./../types/global.d";
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

const ADMIN_LOGINS = [
  "e.nikolaev",
  "l.musaeva",
  "s.ermakov",
  "a.smirnov",
  "o.lambin",
  "i.modenov",
  "a.solnyshkin",
  "d.malakhov",
  "s.zykov",
  "d.orlinskiy",
  "y.zinovev",
  "a.perushkin",
  "a.fedorov",
  "a.lupanov",
  "o.galay",
  "i.shcheglov",
  "v.beseda",
  "a.lazareva",
  "s.boldin",
  "y.dubovtsev",
  "n.kovalevskaya",
  "e.pavlova",
];
export const isSuperLogin = (login: string | null | undefined): boolean => {
  if (!login) return false;
  return ADMIN_LOGINS.includes(login);
};
/**
 * Парсит ISO-8601 duration, например "PT2H30M", в общее число секунд.
 */
export function parseISODurationToSeconds(dur: string): number {
  // Ожидаем формат "PT#H#M#S"
  const match = dur.match(/^P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)$/);
  if (!match) return 0;
  const [, h = "0", m = "0", s = "0"] = match;
  return +h * 3600 + +m * 60 + +s;
}

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
  // Если “P” (плейсхолдер пустого значения) — возвращаем пустую строку
  if (duration === "P") return "";

  // Регулярка для ISO-8601 Duration (учитываются годы, недели, дни, часы, минуты, секунды)
  const regex =
    /^P(?:([0-9]+)Y)?(?:([0-9]+)W)?(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/;
  const matches = duration.match(regex);
  if (!matches) return duration; // если не подошло под формат, возвращаем оригинал

  const [, years, weeks, days, hours, minutes, seconds] = matches;

  // 1) Считаем общее число “дней” из недель и дней:
  //    - каждая неделя = 7 дней
  //    - каждый день = 1 день (далее переведём в часы)
  let totalDays = 0;
  if (weeks) totalDays += parseInt(weeks, 10) * 7;
  if (days) totalDays += parseInt(days, 10);

  // 2) Считаем общее число “часов” (без учёта дней, их перенесём позже):
  let totalHours = 0;
  if (hours) totalHours += parseInt(hours, 10);

  // 3) Считаем общее число “минут” и “секунд”:
  let totalMinutes = 0;
  if (minutes) totalMinutes += parseInt(minutes, 10);

  let totalSeconds = 0;
  if (seconds) totalSeconds += parseInt(seconds, 10);

  // 4) Переводим секунды в минуты (отбрасываем остаток секунд, т.к. выводим только до минут)
  if (totalSeconds) {
    totalMinutes += Math.floor(totalSeconds / 60);
  }

  // 5) Переводим минуты в часы
  if (totalMinutes) {
    totalHours += Math.floor(totalMinutes / 60);
  }
  const displayMinutes = totalMinutes % 60;

  // 6) Переносим “дни” в “часы” с коэффициентом 8 часов на 1 день
  totalHours += totalDays * 8;

  // 7) Теперь разбиваем общее число часов на “дни” (по 8 часов) и “остаточные” часы
  const displayDays = Math.floor(totalHours / 8);
  const displayHours = totalHours % 8;

  // 8) Собираем итоговую строку: d/h/m, но пропускаем нулевые значения
  const parts: string[] = [];
  if (displayDays) parts.push(`${displayDays}d`);
  if (displayHours) parts.push(`${displayHours}h`);
  if (displayMinutes) parts.push(`${displayMinutes}m`);

  // Если в итоге не набралось ни дней, ни часов, ни минут — возвращаем пустую строку
  if (parts.length === 0) return "";

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

  if (typeof historyNumWeek === "number") {
    date = date.subtract(historyNumWeek, "week");
  }

  const start = date.startOf("isoWeek");
  const end = date.endOf("isoWeek");

  return { start, end };
}

export function sumDurations(durations: string[]): string {
  const minutesInWorkDay = 8 * 60; // 8 часов = 1 «рабочий» день

  // Пустые "P" → "PT0M"
  const normalized = durations.map((d) => (d === "P" ? "PT0M" : d));

  let standardDays = 0; // сумма чистых 24-часовых дней
  let extraMinutes = 0; // минуты из всего остального

  normalized.forEach((dur) => {
    // 1) Вытаскиваем дни из форм вида PnD или PnDT...
    const dayMatch = dur.match(/P(\d+)D/);
    if (dayMatch) {
      standardDays += parseInt(dayMatch[1], 10);
    }

    // 2) Вытаскиваем часы/минуты из части после "T"
    const timeMatch = dur.match(/T(?:(\d+)H)?(?:(\d+)M)?/);
    if (timeMatch) {
      const hours = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
      const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      extraMinutes += hours * 60 + mins;
    } else if (!dayMatch) {
      // Сюда попадут строки без D и без T —
      // но мы заранее заменили "P" на "PT0M",
      // так что здесь не случится сюрпризов.
    }
  });

  // Конвертируем каждые 480 мин в «рабочий» день
  const extraWorkDays = Math.floor(extraMinutes / minutesInWorkDay);
  let remaining = extraMinutes % minutesInWorkDay;

  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;

  const totalDays = standardDays + extraWorkDays;

  // Собираем итоговую ISO-строку
  let result = "P";
  if (totalDays > 0) result += `${totalDays}D`;
  if (hours > 0 || minutes > 0) {
    result += "T";
    if (hours > 0) result += `${hours}H`;
    if (minutes > 0) result += `${minutes}M`;
  }
  return result;
}

export function aggregateDurations(data: DataItem[]): TaskItem[] {
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
        groupIssue: item.issue.key.split("-")[0],
        start: item.start,
        duration: item.duration,
        comment: item.comment,
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
      (i) =>
        ({ id: i.id, duration: i.duration, comment: i.comment }) as DurationItem
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
export const parseTime = (timeStr: string): number => {
  if (!timeStr) return 0;
  return dayjs.duration(timeStr).asMinutes();
};

export const timeSortComparator = (v1: string, v2: string): number => {
  return parseTime(v1) - parseTime(v2);
};
export default isEmpty;
