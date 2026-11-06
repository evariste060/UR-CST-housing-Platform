import type {
  ApiErrorBody,
  Availability,
  AvailabilityResult,
  ContactPreferences,
  InquiryFilter,
  InquiryStatus,
  InquiryThread,
  LandlordFilter,
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
  landlordProperties: (filter: LandlordFilter, page: number, pageSize: number) =>
    request<LandlordPropertyList>(
      `/landlord/properties?filter=${filter}&page=${page}&pageSize=${pageSize}`,
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
  landlordInquiries: (status: InquiryFilter, page: number, pageSize: number) =>
    request<LandlordInquiryList>(
      `/landlord/inquiries?status=${status}&page=${page}&pageSize=${pageSize}`,
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
};
