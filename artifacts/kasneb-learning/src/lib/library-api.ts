// Plain-fetch client for the real (Mongo + object storage) course/unit/
// resource endpoints. Kept separate from @workspace/api-client-react
// (which is generated from the older demo-data spec) so neither side
// has to change shape to match the other.

export type ResourceType = 'video' | 'notes' | 'past-paper' | 'image';

export interface LibraryCourse {
  _id: string;
  slug: string;
  title: string;
  unitCode: string;
  level: 'foundation' | 'intermediate' | 'advanced';
  description: string;
  duration: string;
  accent: string;
  image: string;
  featured: boolean;
  resourceCount: number;
}

export interface LibraryUnit {
  _id: string;
  courseId: string;
  title: string;
  code: string;
  description: string;
  order: number;
  resourceCount: number;
}

export interface LibraryCourseDetail extends LibraryCourse {
  units: LibraryUnit[];
}

export interface LibraryResource {
  _id: string;
  unitId: string;
  courseId: string;
  title: string;
  type: ResourceType;
  description: string;
  price: number;
  fileSize: number;
  durationSeconds?: number;
  pageCount?: number;
}

const ADMIN_KEY_STORAGE = 'kasneb-admin-key';

export function getAdminKey(): string {
  try {
    return window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setAdminKey(key: string) {
  try {
    window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
  } catch {
    // ignore (private browsing etc.) — key just won't persist
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      'x-admin-key': getAdminKey(),
      ...init.headers,
    },
  }).then((res) => handle<T>(res));
}

function publicFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`).then((res) => handle<T>(res));
}

// ---------- Public (Library) ----------

export const listLibraryCourses = () =>
  publicFetch<LibraryCourse[]>('/library/courses');

export const getLibraryCourse = (courseId: string) =>
  publicFetch<LibraryCourseDetail>(`/library/courses/${courseId}`);

export const listLibraryUnitResources = (courseId: string, unitId: string) =>
  publicFetch<LibraryResource[]>(
    `/library/courses/${courseId}/units/${unitId}/resources`,
  );

export const getResourceDownloadUrl = (resourceId: string) =>
  publicFetch<{ url: string }>(
    `/library/resources/${resourceId}/download`,
  );

// ---------- Admin ----------

export const listAdminCourses = () =>
  adminFetch<LibraryCourse[]>('/admin/courses');

export const createAdminCourse = (data: {
  slug: string;
  title: string;
  unitCode: string;
  level: string;
  description: string;
  duration: string;
  accent: string;
  image: string;
  featured: boolean;
}) =>
  adminFetch<LibraryCourse>('/admin/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteAdminCourse = (courseId: string) =>
  adminFetch<void>(`/admin/courses/${courseId}`, { method: 'DELETE' });

export const listAdminUnits = (courseId: string) =>
  adminFetch<LibraryUnit[]>(`/admin/courses/${courseId}/units`);

export const createAdminUnit = (
  courseId: string,
  data: { title: string; code: string; description: string; order: number },
) =>
  adminFetch<LibraryUnit>(`/admin/courses/${courseId}/units`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteAdminUnit = (unitId: string) =>
  adminFetch<void>(`/admin/units/${unitId}`, { method: 'DELETE' });

export const listAdminUnitResources = (unitId: string) =>
  adminFetch<LibraryResource[]>(`/admin/units/${unitId}/resources`);

export const deleteAdminResource = (resourceId: string) =>
  adminFetch<void>(`/admin/resources/${resourceId}`, { method: 'DELETE' });

// Two-step upload: get a presigned URL, PUT the raw file straight to
// object storage, then save the metadata record.
export async function uploadResourceFile(
  unitId: string,
  file: File,
  type: ResourceType,
  onProgress?: (percent: number) => void,
): Promise<{ fileKey: string; fileSize: number }> {
  const { uploadUrl, fileKey } = await adminFetch<{
    uploadUrl: string;
    fileKey: string;
  }>(`/units/${unitId}/resources/upload-url`, {
    method: 'POST',
    body: JSON.stringify({ contentType: file.type || 'application/octet-stream', type }),
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream',
    );
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Upload failed — network error.'));
    xhr.send(file);
  });

  return { fileKey, fileSize: file.size };
}

export const createAdminResource = (
  unitId: string,
  data: {
    title: string;
    type: ResourceType;
    description: string;
    price: number;
    fileKey: string;
    fileSize: number;
  },
) =>
  adminFetch<LibraryResource>(`/units/${unitId}/resources`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
