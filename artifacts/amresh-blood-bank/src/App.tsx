import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Droplet,
  HeartHandshake,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getGetDonorsQueryKey,
  useCreateDonor,
  useGetDashboardSummary,
  useGetDonors,
  useHealthCheck,
  type Donor,
  type DonorInput,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import './index.css';

const queryClient = new QueryClient();
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodGroupValue = (typeof bloodGroups)[number];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
      <span className="blood-mark" aria-hidden="true"><span /></span>
      <span>
        <span className="display-font block text-[1.06rem] font-semibold leading-none tracking-tight">Amresh</span>
        <span className="mt-1 block text-[.63rem] font-semibold uppercase tracking-[.22em] text-muted-foreground">Blood Bank</span>
      </span>
    </Link>
  );
}

function Header() {
  const [location] = useLocation();
  const health = useHealthCheck({
    query: { queryKey: ['/api/healthz'], refetchInterval: 30000 },
  });
  const isOnline = health.data?.status === 'ok' || health.data?.status === 'healthy';

  return (
    <header className="border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
        <Brand />
        <nav className="flex items-center gap-3 sm:gap-7" aria-label="Primary navigation">
          <Link
            href="/"
            className={`hidden text-sm font-semibold transition-colors sm:inline ${location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="link-directory"
          >
            Find a donor
          </Link>
          <Link
            href="/register"
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-transform hover:-translate-y-0.5 ${location === '/register' ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/.18)]' : 'border border-border bg-card text-foreground hover:border-primary/40'}`}
            data-testid="link-register"
          >
            <HeartHandshake size={16} strokeWidth={2.2} />
            <span>Become a donor</span>
          </Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 pb-3 text-[.7rem] font-semibold uppercase tracking-[.17em] text-muted-foreground lg:px-10">
        <span className={`h-1.5 w-1.5 rounded-full ${health.isLoading ? 'bg-accent' : isOnline ? 'bg-emerald-600' : 'bg-destructive'}`} />
        <span data-testid="status-service">{health.isLoading ? 'Checking directory' : isOnline ? 'Directory live' : 'Directory connection interrupted'}</span>
      </div>
    </header>
  );
}

function StatCard({ value, label, icon: Icon, accent }: { value: number | string; label: string; icon: typeof Users; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${accent ? 'border-primary/20 bg-primary text-primary-foreground' : 'border-border/80 bg-card'}`} data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className={`mb-7 flex h-9 w-9 items-center justify-center rounded-xl ${accent ? 'bg-primary-foreground/15' : 'bg-secondary'}`}>
        <Icon size={18} />
      </div>
      <div className="display-font text-3xl font-semibold tracking-tight">{value}</div>
      <div className={`mt-1 text-xs font-semibold uppercase tracking-[.14em] ${accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{label}</div>
      <div className={`absolute -right-5 -top-7 h-24 w-24 rounded-full border-[12px] ${accent ? 'border-primary-foreground/10' : 'border-primary/7'}`} />
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading donors" data-testid="loading-donors">
      {[1, 2, 3].map((item) => (
        <div className="skeleton h-[118px] rounded-2xl" key={item} />
      ))}
    </div>
  );
}

function DonorCard({ donor }: { donor: Donor }) {
  return (
    <article className="group rounded-2xl border border-border/80 bg-card p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-sm)]" data-testid={`card-donor-${donor.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary font-bold text-secondary-foreground" aria-hidden="true">
            {donor.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground" data-testid={`text-donor-name-${donor.id}`}>{donor.fullName}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={13} />
              <span data-testid={`text-donor-location-${donor.id}`}>{donor.city}, {donor.state}</span>
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-sm font-bold text-primary-foreground" data-testid={`text-donor-blood-${donor.id}`}>{donor.bloodGroup}</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3.5">
        <span className={`flex items-center gap-2 text-xs font-semibold ${donor.available ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${donor.available ? 'bg-emerald-600' : 'bg-muted-foreground/50'}`} />
          {donor.available ? 'Available to donate' : 'Currently unavailable'}
        </span>
        <a href={`tel:${donor.phone}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline" data-testid={`button-contact-donor-${donor.id}`}>
          <Phone size={13} /> {donor.phone}
        </a>
      </div>
    </article>
  );
}

function SearchPanel({ onSearch, initialValues }: { onSearch: (values: { city: string; bloodGroup: string; available: boolean }) => void; initialValues: { city: string; bloodGroup: string; available: boolean } }) {
  const [city, setCity] = useState(initialValues.city);
  const [bloodGroup, setBloodGroup] = useState(initialValues.bloodGroup);
  const [available, setAvailable] = useState(initialValues.available);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch({ city: city.trim(), bloodGroup, available });
  };

  return (
    <form onSubmit={submit} className="relative z-10 grid gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-[var(--shadow-md)] md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-center" data-testid="form-search-donors">
      <label className="flex min-w-0 items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-3">
        <Search size={18} className="shrink-0 text-primary" />
        <span className="sr-only">Search by city</span>
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="City"
          className="min-w-0 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
          data-testid="input-search-city"
        />
      </label>
      <label className="relative flex items-center rounded-xl bg-muted/60">
        <span className="sr-only">Blood group</span>
        <select value={bloodGroup} onChange={(event) => setBloodGroup(event.target.value)} className="w-full appearance-none bg-transparent px-3.5 py-3 text-sm font-semibold outline-none" data-testid="select-search-blood-group">
          <option value="">All blood groups</option>
          {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 text-muted-foreground" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setAvailable(!available); onSearch({ city: city.trim(), bloodGroup, available: !available }); }} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition-colors ${available ? 'border-primary/25 bg-primary/8 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`} aria-pressed={available} data-testid="button-toggle-available">
          <span className={`h-2 w-2 rounded-full ${available ? 'bg-emerald-600' : 'bg-muted-foreground/40'}`} /> Available
        </button>
        <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-search-donors">
          Search <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

function Home() {
  const initialSearch = { city: '', bloodGroup: '', available: true };
  const [search, setSearch] = useState(initialSearch);
  const params = useMemo(() => ({
    ...(search.bloodGroup ? { bloodGroup: search.bloodGroup as BloodGroupValue } : {}),
    ...(search.city ? { city: search.city } : {}),
    available: search.available,
    limit: 100,
  }), [search]);
  const summaryQuery = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const donorsQuery = useGetDonors(params, { query: { queryKey: getGetDonorsQueryKey(params) } });

  const summary = summaryQuery.data;
  const donors = donorsQuery.data ?? [];
  const chartMax = Math.max(...(summary?.byBloodGroup.map((item) => item.count) ?? [1]));

  return (
    <div className="page-shell paper-grid">
      <Header />
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-10 pt-10 lg:px-10 lg:pb-16 lg:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div className="fade-up">
              <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-primary"><span className="h-px w-7 bg-accent" /> Community-powered care</p>
              <h1 className="display-font max-w-2xl text-[clamp(3.2rem,7vw,6.7rem)] font-semibold leading-[.92] tracking-[-.055em] text-foreground">
                The right blood type, <span className="text-primary">closer</span> than you think.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">A dependable, city-by-city directory of people who have said yes to helping when it matters.</p>
            </div>
            <div className="fade-up fade-up-delay-1 lg:pb-1">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-[.17em] text-muted-foreground">Find a willing donor</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><Activity size={13} /> Live directory</span>
              </div>
              <SearchPanel key={`${search.city}-${search.bloodGroup}-${search.available}`} onSearch={setSearch} initialValues={search} />
              <p className="mt-3 px-1 text-xs text-muted-foreground">Filter by city and blood group. Contact details are shared because each donor explicitly consented.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-14 lg:px-10 lg:pb-20" aria-labelledby="overview-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">The network at a glance</p>
              <h2 id="overview-heading" className="display-font mt-1 text-3xl font-semibold tracking-tight">Ready when a neighbour needs it.</h2>
            </div>
            <span className="hidden text-right text-xs text-muted-foreground sm:block">Live totals from the directory</span>
          </div>
          {summaryQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => <div className="skeleton h-[146px] rounded-2xl" key={item} />)}
            </div>
          ) : summaryQuery.isError ? (
            <ErrorState message="The overview could not be loaded." onRetry={() => summaryQuery.refetch()} testId="error-summary" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard value={summary?.availableDonors ?? 0} label="Available now" icon={HeartHandshake} accent />
              <StatCard value={summary?.totalDonors ?? 0} label="Registered donors" icon={Users} />
              <StatCard value={summary?.citiesCovered ?? 0} label="Cities covered" icon={MapPin} />
              <StatCard value={summary?.bloodGroupsRepresented ?? 0} label="Blood groups" icon={Droplet} />
            </div>
          )}
        </section>

        <section className="border-y border-border/70 bg-card/55" aria-labelledby="directory-heading">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[.36fr_.64fr] lg:px-10 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Public directory</p>
              <h2 id="directory-heading" className="display-font mt-2 text-4xl font-semibold leading-tight tracking-tight">People ready to show up.</h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Every card represents a real volunteer in the Amresh network. Please be considerate when making contact.</p>
              {summary?.byBloodGroup && summary.byBloodGroup.length > 0 && (
                <div className="mt-9 border-t border-border/70 pt-5">
                  <p className="mb-4 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Blood group spread</p>
                  <div className="space-y-3">
                    {summary.byBloodGroup.map((item) => (
                      <div className="flex items-center gap-3" key={item.bloodGroup} data-testid={`chart-blood-group-${item.bloodGroup}`}>
                        <span className="w-8 text-xs font-bold text-primary">{item.bloodGroup}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(4, (item.count / chartMax) * 100)}%` }} /></div>
                        <span className="w-6 text-right text-xs font-semibold text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-600" /> {donorsQuery.isLoading ? 'Finding donors…' : `${donors.length} donor${donors.length === 1 ? '' : 's'} found`}</div>
                {search.city || search.bloodGroup ? <button className="text-xs font-bold text-primary underline underline-offset-4" onClick={() => setSearch(initialSearch)} data-testid="button-clear-search">Clear filters</button> : null}
              </div>
              {donorsQuery.isLoading ? <DirectorySkeleton /> : donorsQuery.isError ? <ErrorState message="We could not reach the donor directory." onRetry={() => donorsQuery.refetch()} testId="error-donors" /> : donors.length === 0 ? (
                <EmptyDirectory filtered={Boolean(search.city || search.bloodGroup || (summary?.totalDonors ?? 0) > 0)} onReset={() => setSearch(initialSearch)} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">{donors.map((donor) => <DonorCard donor={donor} key={donor.id} />)}</div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-20">
          <div className="grid gap-8 rounded-3xl bg-secondary/70 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">A small promise with a big reach</p>
              <h2 className="display-font mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Someone’s first call can be your next kind act.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Register once, keep your availability honest, and help your city become a little more prepared.</p>
            </div>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-cta-register">Register as a donor <ArrowRight size={17} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ErrorState({ message, onRetry, testId }: { message: string; onRetry: () => void; testId: string }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-7 text-center" data-testid={testId}>
      <CircleAlert className="mx-auto text-destructive" size={24} />
      <p className="mt-3 text-sm font-semibold">{message}</p>
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold hover:border-primary/40" data-testid={`button-retry-${testId}`}><RefreshCw size={14} /> Try again</button>
    </div>
  );
}

function EmptyDirectory({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/50 p-10 text-center" data-testid="empty-donors">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Search size={20} /></div>
      <h3 className="mt-4 font-semibold">{filtered ? 'No matching donors yet' : 'The directory is waiting for its first volunteers'}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{filtered ? 'Try another city or blood group, or clear the filters to search the full network.' : 'Be the first person in your community to register and make this network useful.'}</p>
      {filtered ? <button onClick={onReset} className="mt-4 text-xs font-bold text-primary underline underline-offset-4" data-testid="button-reset-empty-search">Clear search</button> : <Link href="/register" className="mt-4 inline-flex text-xs font-bold text-primary underline underline-offset-4" data-testid="link-empty-register">Register as a donor</Link>}
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-foreground">{label}</label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs font-semibold text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10';

function Register() {
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const createDonor = useCreateDonor();
  const [form, setForm] = useState({ fullName: '', bloodGroup: '', city: '', state: '', pincode: '', phone: '', available: true, lastDonationDate: '', consentToContact: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Please enter your full name.';
    if (!bloodGroups.includes(form.bloodGroup as BloodGroupValue)) next.bloodGroup = 'Choose your blood group.';
    if (form.city.trim().length < 2) next.city = 'Enter the city where you can help.';
    if (form.state.trim().length < 2) next.state = 'Enter your state.';
    if (form.pincode && !/^[0-9]{6}$/.test(form.pincode)) next.pincode = 'Use a 6-digit pincode.';
    if (!/^[6-9][0-9]{9}$/.test(form.phone)) next.phone = 'Enter a valid 10-digit mobile number.';
    if (!form.consentToContact) next.consentToContact = 'Consent is required because your phone number is shown to people seeking help.';
    return next;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;
    const payload: DonorInput = {
      fullName: form.fullName.trim(),
      bloodGroup: form.bloodGroup as BloodGroupValue,
      city: form.city.trim(),
      state: form.state.trim(),
      phone: form.phone,
      available: form.available,
      consentToContact: true,
      ...(form.pincode ? { pincode: form.pincode } : {}),
      ...(form.lastDonationDate ? { lastDonationDate: form.lastDonationDate } : {}),
    };
    createDonor.mutate({ data: payload }, {
      onSuccess: () => {
        client.invalidateQueries({ queryKey: getGetDonorsQueryKey() });
        client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation('/');
      },
      onError: (error) => setSubmitError((error as { error?: string }).error ?? 'We could not save your registration. Please try again.'),
    });
  };

  return (
    <div className="page-shell paper-grid">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
          <div className="fade-up lg:sticky lg:top-8">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-primary"><span className="h-px w-7 bg-accent" /> Volunteer registration</p>
            <h1 className="display-font max-w-lg text-5xl font-semibold leading-[.98] tracking-[-.04em] sm:text-6xl">Make your willingness <span className="text-primary">findable.</span></h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Your details help someone in your city reach a willing person faster. It takes about two minutes.</p>
            <div className="mt-9 space-y-4">
              <TrustPoint icon={ShieldCheck} title="Consent comes first" copy="Your number is only listed when you explicitly agree to be contacted." />
              <TrustPoint icon={MapPin} title="Local by design" copy="People search by city, so your offer reaches the communities closest to you." />
              <TrustPoint icon={HeartHandshake} title="Keep it honest" copy="You can mark yourself unavailable whenever you need to." />
            </div>
          </div>
          <form onSubmit={submit} className="fade-up fade-up-delay-1 rounded-3xl border border-border/80 bg-card p-5 shadow-[var(--shadow-md)] sm:p-8" noValidate data-testid="form-register-donor">
            <div className="mb-8 flex items-start justify-between gap-5 border-b border-border/70 pb-6">
              <div><p className="text-xs font-bold uppercase tracking-[.17em] text-primary">Your details</p><h2 className="display-font mt-1 text-2xl font-semibold">Register to help</h2></div>
              <span className="rounded-full bg-secondary px-3 py-1 text-[.68rem] font-bold uppercase tracking-wider text-secondary-foreground">Free to join</span>
            </div>
            {submitError ? <div className="mb-6 flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-semibold text-destructive" role="alert" data-testid="error-register-submit"><CircleAlert className="mt-0.5 shrink-0" size={18} /> <span>{submitError}</span></div> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Full name" error={errors.fullName}><input className={inputClass} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Your name" autoComplete="name" data-testid="input-full-name" aria-invalid={Boolean(errors.fullName)} /></Field></div>
              <Field label="Blood group" error={errors.bloodGroup}><div className="relative"><select className={`${inputClass} appearance-none`} value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)} data-testid="select-blood-group" aria-invalid={Boolean(errors.bloodGroup)}><option value="">Select group</option>{bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-3.5 top-3.5 text-muted-foreground" /></div></Field>
              <Field label="Mobile number" hint="10-digit Indian mobile number" error={errors.phone}><input className={inputClass} value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" inputMode="numeric" autoComplete="tel" data-testid="input-phone" aria-invalid={Boolean(errors.phone)} /></Field>
              <Field label="City" error={errors.city}><input className={inputClass} value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Where you can help" autoComplete="address-level2" data-testid="input-city" aria-invalid={Boolean(errors.city)} /></Field>
              <Field label="State" error={errors.state}><input className={inputClass} value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" autoComplete="address-level1" data-testid="input-state" aria-invalid={Boolean(errors.state)} /></Field>
              <Field label="Pincode" hint="Optional" error={errors.pincode}><input className={inputClass} value={form.pincode} onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" inputMode="numeric" autoComplete="postal-code" data-testid="input-pincode" aria-invalid={Boolean(errors.pincode)} /></Field>
              <Field label="Last donation date" hint="Optional"><input className={inputClass} type="date" value={form.lastDonationDate} onChange={(e) => update('lastDonationDate', e.target.value)} data-testid="input-last-donation-date" /></Field>
            </div>
            <div className="mt-7 space-y-3 rounded-2xl bg-muted/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={form.available} onChange={(e) => update('available', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" data-testid="checkbox-available" />
                <span><span className="block text-sm font-bold">I am currently available to donate</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">You can still be listed if this is unchecked, but you will not appear in available searches.</span></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${errors.consentToContact ? 'border-destructive/40 bg-destructive/5' : 'border-transparent'}`}>
                <input type="checkbox" checked={form.consentToContact} onChange={(e) => update('consentToContact', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" data-testid="checkbox-consent" aria-invalid={Boolean(errors.consentToContact)} />
                <span><span className="block text-sm font-bold">I consent to be contacted by people seeking blood</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Your phone number will be visible in the public donor directory. This consent is required to register.</span></span>
              </label>
              {errors.consentToContact ? <p className="pl-7 text-xs font-semibold text-destructive" role="alert">{errors.consentToContact}</p> : null}
            </div>
            <button type="submit" disabled={createDonor.isPending} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60" data-testid="button-submit-registration">
              {createDonor.isPending ? 'Saving your registration…' : <>Join the donor directory <ArrowRight size={17} /></>}
            </button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"><ShieldCheck size={14} /> Your information is used only for donor contact.</p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function TrustPoint({ icon: Icon, title, copy }: { icon: typeof ShieldCheck; title: string; copy: string }) {
  return <div className="flex gap-3.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Icon size={17} /></div><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{copy}</p></div></div>;
}

function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <div className="flex items-center gap-2"><span className="font-semibold text-foreground">Amresh Blood Bank System</span><span>•</span><span>Community-run by Amresh Kumar Yadav</span></div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5"><CircleCheck size={14} className="text-emerald-600" /> Built for quicker, kinder connections</span>
          <a
            className="underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            href="https://github.com/simranlotey/Blood-Bank-Management-System"
            target="_blank"
            rel="noreferrer"
          >
            Original project by Simranpreet Singh · MIT
          </a>
        </div>
      </div>
    </footer>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/register" component={Register} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;