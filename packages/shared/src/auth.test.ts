import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  contactPreferencesSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  toFieldErrors,
} from './auth';

function errorsFrom(result: { success: boolean; error?: unknown }) {
  if (result.success) return {};
  return toFieldErrors(result.error as Parameters<typeof toFieldErrors>[0]);
}

const validStudent = {
  role: 'STUDENT',
  fullName: 'Aline Mukamana',
  email: 'aline@example.com',
  password: 'long-enough',
};

describe('loginSchema', () => {
  it('uses the prototype messages for empty fields', () => {
    expect(errorsFrom(loginSchema.safeParse({ email: '', password: '' }))).toEqual({
      email: 'Please enter your email address.',
      password: 'Please enter your password.',
    });
  });

  it('rejects an invalid email', () => {
    expect(errorsFrom(loginSchema.safeParse({ email: 'nope', password: 'x' }))).toEqual({
      email: 'Enter a valid email address.',
    });
  });

  it('trims and lowercases the email', () => {
    const parsed = loginSchema.parse({ email: '  Student@Demo.UR ', password: 'x' });

    expect(parsed.email).toBe('student@demo.ur');
  });
});

describe('registerSchema', () => {
  it('accepts a student without a phone number', () => {
    expect(registerSchema.parse({ ...validStudent, phone: '' }).phone).toBeUndefined();
  });

  it('requires a phone number from landlords', () => {
    const result = registerSchema.safeParse({ ...validStudent, role: 'LANDLORD', phone: '' });

    expect(errorsFrom(result)).toEqual({
      phone: 'Please enter a phone number so students can reach you.',
    });
  });

  it('rejects a short phone number', () => {
    const result = registerSchema.safeParse({ ...validStudent, phone: '0788' });

    expect(errorsFrom(result)).toEqual({
      phone: 'Enter a phone number with at least 9 digits, e.g. 0788 000 000.',
    });
  });

  it('asks for a missing password and a longer short one', () => {
    expect(errorsFrom(registerSchema.safeParse({ ...validStudent, password: '' }))).toEqual({
      password: 'Please create a password.',
    });
    expect(errorsFrom(registerSchema.safeParse({ ...validStudent, password: 'short' }))).toEqual({
      password: 'Password must be at least 8 characters.',
    });
  });

  it('shows every field error at once', () => {
    const result = registerSchema.safeParse({
      role: 'LANDLORD',
      fullName: '',
      email: '',
      phone: '',
      password: '',
    });

    expect(Object.keys(errorsFrom(result)).sort()).toEqual([
      'email',
      'fullName',
      'password',
      'phone',
    ]);
  });

  it('never allows an administrator to register', () => {
    expect(registerSchema.safeParse({ ...validStudent, role: 'ADMIN' }).success).toBe(false);
  });

  it('rejects a password bcrypt would cut short', () => {
    const result = registerSchema.safeParse({ ...validStudent, password: 'a'.repeat(73) });

    expect(errorsFrom(result)).toEqual({ password: 'Password must be 72 characters or fewer.' });
  });
});

describe('password reset and change', () => {
  it('uses the same message for an empty or short reset password', () => {
    const message = { password: 'Password must be at least 8 characters.' };

    expect(errorsFrom(resetPasswordSchema.safeParse({ token: 't', password: '' }))).toEqual(
      message,
    );
    expect(errorsFrom(resetPasswordSchema.safeParse({ token: 't', password: 'short' }))).toEqual(
      message,
    );
  });

  it('validates the email for a reset link', () => {
    expect(errorsFrom(forgotPasswordSchema.safeParse({ email: '' }))).toEqual({
      email: 'Please enter your email address.',
    });
  });

  it('uses the prototype messages when changing a password', () => {
    expect(
      errorsFrom(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'short' })),
    ).toEqual({
      currentPassword: 'Please enter your current password.',
      newPassword: 'New password must be at least 8 characters.',
    });
  });
});

describe('contactPreferencesSchema', () => {
  it('needs at least one contact method', () => {
    const result = contactPreferencesSchema.safeParse({
      allowPhone: false,
      allowWhatsapp: false,
      allowInApp: false,
    });

    expect(errorsFrom(result)).toEqual({
      contactPreferences: 'Keep at least one contact method on so students can reach you.',
    });
  });
});
