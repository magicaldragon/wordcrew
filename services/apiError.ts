/**
 * An error that carries a stable code from the API or a service layer.
 *
 * The code — not the sentence — is the contract: the portal looks it up in the `errors`
 * dictionary, so the same failure reads in English or Vietnamese. `message` stays in
 * English for logs and for the rare caller that has no dictionary at hand.
 */
export class AppError extends Error {
  constructor(
    /** Stable key into `i18n/{en,vi}/errors.ts`, e.g. `sessionExpired`. */
    readonly code: string,
    message?: string,
    /** Optional interpolation value, e.g. the date a rename unlocks. */
    readonly detail?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}
