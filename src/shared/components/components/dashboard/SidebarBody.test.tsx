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
      {item.href ? (
        <a data-testid={`sidebar-parent-${item.href}`} href={item.href}>
          {item.label}
        </a>
      ) : (
        <span>{item.label}</span>
      )}
      {item.children?.map((child) => (
        <a
          data-testid={`sidebar-child-${child.href ?? child.label}`}
          href={child.href}
          key={child.href ?? child.label}
        >
          {child.label}
        </a>
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

  it("keeps the dashboard parent as text when the user only has purchase list access", () => {
    authState.permissions = ["page.purchases.view"];

    renderSidebar();

    const purchaseSection = screen.getByTestId("sidebar-item-Compras");
    expect(within(purchaseSection).queryByTestId("sidebar-parent-/compras/dashboard")).toBeNull();
    expect(within(purchaseSection).getByTestId("sidebar-child-/compras")).toBeDefined();
  });

  it("links the purchase parent to the dashboard when the user has the dashboard base permission", () => {
    authState.permissions = ["page.purchases.view", "purchases_dashboard.view"];

    renderSidebar();

    const purchaseSection = screen.getByTestId("sidebar-item-Compras");
    expect(within(purchaseSection).getByTestId("sidebar-parent-/compras/dashboard")).toBeDefined();
    expect(within(purchaseSection).getByTestId("sidebar-child-/compras")).toBeDefined();
  });

  it("keeps the purchase parent visible with only recurring purchase permissions", () => {
    authState.permissions = [
      "page.recurring-purchases.view",
      "recurring_purchases.view",
    ];

    renderSidebar();

    const purchaseSection = screen.getByTestId("sidebar-item-Compras");
    expect(within(purchaseSection).queryByTestId("sidebar-parent-/compras/dashboard")).toBeNull();
    expect(within(purchaseSection).queryByTestId("sidebar-child-/compras")).toBeNull();
    expect(within(purchaseSection).getByTestId("sidebar-child-/compras/recurrentes")).toBeDefined();
  });
});
