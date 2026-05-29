import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SidebarItem from "./SidebarItem";
import { SidebarContext } from "./SidebarContext";
import type { SidebarItem as SidebarItemType } from "./types";
import { getMailSidebarItems } from "@/shared/config/mailSidebarConfig";

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({
    permissions: ["notifications.labels.create"],
  }),
}));

const sidebarContextValue = {
  isCollapsed: false,
  isMobile: false,
  isTablet: false,
  isMobileSidebarOpen: false,
  toggleSidebar: vi.fn(),
  setCollapsed: vi.fn(),
  openMobileSidebar: vi.fn(),
  closeMobileSidebar: vi.fn(),
};

const renderSidebarItem = (item: SidebarItemType, route = "/email/sent/thread-1?labelId=old") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <SidebarContext.Provider value={sidebarContextValue}>
        <SidebarItem item={item} />
      </SidebarContext.Provider>
    </MemoryRouter>,
  );

describe("SidebarItem mail actions", () => {
  it("marks + Etiqueta as a dynamic create-label action", () => {
    const moreItem = getMailSidebarItems(undefined, [], true).find((item) => item.label === "Mas");
    const createLabelItem = moreItem?.children?.find((item) => item.label === "+ Etiqueta");

    expect(createLabelItem?.isCreateLabelAction).toBe(true);
    expect(createLabelItem?.href).toBeUndefined();
  });

  it("keeps the current route when opening create label from a nested mail page", () => {
    renderSidebarItem({
      label: "Mas",
      children: [
        {
          label: "+ Etiqueta",
          isCreateLabelAction: true,
        },
      ],
    });

    const createLabelLink = screen.getByRole("link", { name: "+ Etiqueta" });

    expect(createLabelLink).toHaveAttribute(
      "href",
      "/email/sent/thread-1?labelId=old&createLabel=1",
    );
  });
});
