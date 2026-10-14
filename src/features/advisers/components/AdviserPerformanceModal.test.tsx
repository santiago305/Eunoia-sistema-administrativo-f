import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdviserPerformanceModal } from "./AdviserPerformanceModal";

const { getAdviserAnalytics } = vi.hoisted(() => ({ getAdviserAnalytics: vi.fn() }));

vi.mock("@/shared/services/adviserService", () => ({ getAdviserAnalytics }));
vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, children }: { open: boolean; title: string; children: ReactNode }) => open ? <section role="dialog" aria-label={title}>{children}</section> : null,
}));
vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" onClick={onClick} {...props}>{children}</button>,
}));
vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ data }: { data: Array<{ currency: string }> }) => <output data-testid="bar-data">{data.map((item) => item.currency).join(",")}</output>,
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ data }: { data: Array<{ currency: string }> }) => <output data-testid="line-data">{data.map((item) => item.currency).join(",")}</output>,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

describe("AdviserPerformanceModal currencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdviserAnalytics.mockResolvedValue({
      months: 3,
      period: { startDate: "2026-08-01", endDate: "2026-10-31" },
      currencies: ["PEN", "USD"],
      items: [
        { monthKey: "2026-09", currency: "PEN", orders: 1, soldTotal: 100, collectedTotal: 50, collectionRate: 50, performanceScore: 45 },
        { monthKey: "2026-09", currency: "USD", orders: 1, soldTotal: 10, collectedTotal: 10, collectionRate: 100, performanceScore: 60 },
      ],
      trends: {
        PEN: { current: 45, previous: 40, delta: 5, direction: "improved" },
        USD: { current: 60, previous: 55, delta: 5, direction: "improved" },
      },
    });
  });

  it("plots one currency at a time and switches the monthly series with the selector", async () => {
    render(<AdviserPerformanceModal open adviser={{ id: "adviser-1", name: "Ana", email: "ana@example.com" }} onClose={vi.fn()} />);

    const selector = await screen.findByLabelText("Moneda");
    await waitFor(() => expect(getAdviserAnalytics).toHaveBeenCalledWith("adviser-1", 6));
    expect(selector).toHaveValue("PEN");
    expect(screen.getAllByTestId("line-data").every((chart) => chart.textContent === "PEN")).toBe(true);

    fireEvent.change(selector, { target: { value: "USD" } });
    expect(screen.getAllByTestId("line-data").every((chart) => chart.textContent === "USD")).toBe(true);
    expect(screen.getAllByText(/USD.*10\.00/)).toHaveLength(2);
  });
});
