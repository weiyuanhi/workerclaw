// Edit modal for channel configuration on the Channels page.
import type { ConfigUiHints } from "../types.ts";
import { cloneConfigObject, setPathValue } from "../controllers/config/form-utils.ts";
import { analyzeConfigSchema, schemaType, type JsonSchema } from "./config-form.ts";
import { resolveChannelConfigValue } from "./channel-config-extras.ts";

export type ChannelConfigModalContext = {
  channelId: string;
  channelLabel: string;
  configValue: Record<string, unknown> | null;
  schema: unknown;
  uiHints: ConfigUiHints;
  disabled: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRequestUpdate?: () => void;
};

export type ChannelConfigModalViewState = {
  open: boolean;
  channelId: string;
  channelLabel: string;
  draftEntry: Record<string, unknown>;
  context: ChannelConfigModalContext | null;
};

const modalState: ChannelConfigModalViewState = {
  open: false,
  channelId: "",
  channelLabel: "",
  draftEntry: {},
  context: null,
};

let channelConfigRequestUpdate: (() => void) | undefined;

export function bindChannelConfigRequestUpdate(onRequestUpdate?: () => void) {
  channelConfigRequestUpdate = onRequestUpdate;
}

export function requestChannelConfigUpdate() {
  channelConfigRequestUpdate?.();
}

export function getChannelConfigModalState(): ChannelConfigModalViewState {
  return modalState;
}

function resolveChannelSchemaNode(
  schema: JsonSchema | null,
  channelId: string,
): JsonSchema | null {
  if (!schema || schemaType(schema) !== "object" || !schema.properties) {
    return null;
  }
  const channelsNode = schema.properties.channels;
  if (!channelsNode || schemaType(channelsNode) !== "object") {
    return null;
  }
  const channelNode = channelsNode.properties?.[channelId];
  if (channelNode) {
    return channelNode;
  }
  const additional = channelsNode.additionalProperties;
  return additional && typeof additional === "object" ? additional : null;
}

export function resolveChannelConfigModalSchema(
  schema: unknown,
  channelId: string,
): JsonSchema | null {
  const analysis = analyzeConfigSchema(schema);
  return resolveChannelSchemaNode(analysis.schema, channelId);
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

export function patchChannelConfigDraft(
  channelId: string,
  patchPath: Array<string | number>,
  value: unknown,
) {
  const entryPath = ["channels", channelId];
  if (!pathStartsWith(patchPath, entryPath)) {
    return;
  }
  const relativePath = patchPath.slice(entryPath.length);
  if (relativePath.length === 0) {
    modalState.draftEntry =
      value && typeof value === "object" && !Array.isArray(value)
        ? cloneConfigObject(value as Record<string, unknown>)
        : {};
    return;
  }
  setPathValue(modalState.draftEntry, relativePath, value);
}

function closeChannelConfigModal(requestUpdate?: () => void) {
  modalState.open = false;
  modalState.channelId = "";
  modalState.channelLabel = "";
  modalState.draftEntry = {};
  modalState.context = null;
  requestUpdate?.();
}

export function openChannelConfigModal(context: Omit<ChannelConfigModalContext, "onRequestUpdate">) {
  if (context.disabled) {
    return;
  }
  const value = resolveChannelConfigValue(context.configValue, context.channelId) ?? {};
  modalState.open = true;
  modalState.channelId = context.channelId;
  modalState.channelLabel = context.channelLabel;
  modalState.draftEntry = cloneConfigObject(value);
  modalState.context = {
    ...context,
    onRequestUpdate: requestChannelConfigUpdate,
  };
  requestChannelConfigUpdate();
}

export function submitChannelConfigModal() {
  const context = modalState.context;
  if (!context || context.disabled) {
    return;
  }
  context.onPatch(["channels", context.channelId], cloneConfigObject(modalState.draftEntry));
  closeChannelConfigModal(context.onRequestUpdate);
}

export function cancelChannelConfigModal() {
  closeChannelConfigModal(modalState.context?.onRequestUpdate);
}

export function resetChannelConfigModalForTests() {
  closeChannelConfigModal();
}
