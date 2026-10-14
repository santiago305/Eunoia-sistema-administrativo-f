import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserIncomeScopesModal } from "./UserIncomeScopesModal";

const { getIncomeScopeOptions, getUserIncomeScopes, replaceUserIncomeScopes } = vi.hoisted(() => ({
  getIncomeScopeOptions: vi.fn(),
  getUserIncomeScopes: vi.fn(),
  replaceUserIncomeScopes: vi.fn(),
}));

vi.mock("@/shared/services/accessControlService", () => ({ getIncomeScopeOptions, getUserIncomeScopes, replaceUserIncomeScopes }));
vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, description, children, footer }: any) => open ? <section><h2>{title}</h2><p>{description}</p>{children}{footer}</section> : null,
}));

const user = { id: "user-1", name: "Finanzas", email: "finanzas@example.test", role: "finance" } as any;

describe("UserIncomeScopesModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIncomeScopeOptions.mockResolvedValue({
      subsidiaries: [{ id: "branch-1", label: "Sede Centro" }],
      paymentAccounts: [{ id: "account-1", label: "Banco •••• 1234" }],
      clients: [{ id: "client-1", label: "Cliente Uno" }],
    });
    getUserIncomeScopes.mockResolvedValue([{ type: "SUBSIDIARY", id: "branch-1" }]);
    replaceUserIncomeScopes.mockResolvedValue({});
  });

  it("loads assignments, saves explicit scopes, and closes after success", async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<UserIncomeScopesModal open user={user} onClose={onClose} onSaved={onSaved} />);

    expect(await screen.findByLabelText("Sede Centro")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Banco •••• 1234"));
    fireEvent.click(screen.getByLabelText("Cliente Uno"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar alcance" }));

    await waitFor(() => expect(replaceUserIncomeScopes).toHaveBeenCalledWith("user-1", [
      { type: "SUBSIDIARY", id: "branch-1" },
      { type: "PAYMENT_ACCOUNT", id: "account-1" },
      { type: "CLIENT", id: "client-1" },
    ]));
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the modal open and shows recovery guidance when save fails", async () => {
    replaceUserIncomeScopes.mockRejectedValueOnce(new Error("forbidden"));
    render(<UserIncomeScopesModal open user={user} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByLabelText("Sede Centro");
    fireEvent.click(screen.getByRole("button", { name: "Guardar alcance" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se guardaron los cambios");
  });
});
