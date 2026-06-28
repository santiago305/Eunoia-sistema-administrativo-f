import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "@/shared/hooks/useAuth";
import * as authService from "@/shared/services/authService";

vi.mock("@/shared/services/authService", () => ({
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  refresh_token: vi.fn(),
  userInfoAuth: vi.fn(),
}));

type AuthContextValue = ReturnType<typeof useAuth>;

const AuthProbe = ({ onReady }: { onReady: (auth: AuthContextValue) => void }) => {
  const auth = useAuth();
  onReady(auth);
  return null;
};

describe("AuthProvider", () => {
  it("shares an in-flight auth check across concurrent callers", async () => {
    let resolveUser!: (value: authService.UserInfoAuthResponse) => void;
    vi.mocked(authService.userInfoAuth).mockReturnValue(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );

    let auth!: AuthContextValue;
    render(
      <AuthProvider>
        <AuthProbe onReady={(value) => { auth = value; }} />
      </AuthProvider>,
    );

    await waitFor(() => expect(auth).toBeDefined());

    const firstCheck = auth.checkAuth();
    const secondCheck = auth.checkAuth();

    expect(authService.userInfoAuth).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUser({ user_id: "user-1", rol: "admin" });
      await expect(Promise.all([firstCheck, secondCheck])).resolves.toEqual([
        { success: true, message: "Autenticacion validada" },
        { success: true, message: "Autenticacion validada" },
      ]);
    });
  });
});
