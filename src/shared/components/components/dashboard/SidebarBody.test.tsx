import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SidebarItem } from "./types";
import SidebarBody from "./SidebarBody";

const authState = vi.hoisted(() => ({
  permissions: [] as string[],
  userRole: "admin" as string | null,
  isSuperAdmin: false,
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("./SidebarContext", () => ({
  useSidebarContext: () => ({ isCollapsed: false, isMobile: false }),
}));

vi.mock("@/features/mail/context/MailDashboardProvider", () => ({
  useMailDashboardContext: () => ({
    counts: {},
    labels: [],
    storage: {
      usedPercent: 0,
      usedBytes: 0,
      quotaBytes: 1024 * 1024,
      quotaGb: 1,
    },
    reloadStorage: vi.fn(),
  }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: vi.fn(() => false) }),
}));

vi.mock("@/features/mail/services/messages.service", () => ({
  updateMyMailStorageQuota: vi.fn(),
}));

vi.mock("./SidebarItem", () => ({
  default: ({ item }: { item: SidebarItem }) => (
    <section data-testid={`sidebar-item-${item.label}`}>
      <span>{item.label}</span>
      {item.children?.map((child) => (
        <span key={child.href ?? child.label}>{child.label}</span>
      ))}
    </section>
  ),
}));

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={["/compras"]}>
      <SidebarBody />
    </MemoryRouter>,
  );

describe("SidebarBody purchase dashboard permissions", () => {
  beforeEach(() => {
    authState.permissions = [];
    authState.userRole = "admin";
    authState.isSuperAdmin = false;
  });

  it("hides the purchase dashboard child when the user only has purchase list access", () => {
    authState.permissions = ["page.purchases.view"];

    renderSidebar();

    const purchaseSection = screen.getByTestId("sidebar-item-Compras");
    expect(within(purchaseSection).queryByText("Dashboard")).toBeNull();
  });

  it("shows the purchase dashboard child when the user has the dashboard base permission", () => {
    authState.permissions = ["page.purchases.view", "purchases_dashboard.view"];

    renderSidebar();

    const purchaseSection = screen.getByTestId("sidebar-item-Compras");
    expect(within(purchaseSection).getByText("Dashboard")).toBeDefined();
  });
});
