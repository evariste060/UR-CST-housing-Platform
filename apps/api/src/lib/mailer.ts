export interface Mailer {
  sendPasswordReset(to: string, resetLink: string): Promise<void>;
}

/** Development mailer. Phase 9 replaces it with a real email service. */
export const consoleMailer: Mailer = {
  async sendPasswordReset(to, resetLink) {
    console.log(`Password reset link for ${to}:\n${resetLink}`);
  },
};
