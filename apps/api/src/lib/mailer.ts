import { SUPPORT_TOPIC_LABELS, type SupportMessageInput } from '@urcst/shared';

export interface Mailer {
  sendPasswordReset(to: string, resetLink: string): Promise<void>;
  /** Sends a Contact support message to the support team. */
  sendSupportMessage(message: SupportMessageInput): Promise<void>;
}

/** Development mailer. Phase 9 replaces it with a real email service. */
export const consoleMailer: Mailer = {
  async sendPasswordReset(to, resetLink) {
    console.log(`Password reset link for ${to}:\n${resetLink}`);
  },
  async sendSupportMessage({ name, email, topic, message }) {
    console.log(
      `Support message from ${name} <${email}> about ${SUPPORT_TOPIC_LABELS[topic]}:\n${message}`,
    );
  },
};
