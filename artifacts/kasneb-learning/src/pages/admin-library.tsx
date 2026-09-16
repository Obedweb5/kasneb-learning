import { type FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  ArrowRight, FileText, ImageIcon, KeyRound, LoaderCircle, PlayCircle,
  Plus, Trash2, UploadCloud, X,
} from 'lucide-react';
import {
  createAdminCourse, createAdminResource, createAdminUnit,
  deleteAdminCourse, deleteAdminResource, deleteAdminUnit, getAdminKey,
  listAdminCourses, listAdminUnitResources, listAdminUnits, setAdminKey,
  uploadResourceFile, type LibraryCourse, type LibraryResource,
  type LibraryUnit, type ResourceType,
} from '@/lib/library-api';

function Field({
  label, value, onChange, required = false, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-border bg-background px-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
    </label>
  );
}

function TextArea({
  label, value, onChange, required = false,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      <textarea
        required={required}
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
    </label>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function resourceIcon(type: ResourceType) {
  if (type === 'video') return <PlayCircle className="h-4 w-4" />;
  if (type === 'image') return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function AdminKeyGate({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(getAdminKey());
  const [saved, setSaved] = useState(Boolean(getAdminKey()));

  if (saved) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" /> Admin key saved on this device</span>
          <button
            onClick={() => setSaved(false)}
            data-testid="button-change-admin-key"
            className="font-semibold text-accent hover:text-primary"
          >
            Change
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8">
      <KeyRound className="h-8 w-8 text-accent" />
      <h2 className="mt-4 font-display text-2xl font-bold">Admin key required</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the ADMIN_API_KEY configured on the server. It's stored only in this browser.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAdminKey(key);
          setSaved(true);
        }}
        className="mt-5 flex gap-2"
      >
        <input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          type="password"
          required
          data-testid="input-admin-key"
          placeholder="Admin key"
          className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          data-testid="button-save-admin-key"
          className="rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          Save
        </button>
      </form>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/45 p-5 backdrop-blur-sm">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button onClick={onClose} data-testid="button-close-modal" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function NewCourseModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [accent, setAccent] = useState('#f2b84b');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createAdminCourse({
        slug: slug || slugify(title), title, unitCode, level, duration,
        description, accent, image: image || title.slice(0, 2).toUpperCase(),
        featured: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Modal title="New course" onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); create.mutate(); }} className="grid gap-4">
        <Field label="Title" value={title} required onChange={(value) => {
          setTitle(value);
          if (!slugTouched) setSlug(slugify(value));
        }} />
        <Field label="Slug (used as the course ID)" value={slug} required onChange={(value) => { setSlug(value); setSlugTouched(true); }} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unit code" value={unitCode} required onChange={setUnitCode} placeholder="e.g. CA23" />
          <label className="grid gap-1.5 text-sm font-semibold">
            Level
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="h-11 rounded-lg border border-border bg-background px-3 font-normal outline-none focus:border-accent">
              <option value="foundation">Foundation</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
        <Field label="Duration" value={duration} onChange={setDuration} placeholder="e.g. 12 weeks" />
        <TextArea label="Description" value={description} onChange={setDescription} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            Accent color
            <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-2" />
          </label>
          <Field label="Badge text" value={image} onChange={setImage} placeholder="2–3 letters" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={create.isPending} data-testid="button-submit-course" className="mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-60">
          {create.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create course
        </button>
      </form>
    </Modal>
  );
}

function NewUnitModal({ courseId, order, onClose }: { courseId: string; order: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => createAdminUnit(courseId, { title, code, description, order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'units', courseId] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Modal title="New unit" onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); create.mutate(); }} className="grid gap-4">
        <Field label="Title" value={title} required onChange={setTitle} placeholder="e.g. The reporting landscape" />
        <Field label="Code" value={code} required onChange={setCode} placeholder="e.g. FR 01" />
        <TextArea label="Description" value={description} onChange={setDescription} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={create.isPending} data-testid="button-submit-unit" className="mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-60">
          {create.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create unit
        </button>
      </form>
    </Modal>
  );
}

function NewResourceModal({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('notes');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file to upload.');
      setProgress(0);
      const { fileKey, fileSize } = await uploadResourceFile(unitId, file, type, setProgress);
      return createAdminResource(unitId, {
        title, type, description, price: Number(price) || 0, fileKey, fileSize,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'resources', unitId] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Modal title="Upload resource" onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); create.mutate(); }} className="grid gap-4">
        <Field label="Title" value={title} required onChange={setTitle} />
        <label className="grid gap-1.5 text-sm font-semibold">
          Type
          <select value={type} onChange={(event) => setType(event.target.value as ResourceType)} className="h-11 rounded-lg border border-border bg-background px-3 font-normal outline-none focus:border-accent">
            <option value="notes">Notes (PDF)</option>
            <option value="past-paper">Past paper (PDF)</option>
            <option value="video">Tutorial video</option>
            <option value="image">Picture / diagram</option>
          </select>
        </label>
        <TextArea label="Description" value={description} onChange={setDescription} />
        <Field label="Price (KES, 0 for free)" type="number" value={price} onChange={setPrice} />
        <label className="grid gap-1.5 text-sm font-semibold">
          File
          <div className="flex h-11 items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3">
            <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="file"
              required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              data-testid="input-resource-file"
              className="w-full text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-semibold"
            />
          </div>
        </label>
        {create.isPending && (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={create.isPending} data-testid="button-submit-resource" className="mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-60">
          {create.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {create.isPending ? `Uploading ${progress}%` : 'Upload'}
        </button>
      </form>
    </Modal>
  );
}

function ResourceRow({ resource, unitId }: { resource: LibraryResource; unitId: string }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteAdminResource(resource._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'resources', unitId] }),
  });
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-accent">{resourceIcon(resource.type)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{resource.title}</p>
        <p className="text-xs capitalize text-muted-foreground">{resource.type.replace('-', ' ')} · KES {resource.price}</p>
      </div>
      <button
        onClick={() => { if (confirm(`Delete "${resource.title}"? This removes the uploaded file too.`)) remove.mutate(); }}
        data-testid={`button-delete-resource-${resource._id}`}
        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function UnitPanel({ unit, courseId }: { unit: LibraryUnit; courseId: string }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const resourcesQuery = useQuery({
    queryKey: ['admin', 'resources', unit._id],
    queryFn: () => listAdminUnitResources(unit._id),
  });
  const removeUnit = useMutation({
    mutationFn: () => deleteAdminUnit(unit._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'units', courseId] }),
  });

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">{unit.code}</p>
          <h3 className="font-display text-base font-bold">{unit.title}</h3>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setUploading(true)}
            data-testid={`button-upload-to-${unit._id}`}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Resource
          </button>
          <button
            onClick={() => { if (confirm(`Delete unit "${unit.title}" and all its resources?`)) removeUnit.mutate(); }}
            data-testid={`button-delete-unit-${unit._id}`}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-3">
        {resourcesQuery.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {resourcesQuery.data?.length === 0 && <p className="text-xs text-muted-foreground">No resources yet.</p>}
        {resourcesQuery.data?.map((resource) => (
          <ResourceRow key={resource._id} resource={resource} unitId={unit._id} />
        ))}
      </div>
      {uploading && <NewResourceModal unitId={unit._id} onClose={() => setUploading(false)} />}
    </div>
  );
}

function CoursePanel({ course, onSelect, active }: { course: LibraryCourse; onSelect: () => void; active: boolean }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteAdminCourse(course._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] }),
  });
  return (
    <button
      onClick={onSelect}
      data-testid={`button-select-course-${course._id}`}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted/50'}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-xs font-bold text-primary" style={{ background: course.accent }}>
        {course.image}
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{course.title}</p>
        <p className="text-xs text-muted-foreground">{course.unitCode}</p>
      </span>
      <span
        onClick={(event) => {
          event.stopPropagation();
          if (confirm(`Delete "${course.title}" and everything in it? This cannot be undone.`)) remove.mutate();
        }}
        data-testid={`button-delete-course-${course._id}`}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export function AdminLibraryPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [creatingUnit, setCreatingUnit] = useState(false);

  const coursesQuery = useQuery({ queryKey: ['admin', 'courses'], queryFn: listAdminCourses });
  const unitsQuery = useQuery({
    queryKey: ['admin', 'units', selectedCourseId],
    queryFn: () => listAdminUnits(selectedCourseId as string),
    enabled: Boolean(selectedCourseId),
  });

  const selectedCourse = coursesQuery.data?.find((course) => course._id === selectedCourseId);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Resource library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real courses, units, and files — stored in the database and object storage.</p>
        </div>
        <Link href="/library" data-testid="link-view-public-library" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-primary">
          View public page <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <AdminKeyGate>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Panel
            title="Courses"
            action={
              <button onClick={() => setCreatingCourse(true)} data-testid="button-new-course" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            }
          >
            {coursesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {coursesQuery.isError && <p className="text-sm text-destructive">Could not load courses. Check the admin key.</p>}
            <div className="grid gap-2">
              {coursesQuery.data?.map((course) => (
                <CoursePanel key={course._id} course={course} active={course._id === selectedCourseId} onSelect={() => setSelectedCourseId(course._id)} />
              ))}
              {coursesQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No courses yet — create the first one.</p>}
            </div>
          </Panel>

          <Panel
            title={selectedCourse ? `Units · ${selectedCourse.title}` : 'Units'}
            action={
              selectedCourseId && (
                <button onClick={() => setCreatingUnit(true)} data-testid="button-new-unit" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  <Plus className="h-3.5 w-3.5" /> New unit
                </button>
              )
            }
          >
            {!selectedCourseId && <p className="text-sm text-muted-foreground">Select a course on the left to manage its units and resources.</p>}
            {selectedCourseId && unitsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {selectedCourseId && unitsQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No units yet — add the first one.</p>}
            <div className="grid gap-3">
              {unitsQuery.data?.map((unit) => (
                <UnitPanel key={unit._id} unit={unit} courseId={selectedCourseId as string} />
              ))}
            </div>
          </Panel>
        </div>
      </AdminKeyGate>

      {creatingCourse && <NewCourseModal onClose={() => setCreatingCourse(false)} />}
      {creatingUnit && selectedCourseId && (
        <NewUnitModal courseId={selectedCourseId} order={unitsQuery.data?.length ?? 0} onClose={() => setCreatingUnit(false)} />
      )}
    </div>
  );
}
