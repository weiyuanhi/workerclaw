// In-place edit panel for an existing models.providers entry.
import type { ConfigUiHints } from "../types.ts";
import { cloneConfigObject, setPathValue } from "../controllers/config/form-utils.ts";
import { schemaType, type JsonSchema } from "./config-form.shared.ts";
import {
  buildCloudProviderDraftEntry,
  buildLocalProviderDraftEntry,
  normalizeQuickProviderDraftEntry,
  resolveLocalModelProviderPreset,
  seedProviderEditDraft,
  type ModelProviderCreateKind,
} from "./config-form-provider-presets.ts";
import {
  normalizeModelProviderDraftEntry,
  requestConfigFormUpdate,
  resolveModelProviderDraftBaseUrl,
} from "./config-form-provider-modal.ts";

export type ModelProviderEditPanelContext = {
  path: Array<string | number>;
  schema: JsonSchema;
  value: Record<string, unknown>;
  hints: ConfigUiHints;
  unsupported: Set<string>;
  rawAvailable?: boolean;
  disabled: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRequestUpdate?: () => void;
};

export type ModelProviderEditPanelViewState = {
  open: boolean;
  providerId: string;
  kind: ModelProviderCreateKind;
  draftEntry: Record<string, unknown>;
  quickModelId: string;
  showAdvanced: boolean;
  errorKey: string | null;
  context: ModelProviderEditPanelContext | null;
};

const editState: ModelProviderEditPanelViewState = {
  open: false,
  providerId: "",
  kind: "cloud",
  draftEntry: {},
  quickModelId: "",
  showAdvanced: false,
  errorKey: null,
  context: null,
};

export function getModelProviderEditPanelState(): ModelProviderEditPanelViewState {
  return editState;
}

export function isModelProviderEditPanelOpen(): boolean {
  return editState.open;
}

function pathStartsWith(
  path: Array<string | number>,
  prefix: Array<string | number>,
): boolean {
  if (path.length < prefix.length) {
    return false;
  }
  for (let index = 0; index < prefix.length; index += 1) {
    if (path[index] !== prefix[index]) {
      return false;
    }
  }
  return true;
}

export function patchModelProviderEditDraft(
  providerId: string,
  contextPath: Array<string | number>,
  patchPath: Array<string | number>,
  value: unknown,
) {
  const entryPath = [...contextPath, providerId];
  if (!pathStartsWith(patchPath, entryPath)) {
    return;
  }
  const relativePath = patchPath.slice(entryPath.length);
  if (relativePath.length === 0) {
    editState.draftEntry =
      value && typeof value === "object" && !Array.isArray(value)
        ? cloneConfigObject(value as Record<string, unknown>)
        : {};
    return;
  }
  setPathValue(editState.draftEntry, relativePath, value);
}

function closeModelProviderEditPanel(requestUpdate?: () => void) {
  editState.open = false;
  editState.providerId = "";
  editState.kind = "cloud";
  editState.draftEntry = {};
  editState.quickModelId = "";
  editState.showAdvanced = false;
  editState.errorKey = null;
  editState.context = null;
  requestUpdate?.();
}

export function openModelProviderEditPanel(
  context: Omit<ModelProviderEditPanelContext, "onRequestUpdate">,
  providerId: string,
) {
  if (context.disabled) {
    return;
  }
  const trimmedId = providerId.trim();
  if (!trimmedId) {
    return;
  }
  const existingEntry = context.value?.[trimmedId];
  const entry =
    existingEntry && typeof existingEntry === "object" && !Array.isArray(existingEntry)
      ? (existingEntry as Record<string, unknown>)
      : {};
  const seeded = seedProviderEditDraft(trimmedId, entry);
  editState.open = true;
  editState.providerId = trimmedId;
  editState.kind = seeded.kind;
  editState.draftEntry = seeded.draftEntry;
  editState.quickModelId = seeded.quickModelId;
  editState.showAdvanced = false;
  editState.errorKey = null;
  editState.context = {
    ...context,
    onRequestUpdate: requestConfigFormUpdate,
  };
  requestConfigFormUpdate();
}

export function resolveModelProviderEditPanelErrorKey(
  kind: ModelProviderCreateKind,
  providerId: string,
  quickModelId: string,
  draftEntry: Record<string, unknown>,
): string | null {
  if (kind === "local") {
    if (!quickModelId.trim()) {
      return "modelIdRequired";
    }
    if (!resolveModelProviderDraftBaseUrl(draftEntry)) {
      return "baseUrlRequired";
    }
    return null;
  }
  if (kind === "custom") {
    if (!resolveModelProviderDraftBaseUrl(draftEntry)) {
      return "baseUrlRequired";
    }
    return null;
  }
  if (!providerId.trim()) {
    return "providerIdRequired";
  }
  return null;
}

function resolveSubmitProviderEntry(): Record<string, unknown> {
  if (editState.kind === "cloud") {
    return buildCloudProviderDraftEntry(editState.draftEntry);
  }
  if (editState.kind === "local") {
    const preset = resolveLocalModelProviderPreset(editState.providerId);
    if (!preset) {
      return normalizeQuickProviderDraftEntry(editState.draftEntry);
    }
    return buildLocalProviderDraftEntry(preset, editState.draftEntry, editState.quickModelId);
  }
  return normalizeModelProviderDraftEntry(editState.draftEntry);
}

export function submitModelProviderEditPanel() {
  const context = editState.context;
  if (!context || context.disabled) {
    return;
  }
  const errorKey = resolveModelProviderEditPanelErrorKey(
    editState.kind,
    editState.providerId,
    editState.quickModelId,
    editState.draftEntry,
  );
  if (errorKey) {
    editState.errorKey = errorKey;
    context.onRequestUpdate?.();
    return;
  }
  const providerId = editState.providerId.trim();
  const next = {
    ...context.value,
    [providerId]: resolveSubmitProviderEntry(),
  };
  context.onPatch(context.path, next);
  closeModelProviderEditPanel(context.onRequestUpdate);
}

export function cancelModelProviderEditPanel() {
  closeModelProviderEditPanel(editState.context?.onRequestUpdate);
}

export function clearModelProviderEditPanelError() {
  editState.errorKey = null;
}

export function setModelProviderEditQuickModelId(next: string) {
  editState.quickModelId = next;
  clearModelProviderEditPanelError();
  editState.context?.onRequestUpdate?.();
}

export function setModelProviderEditShowAdvanced(next: boolean) {
  editState.showAdvanced = next;
  editState.context?.onRequestUpdate?.();
}

export function resetModelProviderEditPanelForTests() {
  closeModelProviderEditPanel();
}

export function isModelProviderEditPanelSchema(schema: JsonSchema): boolean {
  return schemaType(schema) === "object" && Boolean(schema.properties || schema.additionalProperties);
}
