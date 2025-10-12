import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

import {
  aggregateDurations,
  isValidDuration,
  normalizeDuration,
  sumDurations,
} from "@/helpers";
import { DataItem } from "@/types/global";

dayjs.extend(isoWeek);

describe("duration helpers", () => {
  it("normalizes shorthand values into ISO 8601 durations", () => {
    expect(normalizeDuration("1d 2h 30m")).toBe("P1DT2H30M");
    expect(normalizeDuration("2h")).toBe("PT2H");
    expect(normalizeDuration("45m")).toBe("PT45M");
  });

  it("keeps invalid durations untouched", () => {
    expect(normalizeDuration("not-a-duration")).toBe("not-a-duration");
    expect(isValidDuration("P1DT2H")).toBe(true);
    expect(isValidDuration("invalid")).toBe(false);
  });

  it("sums durations respecting 8-hour workday rollovers", () => {
    expect(sumDurations(["PT1H", "PT2H30M"])).toBe("PT3H30M");
    expect(sumDurations(["PT4H", "PT4H"])).toBe("P1D");
    expect(sumDurations(["P1D", "PT4H"])).toBe("P1DT4H");
  });
});

describe("aggregateDurations", () => {
  const baseItem: Omit<DataItem, "id" | "duration" | "start" | "comment"> = {
    issue: { display: "Task Alpha", key: "PRJ-1" },
    updatedBy: { id: "user-1", display: "User One" },
  };

  const data: DataItem[] = [
    {
      ...baseItem,
      id: "1",
      duration: "PT1H",
      start: "2024-07-01T09:00:00.000+00:00", // Monday UTC
      comment: "First entry",
    },
    {
      ...baseItem,
      id: "2",
      duration: "PT30M",
      start: "2024-07-01T11:00:00.000+00:00", // same Monday
      comment: "Second entry",
    },
    {
      ...baseItem,
      id: "3",
      duration: "PT2H",
      start: "2024-07-02T09:00:00.000+00:00", // Tuesday UTC
      comment: "Third entry",
    },
  ];

  const result = aggregateDurations(data);

  it("creates one aggregated item per issue/user/day combination", () => {
    expect(result).toHaveLength(2);
    const uniqueKeys = new Set(result.map((item) => item.key));
    expect(uniqueKeys.size).toBe(1); // same issue/user pair
  });

  it("aggregates durations per day and keeps original entries attached", () => {
    const mondayEntry = result.find(
      (entry) => dayjs(entry.start).isoWeekday() === 1
    );
    const tuesdayEntry = result.find(
      (entry) => dayjs(entry.start).isoWeekday() === 2
    );

    expect(mondayEntry?.duration).toBe("PT1H30M");
    expect(mondayEntry?.durations).toHaveLength(2);
    expect(tuesdayEntry?.duration).toBe("PT2H");
    expect(tuesdayEntry?.durations).toHaveLength(1);
  });

  it("normalizes start dates to MSK timezone and populates metadata", () => {
    const mondayEntry = result.find(
      (entry) => dayjs(entry.start).isoWeekday() === 1
    );

    expect(mondayEntry?.start).toBe("2024-07-01T12:00:00.000+03:00");
    expect(mondayEntry?.issue.href).toBe("https://tracker.yandex.ru/PRJ-1");
    expect(mondayEntry?.issue.fio).toBe("User One");
  });
});
