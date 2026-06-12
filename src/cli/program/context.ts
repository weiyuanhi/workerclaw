// Root program context: version plus channel option strings for help text.
import { VERSION } from "../../version.js";

/** Root CLI program context consumed by command registration and help rendering. */
export type ProgramContext = {
  programVersion: string;
  channelOptions: string[];
  messageChannelOptions: string;
  agentChannelOptions: string;
};

/** Create a program context for the local-app fork (no messaging channels). */
export function createProgramContext(): ProgramContext {
  return {
    programVersion: VERSION,
    channelOptions: [],
    messageChannelOptions: "",
    agentChannelOptions: "last",
  };
}
