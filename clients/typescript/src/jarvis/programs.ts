import { PROGRAM_IDS } from "../../../../packages/token-core/src/constants.js";

export const JARVIS_SOLANA_PROGRAMS = Object.freeze({
  token2022: PROGRAM_IDS.token2022,
  associatedToken: PROGRAM_IDS.associatedToken,
  system: PROGRAM_IDS.system,
  customJarvisProgram: null,
  legacyTokenProgramPermitted: false,
} as const);
