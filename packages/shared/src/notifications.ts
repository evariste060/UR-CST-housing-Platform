import { z } from 'zod';
import { emailSchema, fullNameSchema } from './auth';
import { paginationSchema } from './properties';

export const notificationQuerySchema = paginationSchema;

/** What a notification is about. The web picks its icon from this. */
export type NotificationType =
  | 'INQUIRY_RECEIVED'
  | 'INQUIRY_REPLIED'
  | 'LISTING_SUBMITTED'
  | 'LISTING_TO_REVIEW'
  | 'LISTING_APPROVED'
  | 'LISTING_CHANGES_REQUESTED'
  | 'LISTING_REJECTED'
  | 'LISTING_REMOVED'
  | 'AVAILABILITY_CHANGED'
  | 'NEW_LISTING'
  | 'REPORT_RECEIVED';

export interface NotificationItem {
  id: string;
  type: NotificationType | (string & {});
  text: string;
  /** A page in the web app, e.g. /properties/abc. */
  link: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export interface UnreadCount {
  unreadCount: number;
}

export const SUPPORT_TOPICS = ['SEARCH', 'ACCOUNT', 'LISTING', 'PROBLEM'] as const;
export const supportTopicSchema = z.enum(SUPPORT_TOPICS, { error: 'Please choose a topic.' });
export type SupportTopic = z.infer<typeof supportTopicSchema>;

export const SUPPORT_TOPIC_LABELS: Record<SupportTopic, string> = {
  SEARCH: 'Searching for rooms',
  ACCOUNT: 'My account',
  LISTING: 'Publishing a property',
  PROBLEM: 'Report a problem',
};

export const supportMessageSchema = z.object({
  name: fullNameSchema.pipe(z.string().max(120, 'Use 120 characters or fewer.')),
  email: emailSchema,
  topic: supportTopicSchema,
  message: z
    .string({ error: 'Please write your message.' })
    .trim()
    .min(1, 'Please write your message.')
    .min(10, 'Please write at least 10 characters so we can understand the problem.')
    .max(2000, 'Use 2,000 characters or fewer.'),
});
export type SupportMessageInput = z.infer<typeof supportMessageSchema>;
