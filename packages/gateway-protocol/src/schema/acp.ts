import { Type } from "typebox";
import { NonEmptyString } from "./primitives.js";

/** Reads the ACP setup catalog for Control UI pickers. */
export const AcpCatalogParamsSchema = Type.Object({}, { additionalProperties: false });

export const AcpBackendCatalogEntrySchema = Type.Object(
  {
    id: NonEmptyString,
    registered: Type.Boolean(),
    healthy: Type.Union([Type.Boolean(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const AcpHarnessAuthStateSchema = Type.Union([
  Type.Literal("logged_in"),
  Type.Literal("logged_out"),
  Type.Literal("api_key"),
  Type.Literal("missing_cli"),
  Type.Literal("probe_failed"),
  Type.Literal("unsupported"),
]);

export const AcpHarnessAuthEntrySchema = Type.Object(
  {
    harnessId: NonEmptyString,
    state: AcpHarnessAuthStateSchema,
    message: Type.Optional(Type.String()),
    cliCommand: Type.Optional(Type.String()),
    loginCommand: Type.Optional(Type.String()),
    envVar: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

/** ACP backend and harness options for setup UI. */
export const AcpCatalogResultSchema = Type.Object(
  {
    backends: Type.Array(AcpBackendCatalogEntrySchema),
    harnessIds: Type.Array(NonEmptyString),
    harnessAuth: Type.Optional(Type.Array(AcpHarnessAuthEntrySchema)),
  },
  { additionalProperties: false },
);

/** Starts browser OAuth login for a supported ACP harness on the Gateway host. */
export const AcpHarnessAuthLoginParamsSchema = Type.Object(
  {
    harnessId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AcpHarnessAuthLoginResultSchema = Type.Object(
  {
    harnessId: NonEmptyString,
    started: Type.Boolean(),
    message: Type.String(),
    cliCommand: Type.Optional(Type.String()),
    pid: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  { additionalProperties: false },
);
