import { describe, expect, it } from "vitest";
import {
  exportColumns,
  getDateRangeBounds,
  isCreatedAtWithinDateRange,
  isValidPhoneForCrmExport,
  normalizePhoneForCrm,
  toCsvContent,
  toExcelHtml,
  toRows,
} from "./Admin";

const requests = [
  {
    id: "req-1",
    created_at: "2026-04-22T08:30:00.000Z",
    address: "100 Main St",
    phone: "(415) 555-2671",
    service_type: "local",
    distance_miles: 12,
    status: "new",
  },
  {
    id: "req-2",
    created_at: "2026-04-22T09:45:00.000Z",
    address: "200 Oak Ave",
    phone: "+44 20 7946 0958",
    service_type: "long-distance",
    distance_miles: 85,
    status: "quoted",
  },
];

describe("admin exports", () => {
  it("normalizes supported phone inputs to +digits", () => {
    expect(normalizePhoneForCrm("(415) 555-2671")).toBe("+14155552671");
    expect(normalizePhoneForCrm("1-415-555-2671")).toBe("+14155552671");
    expect(normalizePhoneForCrm("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("normalizes empty and whitespace phone inputs to a consistent empty value", () => {
    expect(isValidPhoneForCrmExport("")).toBe(true);
    expect(isValidPhoneForCrmExport("   \t  ")).toBe(true);
    expect(normalizePhoneForCrm("")).toBe("");
    expect(normalizePhoneForCrm("   \t  ")).toBe("");
  });

  it("fails validation for malformed phone inputs before export", () => {
    expect(isValidPhoneForCrmExport("not a phone")).toBe(false);
    expect(isValidPhoneForCrmExport("555")).toBe(false);
    expect(isValidPhoneForCrmExport("+1 (415) ABC-DEFG")).toBe(false);
  });

  it("keeps invalid phone inputs out of exported rows", () => {
    const [row] = toRows([
      {
        id: "req-invalid",
        created_at: "2026-04-22T10:00:00.000Z",
        address: "300 Pine Rd",
        phone: "not a phone",
        service_type: "junk",
        distance_miles: 5,
        status: "new",
      },
    ]);

    expect(row.Phone).toBe("");
  });

  it("includes a normalized Phone column in CSV rows", () => {
    const csv = toCsvContent(toRows(requests));

    expect(csv.split("\n")[0].split(",")).toContain("Phone");
    expect(csv).toContain('"+14155552671"');
    expect(csv).toContain('"+442079460958"');
    expect(csv).not.toContain("(415) 555-2671");
    expect(csv).not.toContain("+44 20 7946 0958");
  });

  it("includes a normalized Phone column in Excel-compatible rows", () => {
    const html = toExcelHtml(toRows(requests));

    expect(exportColumns).toContain("Phone");
    expect(html).toContain("<th>Phone</th>");
    expect(html).toContain("<td>+14155552671</td>");
    expect(html).toContain("<td>+442079460958</td>");
    expect(html).not.toContain("(415) 555-2671");
    expect(html).not.toContain("+44 20 7946 0958");
  });

  it("builds date range bounds from the selected timezone calendar day", () => {
    const bounds = getDateRangeBounds("2026-04-22", "2026-04-22", "America/New_York");

    expect(new Date(bounds.fromTime!).toISOString()).toBe("2026-04-22T04:00:00.000Z");
    expect(new Date(bounds.toTime!).toISOString()).toBe("2026-04-23T03:59:59.999Z");
  });

  it("filters created_at values by the user's local timezone date", () => {
    expect(isCreatedAtWithinDateRange("2026-04-22T03:30:00.000Z", "2026-04-22", "2026-04-22", "America/New_York")).toBe(false);
    expect(isCreatedAtWithinDateRange("2026-04-22T04:00:00.000Z", "2026-04-22", "2026-04-22", "America/New_York")).toBe(true);
    expect(isCreatedAtWithinDateRange("2026-04-23T03:59:59.999Z", "2026-04-22", "2026-04-22", "America/New_York")).toBe(true);
    expect(isCreatedAtWithinDateRange("2026-04-23T04:00:00.000Z", "2026-04-22", "2026-04-22", "America/New_York")).toBe(false);
  });
});
