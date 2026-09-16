import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import {
  ArrowRight, BookOpen, Clock3, Download, FileText, ImageIcon,
  LoaderCircle, PlayCircle, Search,
} from 'lucide-react';
import {
  getLibraryCourse, getResourceDownloadUrl, listLibraryCourses,
  listLibraryUnitResources, type LibraryResource,
} from '@/lib/library-api';

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function resourceIcon(type: LibraryResource['type']) {
  if (type === 'video') return <PlayCircle className="h-5 w-5" />;
  if (type === 'notes') return <BookOpen className="h-5 w-5" />;
  if (type === 'image') return <ImageIcon className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="noise min-h-[100dvh] bg-background">
      <div className="border-b border-border bg-card px-5 py-4 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/library" data-testid="link-library-home" className="font-display text-lg font-extrabold text-primary">
            Resource Library
          </Link>
          <Link href="/" data-testid="link-library-back-site" className="text-sm font-semibold text-muted-foreground hover:text-accent">
            Back to site
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

export function LibraryPage() {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['library', 'courses'], queryFn: listLibraryCourses });
  const courses = (query.data ?? []).filter((course) =>
    `${course.title} ${course.unitCode}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[.2em] text-accent">Free to browse</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Notes, videos, and past papers.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Real uploaded resources, organized by course and unit, ready to download.
        </p>
        <label className="relative mt-8 block max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="input-library-search"
            placeholder="Search courses"
            className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-accent"
          />
        </label>

        {query.isLoading && (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-2xl bg-foreground/10" />
            ))}
          </div>
        )}

        {query.isError && (
          <p className="mt-8 text-sm text-destructive">Could not load courses right now. Try refreshing.</p>
        )}

        {!query.isLoading && courses.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No courses published yet. Check back soon, or add one from the admin panel.
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course._id}
              href={`/library/courses/${course._id}`}
              data-testid={`card-library-course-${course._id}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-xl font-display font-bold text-primary"
                style={{ background: course.accent || '#f2b84b' }}
              >
                {course.image || course.unitCode.slice(0, 2)}
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{course.title}</h3>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {course.unitCode} · {course.level}
              </p>
              <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> {course.resourceCount} resources
                </span>
                <span className="flex items-center gap-1 text-primary group-hover:text-accent">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </Shell>
  );
}

export function LibraryCoursePage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const query = useQuery({
    queryKey: ['library', 'course', courseId],
    queryFn: () => getLibraryCourse(courseId),
    enabled: Boolean(courseId),
  });

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
        <Link href="/library" data-testid="link-library-back-list" className="text-sm font-semibold text-muted-foreground hover:text-accent">
          ← All courses
        </Link>

        {query.isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-foreground/10" />}
        {query.isError && <p className="mt-8 text-sm text-destructive">Course not found.</p>}

        {query.data && (
          <>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[.18em] text-accent">
              {query.data.unitCode} · {query.data.level}
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              {query.data.title}
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">{query.data.description}</p>
            {query.data.duration && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" /> {query.data.duration}
              </p>
            )}

            <h2 className="mt-10 font-display text-2xl font-bold">Units</h2>
            {query.data.units.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No units published for this course yet.</p>
            ) : (
              <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                {query.data.units.map((unit, index) => (
                  <Link
                    key={unit._id}
                    href={`/library/courses/${courseId}/units/${unit._id}`}
                    data-testid={`link-library-unit-${unit._id}`}
                    className="flex items-center gap-4 p-5 hover:bg-muted/50"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted font-mono text-xs font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">{unit.code}</p>
                      <h3 className="font-display text-lg font-bold">{unit.title}</h3>
                      {unit.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{unit.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {unit.resourceCount} resources
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}

function ResourceCard({ resource }: { resource: LibraryResource }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const { url } = await getResourceDownloadUrl(resource._id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Could not start the download. Try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-accent">
        {resourceIcon(resource.type)}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold">{resource.title}</h3>
        {resource.description && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{resource.description}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
          <span className="capitalize">{resource.type.replace('-', ' ')}</span>
          {resource.fileSize > 0 && <span>{formatBytes(resource.fileSize)}</span>}
          {resource.price > 0 && <span className="font-semibold text-foreground">{formatKES(resource.price)}</span>}
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <button
        onClick={download}
        disabled={downloading}
        data-testid={`button-download-${resource._id}`}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
      >
        {downloading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download
      </button>
    </div>
  );
}

export function LibraryUnitPage() {
  const { courseId = '', unitId = '' } = useParams<{ courseId: string; unitId: string }>();
  const query = useQuery({
    queryKey: ['library', 'unit-resources', unitId],
    queryFn: () => listLibraryUnitResources(courseId, unitId),
    enabled: Boolean(courseId && unitId),
  });

  return (
    <Shell>
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
        <Link href={`/library/courses/${courseId}`} data-testid="link-library-back-course" className="text-sm font-semibold text-muted-foreground hover:text-accent">
          ← Back to units
        </Link>
        <h1 className="mt-6 font-display text-3xl font-extrabold">Unit resources</h1>

        {query.isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-foreground/10" />}
        {query.isError && <p className="mt-8 text-sm text-destructive">Could not load resources.</p>}

        {query.data && query.data.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">No resources uploaded to this unit yet.</p>
        )}

        <div className="mt-6 grid gap-3">
          {(query.data ?? []).map((resource) => (
            <ResourceCard key={resource._id} resource={resource} />
          ))}
        </div>
      </main>
    </Shell>
  );
}
