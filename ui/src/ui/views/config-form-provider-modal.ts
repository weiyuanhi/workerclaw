// Modal flow for creating models.providers entries in the config form.
import type { ConfigUiHints } from "../types.ts";
import { cloneConfigObject, setPathValue } from "../controllers/config/form-utils.ts";
import { defaultValue, pathKey, schemaType, type JsonSchema } from "./config-form.shared.ts";
import {
  buildCloudProviderDraftEntry,
  buildLocalProviderDraftEntry,
  createLocalProviderDraftFromPreset,
  isBuiltInModelProviderOverlayId,
  normalizeQuickProviderDraftEntry,
  resolveCloudModelProviderPreset,
  resolveFirstAvailableCloudPresetId,
  resolveFirstAvailableLocalPresetId,
  resolveLocalModelProviderPreset,
  type ModelProviderCreateKind,
} from "./config-form-provider-presets.ts";

export type ModelProviderCreateModalContext = {
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

export type ModelProviderCreateModalViewState = {
  open: boolean;
  kind: ModelProviderCreateKind;
  presetId: string;
  providerId: string;
  quickModelId: string;
  draftEntry: Record<string, unknown>;
  showAdvanced: boolean;
  errorKey: string | null;
  context: ModelProviderCreateModalContext | null;
};

const modalState: ModelProviderCreateModalViewState = {
  open: false,
  kind: "cloud",
  presetId: "",
  providerId: "",
  quickModelId: "",
  draftEntry: {},
  showAdvanced: false,
  errorKey: null,
  context: null,
};

let configFormRequestUpdate: (() => void) | undefined;

export function bindConfigFormRequestUpdate(onRequestUpdate?: () => void) {
  configFormRequestUpdate = onRequestUpdate;
}

export function requestConfigFormUpdate() {
  configFormRequestUpdate?.();
}

export function getModelProviderCreateModalState(): ModelProviderCreateModalViewState {
  return modalState;
}

export function isModelProvidersMapPath(path: Array<string | number>): boolean {
  return pathKey(path) === "models.providers";
}

export function isValidModelProviderId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/u.test(trimmed)) {
    return false;
  }
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(trimmed);
}

export function resolveModelProviderDraftKey(providerId: string): string {
  const trimmed = providerId.trim();
  return trimmed || "__draft__";
}

function createInitialModelProviderDraft(schema: JsonSchema): Record<string, unknown> {
  const draft =
    defaultValue(schema) && typeof defaultValue(schema) === "object" && !Array.isArray(defaultValue(schema))
      ? cloneConfigObject(defaultValue(schema) as Record<string, unknown>)
      : {};
  if (!Array.isArray(draft.models)) {
    draft.models = [];
  }
  return draft;
}

export function normalizeModelProviderDraftEntry(
  draftEntry: Record<string, unknown>,
): Record<string, unknown> {
  const entry = cloneConfigObject(draftEntry);
  if (!Array.isArray(entry.models)) {
    entry.models = [];
  }
  return entry;
}

export function resolveModelProviderDraftBaseUrl(
  draftEntry: Record<string, unknown>,
): string | null {
  const baseUrl = draftEntry.baseUrl;
  if (typeof baseUrl !== "string") {
    return null;
  }
  const trimmed = baseUrl.trim();
  return trimmed || null;
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

export function patchModelProviderCreateDraft(
  providerId: string,
  contextPath: Array<string | number>,
  patchPath: Array<string | number>,
  value: unknown,
) {
  const entryPath = [...contextPath, resolveModelProviderDraftKey(providerId)];
  if (!pathStartsWith(patchPath, entryPath)) {
    return;
  }
  const relativePath = patchPath.slice(entryPath.length);
  if (relativePath.length === 0) {
    modalState.draftEntry =
      value && typeof value === "object" && !Array.isArray(value)
        ? cloneConfigObject(value as Record<string, unknown>)
        : createInitialModelProviderDraft(modalState.context?.schema ?? {});
    return;
  }
  setPathValue(modalState.draftEntry, relativePath, value);
}

function closeModelProviderCreateModal(requestUpdate?: () => void) {
  modalState.open = false;
  modalState.kind = "cloud";
  modalState.presetId = "";
  modalState.providerId = "";
  modalState.quickModelId = "";
  modalState.draftEntry = {};
  modalState.showAdvanced = false;
  modalState.errorKey = null;
  modalState.context = null;
  requestUpdate?.();
}

function applyCloudPreset(presetId: string) {
  const preset = resolveCloudModelProviderPreset(presetId);
  if (!preset) {
    return;
  }
  modalState.presetId = preset.id;
  modalState.providerId = preset.id;
  modalState.quickModelId = "";
  modalState.draftEntry = {};
  modalState.showAdvanced = false;
}

function applyLocalPreset(presetId: string) {
  const preset = resolveLocalModelProviderPreset(presetId);
  if (!preset) {
    return;
  }
  modalState.presetId = preset.id;
  modalState.providerId = preset.id;
  modalState.quickModelId = "";
  modalState.draftEntry = createLocalProviderDraftFromPreset(preset);
  modalState.showAdvanced = false;
}

function resetModalDraftForKind(
  kind: ModelProviderCreateKind,
  existing: Record<string, unknown>,
) {
  modalState.kind = kind;
  modalState.showAdvanced = false;
  modalState.errorKey = null;
  if (kind === "cloud") {
    const presetId = resolveFirstAvailableCloudPresetId(existing) ?? CLOUD_FALLBACK_PRESET_ID;
    applyCloudPreset(presetId);
    return;
  }
  if (kind === "local") {
    const presetId = resolveFirstAvailableLocalPresetId(existing) ?? LOCAL_FALLBACK_PRESET_ID;
    applyLocalPreset(presetId);
    return;
  }
  modalState.presetId = "";
  modalState.providerId = "";
  modalState.quickModelId = "";
  modalState.draftEntry = createInitialModelProviderDraft(modalState.context?.schema ?? {});
}

const CLOUD_FALLBACK_PRESET_ID = "openai";
const LOCAL_FALLBACK_PRESET_ID = "ollama";

export function openModelProviderCreateModal(
  context: Omit<ModelProviderCreateModalContext, "onRequestUpdate">,
) {
  if (context.disabled) {
    return;
  }
  modalState.open = true;
  modalState.errorKey = null;
  modalState.context = {
    ...context,
    onRequestUpdate: configFormRequestUpdate,
  };
  resetModalDraftForKind("cloud", context.value ?? {});
  configFormRequestUpdate?.();
}

export function resolveModelProviderCreateModalErrorKey(
  kind: ModelProviderCreateKind,
  providerId: string,
  presetId: string,
  quickModelId: string,
  draftEntry: Record<string, unknown>,
  existing: Record<string, unknown>,
): string | null {
  const trimmedId = providerId.trim();
  if (kind === "cloud") {
    if (!presetId.trim()) {
      return "presetRequired";
    }
    if (!trimmedId) {
      return "providerIdRequired";
    }
    if (trimmedId in existing) {
      return "providerIdExists";
    }
    return null;
  }
  if (kind === "local") {
    if (!presetId.trim()) {
      return "presetRequired";
    }
    if (!trimmedId) {
      return "providerIdRequired";
    }
    if (trimmedId in existing) {
      return "providerIdExists";
    }
    if (!quickModelId.trim()) {
      return "modelIdRequired";
    }
    if (!resolveModelProviderDraftBaseUrl(draftEntry)) {
      return "baseUrlRequired";
    }
    return null;
  }
  if (!trimmedId) {
    return "providerIdRequired";
  }
  if (!isValidModelProviderId(trimmedId)) {
    return "providerIdInvalid";
  }
  if (trimmedId in existing) {
    return "providerIdExists";
  }
  if (!isBuiltInModelProviderOverlayId(trimmedId) && !resolveModelProviderDraftBaseUrl(draftEntry)) {
    return "baseUrlRequired";
  }
  return null;
}

function resolveSubmitProviderEntry(): Record<string, unknown> {
  if (modalState.kind === "cloud") {
    return buildCloudProviderDraftEntry(modalState.draftEntry);
  }
  if (modalState.kind === "local") {
    const preset = resolveLocalModelProviderPreset(modalState.presetId);
    if (!preset) {
      return normalizeQuickProviderDraftEntry(modalState.draftEntry);
    }
    return buildLocalProviderDraftEntry(preset, modalState.draftEntry, modalState.quickModelId);
  }
  return normalizeModelProviderDraftEntry(modalState.draftEntry);
}

export function submitModelProviderCreateModal() {
  const context = modalState.context;
  if (!context || context.disabled) {
    return;
  }
  const errorKey = resolveModelProviderCreateModalErrorKey(
    modalState.kind,
    modalState.providerId,
    modalState.presetId,
    modalState.quickModelId,
    modalState.draftEntry,
    context.value ?? {},
  );
  if (errorKey) {
    modalState.errorKey = errorKey;
    context.onRequestUpdate?.();
    return;
  }
  const providerId = modalState.providerId.trim();
  const next = {
    ...context.value,
    [providerId]: resolveSubmitProviderEntry(),
  };
  context.onPatch(context.path, next);
  closeModelProviderCreateModal(context.onRequestUpdate);
}

export function cancelModelProviderCreateModal() {
  closeModelProviderCreateModal(modalState.context?.onRequestUpdate);
}

export function clearModelProviderCreateModalError() {
  modalState.errorKey = null;
}

export function setModelProviderCreateModalKind(kind: ModelProviderCreateKind) {
  if (modalState.kind === kind) {
    return;
  }
  resetModalDraftForKind(kind, modalState.context?.value ?? {});
  modalState.context?.onRequestUpdate?.();
}

export function setModelProviderCreateModalPreset(presetId: string) {
  if (modalState.kind === "cloud") {
    applyCloudPreset(presetId);
  } else if (modalState.kind === "local") {
    applyLocalPreset(presetId);
  } else {
    modalState.presetId = presetId;
  }
  clearModelProviderCreateModalError();
  modalState.context?.onRequestUpdate?.();
}

export function setModelProviderCreateModalProviderId(next: string) {
  modalState.providerId = next;
  clearModelProviderCreateModalError();
  modalState.context?.onRequestUpdate?.();
}

export function setModelProviderCreateQuickModelId(next: string) {
  modalState.quickModelId = next;
  clearModelProviderCreateModalError();
  modalState.context?.onRequestUpdate?.();
}

export function setModelProviderCreateModalShowAdvanced(next: boolean) {
  modalState.showAdvanced = next;
  modalState.context?.onRequestUpdate?.();
}

/** Test helper: seed draft fields without walking renderNode. */
export function setModelProviderCreateDraftForTest(entry: Record<string, unknown>) {
  modalState.draftEntry = cloneConfigObject(entry);
}

/** Test helper: seed modal mode without opening the dialog. */
export function setModelProviderCreateModalStateForTest(state: Partial<ModelProviderCreateModalViewState>) {
  Object.assign(modalState, state);
}

export function isModelProviderCreateModalSchema(schema: JsonSchema): boolean {
  return schemaType(schema) === "object" && Boolean(schema.properties || schema.additionalProperties);
}
