import {
  mergeAcpCatalogEntries,
  resolveAcpSetupCatalog,
  type AcpSetupCatalog,
} from "../../../../src/shared/acp-setup-catalog.ts";

export type AcpCatalogState = {
  client: import("../gateway.ts").GatewayBrowserClient | null;
  connected: boolean;
  configForm: Record<string, unknown> | null;
  acpCatalogLoading: boolean;
  acpCatalog: AcpSetupCatalog | null;
  acpCatalogError: string | null;
  acpHarnessLoginBusy?: boolean;
  acpHarnessLoginMessage?: string | null;
  acpHarnessLoginHarnessId?: string | null;
};

export function resolveLocalAcpSetupCatalog(
  formValue: Record<string, unknown> | null | undefined,
): AcpSetupCatalog {
  return resolveAcpSetupCatalog({
    cfg: formValue ?? undefined,
  });
}

export function mergeAcpCatalogWithForm(
  remote: AcpSetupCatalog | null | undefined,
  formValue: Record<string, unknown> | null | undefined,
): AcpSetupCatalog {
  return mergeAcpCatalogEntries({
    remote,
    cfg: formValue ?? undefined,
  });
}

export async function refreshAcpCatalog(state: AcpCatalogState): Promise<void> {
  const local = resolveLocalAcpSetupCatalog(state.configForm);
  if (!state.client || !state.connected) {
    state.acpCatalogLoading = false;
    state.acpCatalogError = null;
    state.acpCatalog = local;
    return;
  }
  state.acpCatalogLoading = true;
  state.acpCatalogError = null;
  try {
    const remote = await state.client.request<AcpSetupCatalog>("acp.catalog", {});
    state.acpCatalog = mergeAcpCatalogWithForm(remote, state.configForm);
  } catch (error) {
    state.acpCatalogError = error instanceof Error ? error.message : String(error);
    state.acpCatalog = local;
  } finally {
    state.acpCatalogLoading = false;
  }
}

export async function startAcpHarnessLogin(
  state: AcpCatalogState,
  harnessId: string,
): Promise<void> {
  if (!state.client || !state.connected) {
    state.acpHarnessLoginMessage = "Gateway is not connected.";
    return;
  }
  state.acpHarnessLoginBusy = true;
  state.acpHarnessLoginMessage = null;
  state.acpHarnessLoginHarnessId = harnessId;
  try {
    const result = await state.client.request<{
      harnessId: string;
      started: boolean;
      message: string;
    }>("acp.harnessAuth.login", { harnessId });
    state.acpHarnessLoginMessage = result.message;
  } catch (error) {
    state.acpHarnessLoginMessage = error instanceof Error ? error.message : String(error);
  } finally {
    state.acpHarnessLoginBusy = false;
    state.acpHarnessLoginHarnessId = null;
  }
}

export type { AcpSetupCatalog } from "../../../../src/shared/acp-setup-catalog.ts";
