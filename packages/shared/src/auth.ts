import { z } from 'zod';

export const roleSchema = z.enum(['STUDENT', 'LANDLORD', 'ADMIN']);
export type Role = z.infer<typeof roleSchema>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PHONE_DIGITS = 9;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything after 72 bytes.
const MAX_PASSWORD_BYTES = 72;

const PHONE_MESSAGE = 'Enter a phone number with at least 9 digits, e.g. 0788 000 000.';

const hasEnoughDigits = (value: string) => value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS;
const fitsBcrypt = (value: string) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES;

const requiredText = (message: string) => z.string({ error: message }).trim().min(1, message);

const fullName = requiredText('Please enter your full name.');

const email = requiredText('Please enter your email address.')
  .regex(EMAIL_PATTERN, 'Enter a valid email address.')
  .toLowerCase();

function newPassword(emptyMessage: string, shortMessage: string) {
  return z
    .string({ error: emptyMessage })
    .min(1, emptyMessage)
    .min(MIN_PASSWORD_LENGTH, shortMessage)
    .refine(fitsBcrypt, 'Password must be 72 characters or fewer.');
}

const PASSWORD_TOO_SHORT = 'Password must be at least 8 characters.';

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: 'Please enter your password.' })
    .min(1, 'Please enter your password.'),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

const registerFields = {
  fullName,
  email,
  password: newPassword('Please create a password.', PASSWORD_TOO_SHORT),
};

export const registerSchema = z.discriminatedUnion('role', [
  z.object({
    ...registerFields,
    role: z.literal('STUDENT'),
    phone: z
      .string()
      .trim()
      .refine((value) => value === '' || hasEnoughDigits(value), PHONE_MESSAGE)
      .optional()
      .transform((value) => value || undefined),
  }),
  z.object({
    ...registerFields,
    role: z.literal('LANDLORD'),
    phone: requiredText('Please enter a phone number so students can reach you.').refine(
      hasEnoughDigits,
      PHONE_MESSAGE,
    ),
  }),
]);
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: newPassword(PASSWORD_TOO_SHORT, PASSWORD_TOO_SHORT),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  fullName: fullName.optional(),
  email: email.optional(),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || hasEnoughDigits(value),
      'Enter a phone number with at least 9 digits.',
    )
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: 'Please enter your current password.' })
    .min(1, 'Please enter your current password.'),
  newPassword: newPassword(
    'New password must be at least 8 characters.',
    'New password must be at least 8 characters.',
  ),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const contactPreferencesSchema = z
  .object({
    allowPhone: z.boolean(),
    allowWhatsapp: z.boolean(),
    allowInApp: z.boolean(),
  })
  .refine((prefs) => prefs.allowPhone || prefs.allowWhatsapp || prefs.allowInApp, {
    error: 'Keep at least one contact method on so students can reach you.',
    path: ['contactPreferences'],
  });
export type ContactPreferences = z.infer<typeof contactPreferencesSchema>;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

/** Keeps the first message for each field, matching one error under each form control. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    fields[key] ??= issue.message;
  }
  return fields;
}
