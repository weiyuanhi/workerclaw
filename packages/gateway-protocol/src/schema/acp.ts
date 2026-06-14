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

/** ACP backend and harness options for setup UI. */
export const AcpCatalogResultSchema = Type.Object(
  {
    backends: Type.Array(AcpBackendCatalogEntrySchema),
    harnessIds: Type.Array(NonEmptyString),
  },
  { additionalProperties: false },
);
