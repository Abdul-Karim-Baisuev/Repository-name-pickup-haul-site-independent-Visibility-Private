import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: (...args: unknown[]) => toastSuccess(...args) },
}));

const getSession = vi.fn();
const rpc = vi.fn();
const functionsInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => getSession(...args) },
    rpc: (...args: unknown[]) => rpc(...args),
    functions: { invoke: (...args: unknown[]) => functionsInvoke(...args) },
  },
}));

import AdminIntegrations from "./AdminIntegrations";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminIntegrations />
    </MemoryRouter>,
  );

describe("AdminIntegrations — admin-only access", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    getSession.mockReset();
    rpc.mockReset();
    functionsInvoke.mockReset();
  });

  it("redirects to /admin when there is no session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/admin"));
    expect(rpc).not.toHaveBeenCalledWith("get_aikido_credentials_status");
    expect(rpc).not.toHaveBeenCalledWith("set_aikido_credentials", expect.anything());
    expect(functionsInvoke).not.toHaveBeenCalledWith("mapbox-token-status");
  });

  it("shows access denied for non-admin users and does not call status/set RPCs", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    rpc.mockImplementation((name: string) => {
      if (name === "claim_admin_if_none") return Promise.resolve({ data: false, error: null });
      throw new Error(`Unexpected RPC for non-admin: ${name}`);
    });

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    const calls = rpc.mock.calls.map((c) => c[0]);
    expect(calls).toContain("claim_admin_if_none");
    expect(calls).not.toContain("get_aikido_credentials_status");
    expect(calls).not.toContain("set_aikido_credentials");
    expect(functionsInvoke).not.toHaveBeenCalledWith("mapbox-token-status");
  });

  it("loads status for admin and saves credentials via RPC", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "admin1" } } } });
    rpc.mockImplementation((name: string) => {
      if (name === "claim_admin_if_none") return Promise.resolve({ data: true, error: null });
      if (name === "get_aikido_credentials_status") {
        return Promise.resolve({
          data: { client_id_set: false, client_id_preview: null, client_secret_set: false },
          error: null,
        });
      }
      if (name === "set_aikido_credentials") return Promise.resolve({ data: null, error: null });
      throw new Error(`Unexpected RPC: ${name}`);
    });
    functionsInvoke.mockResolvedValue({
      data: {
        configured: true,
        token_prefix: "pk.demo",
        token_kind: "public",
        checks: { geocoding: { ok: true, status: 200 }, directions: { ok: true, status: 200 } },
        summary: "Mapbox token configured.",
      },
      error: null,
    });

    renderPage();

    await waitFor(() => expect(screen.getAllByText(/not configured/i).length).toBeGreaterThan(0));
    await waitFor(() => expect(functionsInvoke).toHaveBeenCalledWith("mapbox-token-status"));

    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: "aikido_id_demo" } });
    fireEvent.change(screen.getByLabelText(/client secret/i), { target: { value: "super-secret" } });
    fireEvent.click(screen.getByRole("button", { name: /save securely/i }));

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("set_aikido_credentials", {
        _client_id: "aikido_id_demo",
        _client_secret: "super-secret",
      }),
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("surfaces backend forbidden error from set RPC and does not show success", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u2" } } } });
    rpc.mockImplementation((name: string) => {
      if (name === "claim_admin_if_none") return Promise.resolve({ data: true, error: null });
      if (name === "get_aikido_credentials_status") {
        return Promise.resolve({
          data: { client_id_set: false, client_id_preview: null, client_secret_set: false },
          error: null,
        });
      }
      if (name === "set_aikido_credentials") {
        return Promise.resolve({ data: null, error: { message: "forbidden" } });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    functionsInvoke.mockResolvedValue({
      data: {
        configured: false,
        token_prefix: null,
        token_kind: null,
        checks: {},
        summary: "Mapbox token is not configured.",
      },
      error: null,
    });

    renderPage();

    await waitFor(() => screen.getByLabelText(/client id/i));
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: "id" } });
    fireEvent.change(screen.getByLabelText(/client secret/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /save securely/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Failed to save credentials", { description: "forbidden" }),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("blocks empty submissions client-side without calling set RPC", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u3" } } } });
    rpc.mockImplementation((name: string) => {
      if (name === "claim_admin_if_none") return Promise.resolve({ data: true, error: null });
      if (name === "get_aikido_credentials_status") {
        return Promise.resolve({
          data: { client_id_set: true, client_id_preview: "••••demo", client_secret_set: true },
          error: null,
        });
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    functionsInvoke.mockResolvedValue({
      data: {
        configured: false,
        token_prefix: null,
        token_kind: null,
        checks: {},
        summary: "Mapbox token is not configured.",
      },
      error: null,
    });

    renderPage();
    await waitFor(() => screen.getByLabelText(/client id/i));
    const button = screen.getByRole("button", { name: /save securely/i });
    expect(button).toBeDisabled();
    expect(rpc).not.toHaveBeenCalledWith("set_aikido_credentials", expect.anything());
  });
});

/**
 * Database-level guarantees enforced in migration 20260430-170115:
 *
 * - EXECUTE on public.set_aikido_credentials and public.get_aikido_credentials_status
 *   is REVOKED from PUBLIC and anon, granted only to authenticated.
 * - Both functions are SECURITY DEFINER and start with:
 *     IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
 *       RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
 *     END IF;
 *   so any non-admin authenticated caller is rejected before reading or writing
 *   the vault, and anon callers are blocked at the ACL layer.
 * - get_aikido_credentials_status never returns secret values — only a boolean
 *   "set" flag plus a masked preview of the client id.
 *
 * The ACL is verified live in the database via:
 *   SELECT has_function_privilege('anon', 'public.set_aikido_credentials(text, text)', 'EXECUTE');
 * which returns false (and true for 'authenticated').
 */
