import type {
  AdminListing,
  AdminListingDetail,
  AdminListingList,
  AdminLocation,
  AdminReport,
  AdminReportList,
  AdminSummary,
  AdminUser,
  AdminUserDetail,
  AccountStatus,
  LocationInput,
  ReportStatusFilter,
  ReviewTab,
  UserRoleFilter,
  FilterCounts,
  ApiErrorBody,
  Availability,
  AvailabilityResult,
  ContactPreferences,
  InquiryFilter,
  InquiryStatus,
  InquiryThread,
  LandlordPropertyQuery,
  LandlordInquiryList,
  LandlordProperty,
  LandlordPropertyList,
  LandlordSummary,
  ListingForm,
  ListingPatch,
  PhotoArrangement,
  ReplyInput,
  AuthResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  HistoryResponse,
  LocationDto,
  LoginInput,
  MeResponse,
  NotificationList,
  Paginated,
  PropertyDetail,
  PropertySummary,
  RecordSearchInput,
  RegisterInput,
  ReportInput,
  ResetPasswordInput,
  RestoreHistoryInput,
  SavedIdsResponse,
  SearchFilters,
  StudentInquiry,
  StudentInquiryThread,
  SupportMessageInput,
  UnreadCount,
  UpdateProfileInput,
} from '@urcst/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = 'We could not reach the server. Check your connection and try again.';

async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  keepalive = false,
): Promise<T> {
  const isJson = body !== undefined && !(body instanceof FormData);
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      keepalive,
      headers: isJson ? { 'Content-Type': 'application/json' } : undefined,
      body: isJson ? JSON.stringify(body) : (body as FormData | undefined),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'SERVER_ERROR',
      error?.message ?? 'Something went wrong on our side. Please try again.',
      error?.fields,
    );
  }
  return data as T;
}

interface Items<T> {
  items: T[];
}

export const api = {
  me: () => request<MeResponse>('/auth/me'),
  login: (input: LoginInput) => request<AuthResponse>('/auth/login', 'POST', input),
  register: (input: RegisterInput) => request<AuthResponse>('/auth/register', 'POST', input),
  logout: () => request<{ ok: true }>('/auth/logout', 'POST'),
  forgotPassword: (input: ForgotPasswordInput) =>
    request<{ message: string }>('/auth/forgot-password', 'POST', input),
  resetPassword: (input: ResetPasswordInput) =>
    request<{ ok: true }>('/auth/reset-password', 'POST', input),
  updateProfile: (input: UpdateProfileInput) => request<AuthResponse>('/me', 'PATCH', input),
  changePassword: (input: ChangePasswordInput) =>
    request<{ ok: true }>('/me/password', 'POST', input),

  contactPreferences: () => request<ContactPreferences>('/me/contact-preferences'),
  saveContactPreferences: (prefs: ContactPreferences) =>
    request<ContactPreferences>('/me/contact-preferences', 'PATCH', prefs),
  landlordSummary: () => request<LandlordSummary>('/landlord/summary'),
  landlordProperties: (query: Omit<LandlordPropertyQuery, 'filter'>) =>
    request<LandlordPropertyList>(
      `/landlord/properties?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`,
    ),
  listing: (id: string) => request<ListingForm>(`/landlord/properties/${encodeURIComponent(id)}`),
  createListing: (patch: ListingPatch) =>
    request<ListingForm>('/landlord/properties', 'POST', patch),
  updateListing: (id: string, patch: ListingPatch) =>
    request<ListingForm>(`/landlord/properties/${encodeURIComponent(id)}`, 'PATCH', patch),
  /** For the moment the page closes: the browser finishes this after the page has gone. */
  saveListingOnLeave: (id: string, patch: ListingPatch) =>
    request<ListingForm>(`/landlord/properties/${encodeURIComponent(id)}`, 'PATCH', patch, true),
  addPhotos(id: string, files: File[]) {
    const form = new FormData();
    for (const file of files) form.append('photos', file);
    return request<ListingForm>(
      `/landlord/properties/${encodeURIComponent(id)}/photos`,
      'POST',
      form,
    );
  },
  arrangePhotos: (id: string, arrangement: PhotoArrangement) =>
    request<ListingForm>(
      `/landlord/properties/${encodeURIComponent(id)}/photos`,
      'PATCH',
      arrangement,
    ),
  removePhoto: (id: string, photoId: string) =>
    request<ListingForm>(
      `/landlord/properties/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
      'DELETE',
    ),
  restorePhoto: (id: string, photoId: string) =>
    request<ListingForm>(
      `/landlord/properties/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}/restore`,
      'POST',
    ),
  submitListing: (id: string) =>
    request<LandlordProperty>(`/landlord/properties/${encodeURIComponent(id)}/submit`, 'POST'),
  setAvailability: (id: string, availability: Availability) =>
    request<AvailabilityResult>(
      `/landlord/properties/${encodeURIComponent(id)}/availability`,
      'PATCH',
      { availability },
    ),
  deleteListing: (id: string) =>
    request<{ ok: true }>(`/landlord/properties/${encodeURIComponent(id)}`, 'DELETE'),
  restoreListing: (id: string) =>
    request<{ ok: true }>(`/landlord/properties/${encodeURIComponent(id)}/restore`, 'POST'),
  landlordInquiries: (status: InquiryFilter, page: number, pageSize: number, q: string) =>
    request<LandlordInquiryList>(
      `/landlord/inquiries?${new URLSearchParams({ status, page: String(page), pageSize: String(pageSize), q })}`,
    ),
  landlordInquiry: (id: string) =>
    request<InquiryThread>(`/landlord/inquiries/${encodeURIComponent(id)}`),
  replyToInquiry: (id: string, input: ReplyInput) =>
    request<InquiryThread>(`/landlord/inquiries/${encodeURIComponent(id)}/messages`, 'POST', input),
  setInquiryStatus: (id: string, status: InquiryStatus) =>
    request<InquiryThread>(`/landlord/inquiries/${encodeURIComponent(id)}`, 'PATCH', { status }),
  properties: (query: URLSearchParams) =>
    request<Paginated<PropertySummary>>(`/properties?${query}`),
  featured: () => request<Items<PropertySummary>>('/properties/featured'),
  property: (id: string) => request<PropertyDetail>(`/properties/${encodeURIComponent(id)}`),
  reportProperty: (id: string, input: ReportInput) =>
    request<{ ok: true }>(`/properties/${encodeURIComponent(id)}/reports`, 'POST', input),
  sendInquiry: (id: string, message: string) =>
    request<{ id: string }>(`/properties/${encodeURIComponent(id)}/inquiries`, 'POST', {
      message,
    }),
  filterCounts: (query: URLSearchParams) => request<FilterCounts>(`/properties/counts?${query}`),
  locations: () => request<Items<LocationDto>>('/locations'),
  parseSearch: (text: string) =>
    request<{ filters: SearchFilters }>('/search/parse', 'POST', { text }),

  saved: () => request<Paginated<PropertySummary>>('/me/saved?pageSize=50'),
  savedIds: () => request<SavedIdsResponse>('/me/saved/ids'),
  save: (id: string) => request<{ ok: true }>(`/me/saved/${encodeURIComponent(id)}`, 'POST'),
  unsave: (id: string) => request<{ ok: true }>(`/me/saved/${encodeURIComponent(id)}`, 'DELETE'),
  mergeSaved: (propertyIds: string[]) =>
    request<{ merged: number }>('/me/saved/merge', 'POST', { propertyIds }),
  history: () => request<HistoryResponse>('/me/history'),
  clearHistory: () => request<{ ok: true }>('/me/history', 'DELETE'),
  restoreHistory: (input: RestoreHistoryInput) =>
    request<{ ok: true }>('/me/history/restore', 'POST', input),
  recordSearch: (input: RecordSearchInput) => request<unknown>('/me/searches', 'POST', input),
  inquiries: () => request<Paginated<StudentInquiry>>('/me/inquiries?pageSize=50'),
  inquiry: (id: string) => request<StudentInquiryThread>(`/me/inquiries/${encodeURIComponent(id)}`),
  sendInquiryMessage: (id: string, input: ReplyInput) =>
    request<StudentInquiryThread>(
      `/me/inquiries/${encodeURIComponent(id)}/messages`,
      'POST',
      input,
    ),

  notifications: (page: number, pageSize: number) =>
    request<NotificationList>(`/notifications?page=${page}&pageSize=${pageSize}`),
  readNotification: (id: string) =>
    request<UnreadCount>(`/notifications/${encodeURIComponent(id)}/read`, 'POST'),
  readAllNotifications: () => request<UnreadCount>('/notifications/read-all', 'POST'),
  contactSupport: (input: SupportMessageInput) => request<{ ok: true }>('/support', 'POST', input),

  adminSummary: () => request<AdminSummary>('/admin/summary'),
  adminListings: (status: ReviewTab, page: number, pageSize: number) =>
    request<AdminListingList>(`/admin/listings?status=${status}&page=${page}&pageSize=${pageSize}`),
  adminListing: (id: string) =>
    request<AdminListingDetail>(`/admin/listings/${encodeURIComponent(id)}`),
  approveListing: (id: string) =>
    request<AdminListing>(`/admin/listings/${encodeURIComponent(id)}/approve`, 'POST'),
  requestChanges: (id: string, note: string) =>
    request<AdminListing>(`/admin/listings/${encodeURIComponent(id)}/request-changes`, 'POST', {
      note,
    }),
  rejectListing: (id: string, note: string) =>
    request<AdminListing>(`/admin/listings/${encodeURIComponent(id)}/reject`, 'POST', { note }),
  removeListing: (id: string, note: string, reportId?: string) =>
    request<AdminListing>(`/admin/listings/${encodeURIComponent(id)}/remove`, 'POST', {
      note,
      reportId,
    }),
  adminUsers: (role: UserRoleFilter, q: string, page: number, pageSize: number) =>
    request<Paginated<AdminUser>>(
      `/admin/users?${new URLSearchParams({ role, q, page: String(page), pageSize: String(pageSize) })}`,
    ),
  adminUser: (id: string) => request<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`),
  setUserStatus: (id: string, status: AccountStatus) =>
    request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/status`, 'PATCH', { status }),
  adminReports: (status: ReportStatusFilter, page: number, pageSize: number) =>
    request<AdminReportList>(`/admin/reports?status=${status}&page=${page}&pageSize=${pageSize}`),
  resolveReport: (id: string, note: string) =>
    request<AdminReport>(`/admin/reports/${encodeURIComponent(id)}/resolve`, 'POST', { note }),
  adminLocations: (q: string, page: number, pageSize: number) =>
    request<Paginated<AdminLocation>>(
      `/admin/locations?${new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) })}`,
    ),
  addLocation: (input: LocationInput) => request<AdminLocation>('/admin/locations', 'POST', input),
  editLocation: (id: string, input: LocationInput) =>
    request<AdminLocation>(`/admin/locations/${encodeURIComponent(id)}`, 'PATCH', input),
  removeLocation: (id: string) =>
    request<{ ok: true }>(`/admin/locations/${encodeURIComponent(id)}`, 'DELETE'),
};
