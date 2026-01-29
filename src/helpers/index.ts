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
  "y.akhatov",
  "d.karelin",
  "v.zyryanov",
  "e.boyarkina",
  "e.sigalaeva",
  "a.trofimtsev",
];
/** ===== Общие хелперы для дат/форматов/агрегаций ===== */

// === CONFIG: целевой пояс для UI (MSK по умолчанию) ===
const TARGET_OFFSET_MIN = 180; // UTC+3

// "+0000" → "+00:00" (на всякий случай для нестандартных таймзонных суффиксов)
export function normalizeTZ(s: string): string {
  if (typeof s !== "string") return s as any;
  if (/[+-]\d{2}:\d{2}$/.test(s)) return s;
  return s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
}

// Привести дату/строку c любым оффсетом к целевому поясу (MSK)
export const toTarget = (d: dayjs.Dayjs | string | Date): dayjs.Dayjs => {
  if (typeof d === "string") {
    // ВАЖНО: сначала распарсить с её родным оффсетом, затем перевести в целевой
    return dayjs(normalizeTZ(d)).utc().utcOffset(TARGET_OFFSET_MIN);
  }
  // для Dayjs/Date: считаем, что это "момент", переводим его в целевой пояс
  return dayjs(d).utc().utcOffset(TARGET_OFFSET_MIN);
};

// Вернуть ISO строку в целевом поясе (для хранения/рендера)
export const toTargetISO = (src: string | Date | dayjs.Dayjs): string =>
  toTarget(src).format("YYYY-MM-DDTHH:mm:ss.SSSZ");

// День недели (monday..sunday) в целевом поясе
export const dayOfWeekNameByDate = (data: dayjs.Dayjs): string => {
  const daysMap: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const dow = toTarget(data).isoWeekday(); // 1..7
  return daysMap[dow - 1];
};

// Номер дня недели ISO (1..7) в целевом поясе
export const dayToNumber = (dayName: DayOfWeek): number => {
  const daysMap: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  return daysMap.indexOf(dayName.toLowerCase() as DayOfWeek) + 1;
};

// Дата выбранного имени дня текущей недели (в целевом поясе)
export const getDateOfDayName = (dayName: string): dayjs.Dayjs => {
  const isoDay = dayToNumber(dayName as DayOfWeek); // 1..7
  return toTarget(dayjs())
    .startOf("isoWeek")
    .add(isoDay - 1, "day");
};

// Дата iso-дня текущей недели (1..7) в целевом поясе
export const getDateOfCurrentWeekday = (isoDay: number): dayjs.Dayjs =>
  toTarget(dayjs())
    .startOf("isoWeek")
    .add(isoDay - 1, "day");

// Дата iso-дня недели, чей понедельник = start (в целевом поясе)
export const getDateOfWeekday = (
  start: dayjs.Dayjs,
  isoDay: number,
): dayjs.Dayjs =>
  toTarget(start)
    .startOf("isoWeek")
    .add(isoDay - 1, "day");

// Диапазон недели (Пн–Вс) относительно "сейчас" или смещения historyNumWeek, в целевом поясе
export function getWeekRange(historyNumWeek: number | null = null): {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
} {
  let base = toTarget(dayjs());
  if (typeof historyNumWeek === "number") {
    base = base.subtract(historyNumWeek, "week");
  }
  return {
    start: base.startOf("isoWeek"),
    end: base.endOf("isoWeek"),
  };
}

// Эта дата внутри текущей недели? (в целевом поясе)
export function isDateInCurrentWeek(date: dayjs.Dayjs): boolean {
  const nowTz = toTarget(dayjs());
  const weekStart = nowTz.startOf("isoWeek");
  const weekEnd = nowTz.endOf("isoWeek");
  const d = toTarget(date);
  return d.isSameOrAfter(weekStart) && d.isSameOrBefore(weekEnd);
}

// Агрегация: используем исходный оффсет записи, но для вычисления дня — целевой пояс.
// По желанию можно сохранять start уже в целевой зоне (toTargetISO), чтобы всё было однородно.
export function aggregateDurations(data: DataItem[]): TaskItem[] {
  const daysMap: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const grouped = data.reduce(
    (acc, item) => {
      // item.start уже содержит таймзону (например, "+00:00" или "+03:00")
      const startInTarget = toTarget(item.start); // учитываем родной оффсет, затем приводим к целевому

      const dayOfWeekName = dayOfWeekNameByDate(startInTarget);
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
        // Храним start уже в целевой зоне, чтобы дальше всё было консистентно
        start: toTargetISO(item.start),
        duration: item.duration,
        comment: item.comment,
      };

      (acc[groupKey] ||= []).push(groupItem);
      return acc;
    },
    {} as Record<string, TaskItem[]>,
  );

  return Object.values(grouped).map((group) => {
    const durations = group.map(
      (i) =>
        ({
          id: i.id,
          duration: i.duration,
          start: i.start,
          comment: i.comment,
        }) as DurationItem,
    );
    const totalDuration = sumDurations(group.map((i) => i.duration));
    return { ...group[0], duration: totalDuration, durations };
  });
}

// Безопасно получить Date из строки/Date
export function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const s = normalizeTZ(value);
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(value) : d;
}

// Полночь локального дня
export function startOfDay(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// ISO-неделя: начало (понедельник)
export function startOfISOWeek(d: Date): Date {
  const dt = startOfDay(d);
  const day = dt.getDay(); // 0..6 (вс..сб)
  const iso = day === 0 ? 7 : day; // 1..7 (пн..вс)
  const monday = new Date(dt);
  monday.setDate(dt.getDate() - (iso - 1));
  return monday;
}

// ISO-неделя: конец (вс 23:59:59.999)
export function endOfISOWeek(d: Date): Date {
  const monday = startOfISOWeek(d);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// Все понедельники недель в диапазоне [from..to]
export function enumerateISOWeeks(from: Date, to: Date): Date[] {
  const res: Date[] = [];
  let cur = startOfISOWeek(from);
  const last = endOfISOWeek(to);
  while (cur <= last) {
    res.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return res;
}

// Номер ISO-недели (1..53)
export function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Заголовок колонки недели: W38 (15–21 Sep)
export function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const wn = getISOWeekNumber(monday);
  const dd = (n: number) => String(n).padStart(2, "0");
  const monthShort = (d: Date) =>
    d.toLocaleString(undefined, { month: "short" });
  return `W${wn} (${dd(monday.getDate())}–${dd(sunday.getDate())} ${monthShort(monday)})`;
}

// Ключ недели (понедельник) yyyy-MM-dd (UTC)
export function weekKey(monday: Date): string {
  return monday.toISOString().slice(0, 10);
}

// Приведение разных форматов длительности → ISO8601 (PT…)
export function toIsoDuration(v: any): string {
  if (typeof v === "string" && /^P/.test(v)) return v; // уже ISO

  if (typeof v === "number") {
    const sec = Math.max(0, v | 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts: string[] = [];
    if (h) parts.push(`${h}H`);
    if (m) parts.push(`${m}M`);
    if (s) parts.push(`${s}S`);
    return `PT${parts.join("") || "0S"}`;
  }

  if (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)) {
    const [hh, mm] = v.split(":").map(Number);
    const h = hh || 0;
    const m = mm || 0;
    return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}` || "PT0S";
  }

  if (typeof v === "object" && v && ("minutes" in v || "hours" in v)) {
    const h = Number((v as any).hours || 0);
    const m = Number((v as any).minutes || 0);
    return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}` || "PT0S";
  }

  return "PT0S";
}

// ISO8601 duration → часы (поддерживает P1D, PT5H30M и т.п.)
export function isoDurationToHours(iso: string): number {
  if (!iso) return 0;
  const norm = iso.startsWith("PT") ? iso.replace(/^PT/, "P0DT") : iso;
  const re = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i;
  const m = re.exec(norm);
  if (!m) return 0;
  const days = Number(m[1] || 0);
  const h = Number(m[2] || 0);
  const min = Number(m[3] || 0);
  const s = Number(m[4] || 0);
  const total = days * 24 + h + min / 60 + s / 3600;
  return Math.round(total * 100) / 100;
}

// В диапазоне [from..to]?
export function clampDateToRange(d: Date, from: Date, to: Date): Date | null {
  if (d < from || d > to) return null;
  return d;
}

/** ===== Нормализация worklog-элемента (под ЯТ) ===== */

export interface WorklogItem {
  id?: number | string;
  issue: { key: string; display?: string };
  start: string; // ISO datetime
  duration: string; // ISO-8601
  fio?: string; // ← добавили
}

// Универсальная нормализация одной записи worklog → WorklogItem
export function normalizeWorklogItem(
  x: Record<string, any>,
): WorklogItem | null {
  if (!x) return null;

  const issue = x.issue || {};
  const key: string | undefined = issue.key || x.issueKey || x.key;
  if (!key) return null;

  const display: string | undefined =
    issue.display || x.issueTitle || x.summary || x.display;

  const startRaw: string | undefined =
    x.start || x.started || x.startAt || x.createdAt || x.updatedAt;
  if (!startRaw) return null;

  const durationAny: any = x.duration ?? x.timeSpent ?? x.time;
  const durationISO = toIsoDuration(durationAny);

  // ← добавили: берем ФИО из updatedBy/createdBy
  const fio: string | undefined =
    x.updatedBy?.display ??
    x.createdBy?.display ??
    x.user?.display ??
    x.author?.display ??
    undefined;

  return {
    id: x.id ?? `${key}-${startRaw}`,
    issue: { key, display },
    start: startRaw,
    duration: durationISO,
    fio, // ← добавили
  };
}

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

export const isValidDuration = (duration: string): boolean => {
  // Обновлённое регулярное выражение для ISO8601 длительности без поддержки лет и секунд
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

const WORK_DAYS_PER_WEEK = 5;
const WORK_HOURS_PER_DAY = 8;

export const displayDuration = (duration: string): string => {
  if (typeof duration !== "string") return "";
  // Если “P” (плейсхолдер пустого значения) — возвращаем пустую строку
  if (duration === "P") return "";

  // Регулярка для ISO-8601 Duration (учитываются годы, недели, дни, часы, минуты, секунды)
  const regex =
    /^P(?:([0-9]+)Y)?(?:([0-9]+)W)?(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/;
  const matches = duration.match(regex);
  if (!matches) return duration; // если не подошло под формат, возвращаем оригинал

  const [, , weeks, days, hours, minutes, seconds] = matches;

  // 1) Считаем общее число “дней” из недель и дней:
  //    - каждая неделя = 5 рабочих дней
  //    - каждый день = 1 день (далее переведём в часы)
  let totalDays = 0;
  if (weeks) totalDays += parseInt(weeks, 10) * WORK_DAYS_PER_WEEK;
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
  totalHours += totalDays * WORK_HOURS_PER_DAY;

  // 7) Теперь разбиваем общее число часов на “дни” (по 8 часов) и “остаточные” часы
  const displayDays = Math.floor(totalHours / WORK_HOURS_PER_DAY);
  const displayHours = totalHours % WORK_HOURS_PER_DAY;

  // 8) Собираем итоговую строку: d/h/m, но пропускаем нулевые значения
  const parts: string[] = [];
  if (displayDays) parts.push(`${displayDays}d`);
  if (displayHours) parts.push(`${displayHours}h`);
  if (displayMinutes) parts.push(`${displayMinutes}m`);

  // Если в итоге не набралось ни дней, ни часов, ни минут — возвращаем пустую строку
  if (parts.length === 0) return "";

  return parts.join(" ");
};

export const displayStartTime = (start?: string | null): string => {
  if (!start) return "";
  const value = toTarget(start);
  if (!value.isValid()) return "";
  return value.format("HH:mm");
};

export const workDaysToDurationInput = (days?: number | null): string => {
  if (days == null || Number.isNaN(days)) return "";
  const totalMinutes = Math.round(days * WORK_HOURS_PER_DAY * 60);
  const minutesInDay = WORK_HOURS_PER_DAY * 60;
  const fullDays = Math.floor(totalMinutes / minutesInDay);
  const remainingMinutes = totalMinutes % minutesInDay;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts: string[] = [];
  if (fullDays) parts.push(`${fullDays}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
};

export const workMinutesToDurationInput = (
  minutes?: number | null,
): string => {
  if (minutes == null || Number.isNaN(minutes)) return "";
  const totalMinutes = Math.round(minutes);
  const sign = totalMinutes < 0 ? "-" : "";
  const absMinutes = Math.abs(totalMinutes);
  const minutesInDay = WORK_HOURS_PER_DAY * 60;
  const fullDays = Math.floor(absMinutes / minutesInDay);
  const remainingMinutes = absMinutes % minutesInDay;
  const hours = Math.floor(remainingMinutes / 60);
  const restMinutes = remainingMinutes % 60;

  const parts: string[] = [];
  if (fullDays) parts.push(`${fullDays}d`);
  if (hours) parts.push(`${hours}h`);
  if (restMinutes) parts.push(`${restMinutes}m`);

  if (parts.length === 0) return "0m";
  return `${sign}${parts.join(" ")}`;
};

export const durationToWorkDays = (isoDuration: string): number => {
  if (!isoDuration) return 0;
  const match = isoDuration.match(
    /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i,
  );
  if (!match) return 0;

  const [, weeks = "0", days = "0", hours = "0", minutes = "0", seconds = "0"] =
    match;
  const totalMinutes =
    (Number(weeks) * WORK_DAYS_PER_WEEK + Number(days)) *
      WORK_HOURS_PER_DAY *
      60 +
    Number(hours) * 60 +
    Number(minutes) +
    Number(seconds) / 60;
  const totalDays = totalMinutes / (WORK_HOURS_PER_DAY * 60);
  return Math.round(totalDays * 100) / 100;
};

export const durationToWorkMinutes = (isoDuration: string): number => {
  if (!isoDuration) return 0;
  const match = isoDuration.match(
    /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i,
  );
  if (!match) return 0;

  const [, weeks = "0", days = "0", hours = "0", minutes = "0", seconds = "0"] =
    match;
  const totalMinutes =
    (Number(weeks) * WORK_DAYS_PER_WEEK + Number(days)) *
      WORK_HOURS_PER_DAY *
      60 +
    Number(hours) * 60 +
    Number(minutes) +
    Number(seconds) / 60;
  return Math.round(totalMinutes);
};

// ==== MSK helpers (UTC+3) ====
const MSK_OFFSET_MIN = 180; // UTC+3, без DST

// Приводит любую дату/время к зоне MSK
export const toMSK = (d: dayjs.Dayjs | string | Date): dayjs.Dayjs => {
  if (typeof d === "string") {
    return dayjs.utc(normalizeTZ(d)).utcOffset(MSK_OFFSET_MIN);
  }
  return dayjs(d).utc().utcOffset(MSK_OFFSET_MIN);
};

// Специально для строк UTC из API -> ISO в +03:00
export const toMSKISO = (utcStr: string): string =>
  dayjs
    .utc(normalizeTZ(utcStr))
    .utcOffset(MSK_OFFSET_MIN)
    .format("YYYY-MM-DDTHH:mm:ss.SSSZ");

export function sumDurations(durations: string[]): string {
  const minutesInWorkDay = WORK_HOURS_PER_DAY * 60; // 8 часов = 1 «рабочий» день
  const isoRegex =
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i;

  // Пустые "P" → "PT0M"
  const normalized = durations.map((d) => (d === "P" ? "PT0M" : d));

  let standardDays = 0; // колич. «рабочих» дней
  let extraMinutes = 0; // накопленные минуты из часов/минут/секунд

  normalized.forEach((dur) => {
    const match = dur.match(isoRegex);
    if (!match) {
      return;
    }

    const [, , , weeks, days, hours, minutes, seconds] = match;

    if (weeks) {
      standardDays += parseInt(weeks, 10) * WORK_DAYS_PER_WEEK;
    }

    if (days) {
      standardDays += parseInt(days, 10);
    }

    if (hours) {
      extraMinutes += parseInt(hours, 10) * 60;
    }
    if (minutes) {
      extraMinutes += parseInt(minutes, 10);
    }
    if (seconds) {
      extraMinutes += Math.floor(parseInt(seconds, 10) / 60);
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
  return result === "P" ? "PT0M" : result;
}

//  Пример использования:
// const durations = ["P1D", "PT4H", "PT45M", "PT2H30M"];
// const result = sumDurations(durations);

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
