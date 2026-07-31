import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderTrackingCell } from "./SaleOrderTrackingCell";

const order = { preguide: false, prepared: false };

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("SaleOrderTrackingCell", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("renders status tags without checkboxes and only granted fields are interactive", () => {
    render(
      <SaleOrderTrackingCell
        order={order}
        canUpdatePreguide
        canUpdatePrepared={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sin preguía/i })).toBeInTheDocument();
    expect(screen.getByText("Sin preparar").closest("button")).toBeNull();
  });

  it("sends one request with the last value from a rapid click burst", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <SaleOrderTrackingCell
        order={order}
        canUpdatePreguide
        canUpdatePrepared
        onChange={onChange}
      />,
    );

    const preguide = screen.getByRole("button", { name: /sin preguía/i });
    fireEvent.click(preguide);
    fireEvent.click(preguide);
    fireEvent.click(preguide);

    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("preguide", true);
  });

  it("never sends parallel requests and keeps only the latest queued value", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const onChange = vi.fn((_field: string, value: boolean) => {
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      const current = value ? first : second;
      return current.promise.finally(() => {
        activeRequests -= 1;
      });
    });

    render(
      <SaleOrderTrackingCell
        order={order}
        canUpdatePreguide
        canUpdatePrepared
        onChange={onChange}
      />,
    );

    const preguide = screen.getByRole("button", { name: /sin preguía/i });
    fireEvent.click(preguide);
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.click(preguide);
    fireEvent.click(preguide);
    fireEvent.click(preguide);
    expect(onChange).toHaveBeenCalledTimes(1);

    await act(async () => first.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith("preguide", false);
    expect(maxActiveRequests).toBe(1);
    await act(async () => second.resolve());
  });

  it("restores the last confirmed value when the update fails", async () => {
    const onChange = vi.fn().mockRejectedValue(new Error("network"));
    render(
      <SaleOrderTrackingCell
        order={order}
        canUpdatePreguide
        canUpdatePrepared
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /sin preguía/i }));
    expect(screen.getByText("Con preguía")).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(screen.getByText("Sin preguía")).toBeInTheDocument();
  });

  it("keeps rollback state updates enabled after the StrictMode effect replay", async () => {
    const onChange = vi.fn().mockRejectedValue(new Error("network"));
    render(
      <StrictMode>
        <SaleOrderTrackingCell
          order={order}
          canUpdatePreguide
          canUpdatePrepared
          onChange={onChange}
        />
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole("button", { name: /sin preguía/i }));
    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(screen.getByText("Sin preguía")).toBeInTheDocument();
  });
});
