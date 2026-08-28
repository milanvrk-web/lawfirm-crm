export type PipelineRangeMode = "month" | "week" | "custom";

export type PipelineRange = {
  start: string;
  end: string;
  label: string;
};

export function getPipelineRange(input: {
  mode: PipelineRangeMode;
  year: number;
  month: number;
  weekDate: string;
  customStart: string;
  customEnd: string;
}): PipelineRange {
  if (input.mode === "month") {
    const lastDay = new Date(input.year, input.month, 0).getDate();
    const month = String(input.month).padStart(2, "0");
    const end = String(lastDay).padStart(2, "0");
    return { start: `${input.year}-${month}-01`, end: `${input.year}-${month}-${end}`, label: `${input.year}-${month}` };
  }

  if (input.mode === "custom") {
    return { start: input.customStart, end: input.customEnd, label: `${input.customStart} → ${input.customEnd}` };
  }

  const start = new Date(`${input.weekDate}T12:00:00`);
  const day = start.getDay();
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const toPstDate = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const startDate = toPstDate(start);
  const endDate = toPstDate(end);
  return { start: startDate, end: endDate, label: `${startDate} → ${endDate}` };
}
