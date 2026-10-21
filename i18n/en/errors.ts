/**
 * Every failure the portal can show a person, keyed by the code the API or a service
 * throws. Both the Worker (`{ error, code }`) and `AppError` speak these keys, so the
 * sentence a teacher reads is chosen on the client and translated like the rest of the UI.
 */
export const errors = {
  /** Unknown failure — also the fallback when the server sends a code we do not know. */
  generic: 'Something went wrong. Please try again.',

  // Sign-in and account
  signInRequired: 'Please sign in to continue.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  signInNotConfigured: 'Sign-in is not configured for this build.',
  invalidEmail: 'That email address does not look right.',
  missingPassword: 'Please enter your password.',
  weakPassword: 'Passwords need at least 6 characters.',
  emailInUse: 'An account already uses that email. Try signing in instead.',
  wrongCredentials: 'Email or password is incorrect.',
  tooManyAttempts: 'Too many attempts. Please wait a moment and try again.',
  popupClosed: 'Sign-in window was closed before finishing.',
  popupBlocked: 'Your browser blocked the sign-in popup. Allow popups and try again.',
  networkError: 'Network problem — check your connection and try again.',
  notConfigured: 'This feature is not configured yet.',
  unauthorized: 'You do not have access to that.',

  // Checkout, orders and licences
  unknownProduct: 'That product is no longer available.',
  paymentsNotConfigured: 'Payments are not configured yet.',
  tooManyOrders: 'Too many orders from this device. Please try again later.',
  orderNotFound: 'We could not find that order.',
  unknownOrderCode: 'Unknown order code.',
  orderRevoked: 'That order was revoked.',
  orderUpdateFailed: 'Could not update that order.',
  emailOwnsProduct: 'That email already owns this product.',
  invalidLicenceKey: 'That does not look like a licence key.',
  licenceNotFound: 'Licence key not found. Check the key from your purchase email.',
  notFound: 'Not found.',

  // Classes
  classCodeLength: 'Enter the six-character class code.',
  classCodeUnknown: 'That code does not match any class.',
  classGone: 'That class is no longer available.',
  firestoreNotConfigured: 'Classes are not configured for this build.',

  // Display name
  nameSignIn: 'Sign in before changing your name.',
  nameTooShort: (min: string) => `Names need at least ${min} characters.`,
  nameCooldown: (date: string) =>
    `You can change your name again on ${date}. Contact the admin if you need it sooner.`,
};
