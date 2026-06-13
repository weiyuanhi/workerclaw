import { describe, expect, it } from "vitest";
import { resolveSetupDrivers } from "./setup.js";

describe("resolveSetupDrivers", () => {
  it("includes android and ios drivers based on platform selection", () => {
    expect(
      resolveSetupDrivers({
        platforms: ["android", "ios"],
        androidDriver: "uiautomator2",
        iosDriver: "xcuitest",
      }),
    ).toEqual(["uiautomator2", "xcuitest"]);
  });

  it("includes only android driver for android setup", () => {
    expect(
      resolveSetupDrivers({
        platforms: ["android"],
        androidDriver: "uiautomator2",
        iosDriver: "xcuitest",
      }),
    ).toEqual(["uiautomator2"]);
  });
});
