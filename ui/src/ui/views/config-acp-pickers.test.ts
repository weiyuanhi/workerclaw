import { describe, expect, it } from "vitest";
import {
  resetAcpBackendPickerUiState,
  resolveAcpBackendCustomMode,
  resolveBackendStatusHintKey,
  resolveDefaultAcpBackendId,
  resolveSelectedBackendEntry,
} from "./config-acp-pickers.ts";

describe("acp backend picker", () => {
  it("detects custom backend values outside the preset list", () => {
    expect(
      resolveAcpBackendCustomMode({
        selected: "my-backend",
        presetIds: ["acpx"],
      }),
    ).toBe(true);
    expect(
      resolveAcpBackendCustomMode({
        selected: "acpx",
        presetIds: ["acpx"],
      }),
    ).toBe(false);
  });

  it("prefers a healthy registered backend as dropdown fallback", () => {
    expect(
      resolveDefaultAcpBackendId({
        backends: [
          { id: "acpx", registered: true, healthy: true },
          { id: "other", registered: false, healthy: null },
        ],
        harnessIds: [],
      }),
    ).toBe("acpx");
  });

  it("maps backend registration state to hint keys", () => {
    expect(
      resolveBackendStatusHintKey(
        resolveSelectedBackendEntry(
          { backends: [{ id: "acpx", registered: false, healthy: null }], harnessIds: [] },
          "acpx",
        ),
      ),
    ).toBe("notLoaded");
    expect(
      resolveBackendStatusHintKey(
        resolveSelectedBackendEntry(
          { backends: [{ id: "acpx", registered: true, healthy: true }], harnessIds: [] },
          "acpx",
        ),
      ),
    ).toBe("healthy");
  });

  it("resets transient custom mode state", () => {
    resetAcpBackendPickerUiState();
    expect(
      resolveAcpBackendCustomMode({
        selected: "",
        presetIds: ["acpx"],
        uiCustomMode: false,
      }),
    ).toBe(false);
  });
});
