import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_API_BASE = import.meta.env.VITE_BRAIN_API_BASE || 'http://127.0.0.1:4010';

type Observer<T> = {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

type Subscription = {
  unsubscribe: () => void;
};

export type ObservableLike<T> = {
  subscribe: (observer: Observer<T>) => Subscription;
};

export type SquidCompatOptions = {
  apiBase?: string;
  pollIntervalMs?: number;
  graphQlUrl?: string;
  graphQlHeaders?: HeadersInit | (() => Promise<HeadersInit>);
};

type StateSnapshot = {
  campaigns?: Record<string, any>;
  connectorConfigs?: Record<string, any>;
  analyticsEvents?: any[];
  researchRecords?: any[];
  outreachEvents?: any[];
  targetProfiles?: any[];
  tacticObservations?: any[];
  playbooks?: any[];
  memoryConsolidations?: any[];
  decisions?: any[];
  contentPacks?: any[];
  automationRuns?: any[];
  connectors?: any[];
};

export type CollectionSchema = {
  name: string;
  primaryKey: string;
  fields?: Array<{ name: string; type: string }>;
  relations?: Array<{ name: string; type: string; collection: string; localField: string; foreignField: string }>;
  source?: Record<string, any>;
  metadata?: Record<string, any>;
};

type QueryPredicate<T> = (item: T) => boolean;
type QueryOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';
type QueryFilter =
  | { field: string; op?: QueryOperator; value: any }
  | { and: QueryFilter[] }
  | { or: QueryFilter[] };
type QuerySort = { field: string; direction?: 'asc' | 'desc' };
type QuerySpec = {
  collection: string;
  filter?: QueryFilter | null;
  sort?: QuerySort | QuerySort[] | null;
  limit?: number;
  offset?: number;
  select?: string[] | null;
  include?: Array<string | { relation: string; as?: string; filter?: QueryFilter; sort?: QuerySort | QuerySort[]; limit?: number; offset?: number; select?: string[] }> | null;
};

function createPollingObservable<T>(loader: () => Promise<T>, intervalMs: number): ObservableLike<T> {
  return {
    subscribe(observer) {
      let active = true;
      let timer: number | null = null;

      const run = async () => {
        try {
          const value = await loader();
          if (active) {
            observer.next?.(value);
          }
        } catch (error) {
          if (active) {
            observer.error?.(error);
          }
        } finally {
          if (active) {
            timer = window.setTimeout(run, intervalMs);
          }
        }
      };

      void run();

      return {
        unsubscribe() {
          active = false;
          if (timer !== null) {
            window.clearTimeout(timer);
          }
          observer.complete?.();
        },
      };
    },
  };
}

function createSseObservable<T>(url: string, transform: (payload: any) => T, fallback?: () => Promise<T>): ObservableLike<T> {
  return {
    subscribe(observer) {
      let source: EventSource | null = null;
      let active = true;

      const start = async () => {
        try {
          source = new EventSource(url);
          source.addEventListener('snapshot', event => {
            if (!active) return;
            const payload = JSON.parse((event as MessageEvent).data);
            observer.next?.(transform(payload));
          });
          source.addEventListener('status', event => {
            if (!active) return;
            const payload = JSON.parse((event as MessageEvent).data);
            observer.next?.(transform(payload));
          });
          source.onerror = async () => {
            if (fallback && active) {
              try {
                observer.next?.(await fallback());
              } catch (error) {
                observer.error?.(error);
              }
            }
          };
        } catch (error) {
          if (fallback && active) {
            try {
              observer.next?.(await fallback());
            } catch (nextError) {
              observer.error?.(nextError);
            }
          } else {
            observer.error?.(error);
          }
        }
      };

      void start();

      return {
        unsubscribe() {
          active = false;
          source?.close();
          observer.complete?.();
        },
      };
    },
  };
}

async function fetchJson<T>(apiBase: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export class DocumentReference<T extends { id?: string }> {
  readonly refId: string;

  constructor(
    private readonly id: string,
    private readonly loader: () => Promise<T | undefined>,
    private readonly streamLoader: () => ObservableLike<T | undefined>,
    private readonly peeker: () => T | undefined,
    refId: string,
  ) {
    this.refId = refId;
  }

  peek() {
    return this.peeker();
  }

  async snapshot() {
    return this.loader();
  }

  snapshots(): ObservableLike<T | undefined> {
    return this.streamLoader();
  }
}

export class QueryReference<T> {
  constructor(
    private readonly spec: QuerySpec,
    private readonly loader: () => Promise<T[]>,
    private readonly streamLoader: () => ObservableLike<T[]>,
    private readonly peeker: () => T[],
  ) {}

  peek() {
    return this.peeker();
  }

  serialize() {
    return this.spec;
  }

  async snapshot() {
    return this.loader();
  }

  snapshots(): ObservableLike<T[]> {
    return this.streamLoader();
  }
}

export class QueryBuilder<T> {
  constructor(
    private readonly collectionName: string,
    private readonly executeQuery: <TResult = T>(query: QuerySpec) => Promise<{ items: TResult[] }>,
    private readonly streamQuery: <TResult = T>(query: QuerySpec) => ObservableLike<TResult[]>,
    private readonly peeker: () => T[],
    private readonly state: Omit<QuerySpec, 'collection'> = {},
  ) {}

  private next(patch: Partial<Omit<QuerySpec, 'collection'>>) {
    return new QueryBuilder<T>(
      this.collectionName,
      this.executeQuery,
      this.streamQuery,
      this.peeker,
      { ...this.state, ...patch },
    );
  }

  private getSpec(): QuerySpec {
    return {
      collection: this.collectionName,
      ...this.state,
    };
  }

  where(field: string, op: QueryOperator, value: any) {
    return this.next({ filter: { field, op, value } });
  }

  eq(field: string, value: any) {
    return this.where(field, 'eq', value);
  }

  ne(field: string, value: any) {
    return this.where(field, 'ne', value);
  }

  gt(field: string, value: any) {
    return this.where(field, 'gt', value);
  }

  gte(field: string, value: any) {
    return this.where(field, 'gte', value);
  }

  lt(field: string, value: any) {
    return this.where(field, 'lt', value);
  }

  lte(field: string, value: any) {
    return this.where(field, 'lte', value);
  }

  in(field: string, value: any[]) {
    return this.where(field, 'in', value);
  }

  contains(field: string, value: any) {
    return this.where(field, 'contains', value);
  }

  startsWith(field: string, value: any) {
    return this.where(field, 'startsWith', value);
  }

  endsWith(field: string, value: any) {
    return this.where(field, 'endsWith', value);
  }

  and(...filters: QueryFilter[]) {
    return this.next({ filter: { and: filters } });
  }

  or(...filters: QueryFilter[]) {
    return this.next({ filter: { or: filters } });
  }

  filter(filter: QueryFilter) {
    return this.next({ filter });
  }

  sortBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    const current = this.state.sort;
    const nextSort = Array.isArray(current) ? [...current, { field, direction }] : current ? [current, { field, direction }] : [{ field, direction }];
    return this.next({ sort: nextSort });
  }

  limit(limit: number) {
    return this.next({ limit });
  }

  offset(offset: number) {
    return this.next({ offset });
  }

  select(...fields: string[]) {
    return this.next({ select: fields });
  }

  include(...relations: Array<string | { relation: string; as?: string; filter?: QueryFilter; sort?: QuerySort | QuerySort[]; limit?: number; offset?: number; select?: string[] }>) {
    return this.next({ include: relations });
  }

  toQuery(key = 'query') {
    const spec = this.getSpec();
    return new QueryReference<T>(
      spec,
      async () => (await this.executeQuery<T>(spec)).items,
      () => this.streamQuery<T>(spec),
      this.peeker,
    );
  }

  async snapshot() {
    return (await this.executeQuery<T>(this.getSpec())).items;
  }

  snapshots() {
    return this.streamQuery<T>(this.getSpec());
  }

  serialize() {
    return this.getSpec();
  }
}

export class CollectionReference<T extends { id?: string }> {
  constructor(
    private readonly name: string,
    private readonly executeQuery: <TResult = T>(query: Record<string, any>) => Promise<{ items: TResult[] }>,
    private readonly streamQuery: <TResult = T>(query: Record<string, any>) => ObservableLike<TResult[]>,
    private readonly loader: () => Promise<T[]>,
    private readonly streamLoader: () => ObservableLike<T[]>,
    private readonly peeker: () => T[],
  ) {}

  peek() {
    return this.peeker();
  }

  async snapshot() {
    return this.loader();
  }

  snapshots(): ObservableLike<T[]> {
    return this.streamLoader();
  }

  doc(id: string) {
    const query = {
      collection: this.name,
      filter: { field: "id", op: "eq", value: id },
      limit: 1,
    };
    const loadOne = async () => (await this.executeQuery<T>(query)).items[0];
    return new DocumentReference<T>(
      id,
      loadOne,
      () => ({
        subscribe: observer => this.streamQuery<T>(query).subscribe({
          next: items => observer.next?.(items[0]),
          error: observer.error,
          complete: observer.complete,
        }),
      }),
      () => this.peeker().find(item => item?.id === id),
      `${this.name}/${id}`,
    );
  }

  query(specOrPredicate: QueryPredicate<T> | Record<string, any>, key = 'filtered') {
    if (typeof specOrPredicate === 'function') {
      const predicate = specOrPredicate as QueryPredicate<T>;
      const loadFiltered = async () => (await this.loader()).filter(predicate);
      return new QueryReference<T>(
        { collection: this.name, filter: null, select: null, limit: undefined, offset: undefined, sort: null },
        loadFiltered,
        () => createPollingObservable(loadFiltered, 4000),
        () => this.peeker().filter(predicate),
      );
    }

    const query = {
      collection: this.name,
      ...specOrPredicate,
    };
    return new QueryReference<T>(
      query,
      async () => (await this.executeQuery<T>(query)).items,
      () => this.streamQuery<T>(query),
      () => this.peeker(),
    );
  }

  where(field: string, op: QueryOperator, value: any) {
    return new QueryBuilder<T>(this.name, this.executeQuery, this.streamQuery, this.peeker).where(field, op, value);
  }

  filter(filter: QueryFilter) {
    return new QueryBuilder<T>(this.name, this.executeQuery, this.streamQuery, this.peeker).filter(filter);
  }

  sortBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new QueryBuilder<T>(this.name, this.executeQuery, this.streamQuery, this.peeker).sortBy(field, direction);
  }
}

export class GraphQLClient {
  constructor(
    private readonly url: string,
    private readonly headers?: HeadersInit | (() => Promise<HeadersInit>),
  ) {}

  private async resolveHeaders() {
    return typeof this.headers === 'function' ? await this.headers() : this.headers;
  }

  async query<T = Record<string, any>>(query: string, variables?: Record<string, any>) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(await this.resolveHeaders()),
      },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json();
    if (!response.ok || payload.errors) {
      throw new Error(payload.errors?.[0]?.message || `GraphQL error ${response.status}`);
    }
    return payload.data as T;
  }

  async mutate<T = Record<string, any>>(query: string, variables?: Record<string, any>) {
    return this.query<T>(query, variables);
  }
}

export class SquidCompatClient {
  private stateCache: StateSnapshot | null = null;
  readonly options: Required<SquidCompatOptions>;

  constructor(options: SquidCompatOptions = {}) {
    this.options = {
      apiBase: options.apiBase || DEFAULT_API_BASE,
      pollIntervalMs: options.pollIntervalMs || 4000,
      graphQlUrl: options.graphQlUrl || '',
      graphQlHeaders: options.graphQlHeaders || {},
    };
  }

  connectionDetails() {
    return {
      apiBase: this.options.apiBase,
      pollIntervalMs: this.options.pollIntervalMs,
    };
  }

  async getState() {
    const next = await fetchJson<StateSnapshot>(this.options.apiBase, '/state');
    this.stateCache = next;
    return next;
  }

  async getSchema() {
    return fetchJson<CollectionSchema[]>(this.options.apiBase, '/schema');
  }

  async getCollectionSchema(name: string) {
    return fetchJson<CollectionSchema>(this.options.apiBase, `/schema/${encodeURIComponent(name)}`);
  }

  private encodeQuery(query: Record<string, any>) {
    return encodeURIComponent(JSON.stringify(query));
  }

  async query<T = any>(query: Record<string, any>) {
    return fetchJson<{
      items: T[];
      count: number;
      totalCount: number;
      executedAt: string;
    }>(this.options.apiBase, '/query', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  streamQuery<T = any>(query: Record<string, any>) {
    const encoded = this.encodeQuery(query);
    return createSseObservable<T[]>(
      `${this.options.apiBase}/stream?query=${encoded}`,
      payload => Array.isArray(payload?.items) ? payload.items as T[] : [],
      async () => (await this.query<T>(query)).items,
    );
  }

  private getCachedCollection<T>(name: keyof StateSnapshot): T[] {
    const value = this.stateCache?.[name];
    return Array.isArray(value) ? value as T[] : [];
  }

  collection<T extends { id?: string }>(name: keyof StateSnapshot) {
    const query = { collection: String(name) };
    return new CollectionReference<T>(
      String(name),
      <TResult = T>(nextQuery: Record<string, any>) => this.query<TResult>(nextQuery),
      <TResult = T>(nextQuery: Record<string, any>) => this.streamQuery<TResult>(nextQuery),
      async () => {
        const result = await this.query<T>(query);
        return result.items;
      },
      () => this.streamQuery<T>(query),
      () => this.getCachedCollection<T>(name),
    );
  }

  graphQL(url = this.options.graphQlUrl, headers = this.options.graphQlHeaders) {
    if (!url) {
      throw new Error('graphQlUrl is not configured.');
    }
    return new GraphQLClient(url, headers);
  }

  ai() {
    return {
      runAutomation: (campaignId: string, payload: Record<string, any> = {}) =>
        fetchJson<any>(this.options.apiBase, '/automation/run', {
          method: 'POST',
          body: JSON.stringify({ campaignId, ...payload }),
        }),
      runDecision: (campaignId: string) =>
        fetchJson<any>(this.options.apiBase, '/decision/run', {
          method: 'POST',
          body: JSON.stringify({ campaignId }),
        }),
      generateContent: (campaignId: string, payload: Record<string, any> = {}) =>
        fetchJson<any>(this.options.apiBase, '/content/generate', {
          method: 'POST',
          body: JSON.stringify({ campaignId, ...payload }),
        }),
      ask: async (customApiUrl: string, payload: Record<string, any>) => {
        const response = await fetch(customApiUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(async () => ({ response: await response.text() }));
        if (!response.ok) {
          throw new Error(data?.error || `AI endpoint error ${response.status}`);
        }
        return data;
      },
      getJobStatus: (jobId: string) => fetchJson<any>(this.options.apiBase, `/jobs/${encodeURIComponent(jobId)}/status`),
      streamJobStatus: (jobId: string) =>
        createSseObservable<any[]>(
          `${this.options.apiBase}/jobs/${encodeURIComponent(jobId)}/stream`,
          payload => [payload],
          async () => {
            const job = await fetchJson<any>(this.options.apiBase, `/jobs/${encodeURIComponent(jobId)}/status`);
            return job.events || [];
          },
        ),
    };
  }
}

const SquidCompatContext = createContext<SquidCompatClient | null>(null);

export function SquidCompatProvider({ children, options }: { children: React.ReactNode; options?: SquidCompatOptions }) {
  const clientRef = useRef<SquidCompatClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new SquidCompatClient(options);
  }
  return (
    <SquidCompatContext.Provider value={clientRef.current}>
      {children}
    </SquidCompatContext.Provider>
  );
}

export function useSquid() {
  const client = useContext(SquidCompatContext);
  if (!client) {
    throw new Error('useSquid must be used within SquidCompatProvider.');
  }
  return client;
}

export function useCollection<T extends { id?: string }>(name: keyof StateSnapshot) {
  return useSquid().collection<T>(name);
}

export type ObservableType<T> = {
  loading: boolean;
  data: T;
  error: unknown;
  complete: boolean;
};

export function useObservable<T>(
  observable: () => ObservableLike<T>,
  options: { enabled?: boolean; initialData: T },
  deps?: ReadonlyArray<unknown>,
): ObservableType<T>;
export function useObservable<T>(
  observable: () => ObservableLike<T>,
  options?: { enabled?: boolean; initialData?: T | null },
  deps?: ReadonlyArray<unknown>,
): ObservableType<T | null>;
export function useObservable<T>(
  observable: () => ObservableLike<T>,
  options: { enabled?: boolean; initialData?: T | null } = {},
  deps: ReadonlyArray<unknown> = [],
): ObservableType<T | null> {
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<ObservableType<T | null>>({
    loading: enabled,
    data: options.initialData ?? null,
    error: null,
    complete: false,
  });

  const memoized = useMemo(observable, [enabled, JSON.stringify(deps)]);

  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, loading: false, complete: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, complete: false }));
    const subscription = memoized.subscribe({
      next: value => setState({ loading: false, data: value, error: null, complete: false }),
      error: error => setState(prev => ({ ...prev, loading: false, error, complete: false })),
      complete: () => setState(prev => ({ ...prev, loading: false, complete: true })),
    });

    return () => subscription.unsubscribe();
  }, [enabled, memoized]);

  return state;
}

export type PromiseType<T> = {
  loading: boolean;
  data: T;
  error: unknown;
};

export function usePromise<T>(
  promiseFn: () => Promise<T>,
  options: { enabled?: boolean; initialData: T },
  deps?: ReadonlyArray<unknown>,
): PromiseType<T>;
export function usePromise<T>(
  promiseFn: () => Promise<T>,
  options?: { enabled?: boolean; initialData?: T | null },
  deps?: ReadonlyArray<unknown>,
): PromiseType<T | null>;
export function usePromise<T>(
  promiseFn: () => Promise<T>,
  options: { enabled?: boolean; initialData?: T | null } = {},
  deps: ReadonlyArray<unknown> = [],
): PromiseType<T | null> {
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<PromiseType<T | null>>({
    loading: enabled,
    data: options.initialData ?? null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    let active = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    promiseFn()
      .then(value => {
        if (active) {
          setState({ loading: false, data: value, error: null });
        }
      })
      .catch(error => {
        if (active) {
          setState(prev => ({ ...prev, loading: false, error }));
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, JSON.stringify(deps)]);

  return state;
}

export function useDoc<T extends { id?: string }>(doc: DocumentReference<T>, options: { enabled?: boolean; subscribe?: boolean } = {}) {
  const subscribe = options.subscribe ?? true;
  return useObservable<T | undefined>(
    () => subscribe ? doc.snapshots() : createPollingObservable(() => doc.snapshot(), Number.MAX_SAFE_INTEGER),
    { enabled: options.enabled, initialData: doc.peek() },
    [doc.refId, subscribe],
  );
}

export function useQuery<T>(query: QueryReference<T> | QueryBuilder<T>, options: { enabled?: boolean; subscribe?: boolean; initialData?: T[] } = {}) {
  const subscribe = options.subscribe ?? true;
  const executable = query instanceof QueryBuilder ? query.toQuery() : query;
  return useObservable<T[]>(
    () => subscribe ? executable.snapshots() : createPollingObservable(() => executable.snapshot(), Number.MAX_SAFE_INTEGER),
    { enabled: options.enabled, initialData: options.initialData ?? executable.peek() },
    [executable.serialize(), subscribe],
  );
}

export function useDocs<T>(query: QueryReference<T> | QueryBuilder<T>, options: { enabled?: boolean; subscribe?: boolean; initialData?: T[] } = {}) {
  return useQuery(query, options);
}

export type PaginationType<T> = {
  loading: boolean;
  data: T[];
  error: unknown;
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
  page: number;
  pageSize: number;
  totalCount: number;
};

export function usePagination<T>(
  query: QueryBuilder<T> | QueryReference<T>,
  options: { enabled?: boolean; subscribe?: boolean; pageSize?: number; initialData?: T[] } = {},
) : PaginationType<T> {
  const pageSize = options.pageSize ?? 10;
  const [page, setPage] = useState(0);
  const executable = query instanceof QueryBuilder ? query : null;

  const pagedQuery = useMemo(() => {
    if (executable) {
      return executable.limit(pageSize).offset(page * pageSize);
    }

    const serialized = query.serialize();
    const collectionName = serialized.collection;
    const fallback = new QueryBuilder<T>(
      collectionName,
      async () => ({ items: [] }),
      () => ({ subscribe: () => ({ unsubscribe() {} }) }),
      () => [],
      serialized,
    );
    return fallback.limit(pageSize).offset(page * pageSize);
  }, [executable, query, page, pageSize]);

  const squid = useSquid();
  const serialized = pagedQuery.serialize();
  const [totalCount, setTotalCount] = useState(0);
  const { data, loading, error } = useObservable<T[]>(
    () => {
      const queryRef = pagedQuery.toQuery(`page-${page}`);
      if (options.subscribe ?? true) {
        return queryRef.snapshots();
      }
      return createPollingObservable(() => queryRef.snapshot(), Number.MAX_SAFE_INTEGER);
    },
    { enabled: options.enabled, initialData: options.initialData ?? [] },
    [serialized, page, pageSize, options.subscribe],
  );

  useEffect(() => {
    let active = true;
    squid.query<T>(serialized).then(result => {
      if (active) {
        setTotalCount(result.totalCount || result.count || 0);
      }
    }).catch(() => {
      if (active) {
        setTotalCount(0);
      }
    });
    return () => {
      active = false;
    };
  }, [squid, JSON.stringify(serialized)]);

  const hasPrev = page > 0;
  const hasNext = (page + 1) * pageSize < totalCount;

  return {
    loading,
    data,
    error,
    hasNext,
    hasPrev,
    next: () => setPage(current => hasNext ? current + 1 : current),
    prev: () => setPage(current => hasPrev ? current - 1 : current),
    page,
    pageSize,
    totalCount,
  };
}

export type AiChatMessage = {
  id: string;
  type: 'user' | 'ai';
  message: string;
  jobId?: string;
};

export function useAiAgent(agentId: string, config?: { campaignId?: string; customApiUrl?: string }) {
  const squid = useSquid();
  const [history, setHistory] = useState<AiChatMessage[]>([]);
  const [data, setData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [complete, setComplete] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, any[]>>({});

  const chat = async (prompt: string, options?: { reason?: string; locales?: string[]; campaignId?: string }, jobId = crypto.randomUUID()) => {
    setLoading(true);
    setError(null);
    setComplete(false);
    setHistory(prev => [...prev, { id: crypto.randomUUID(), type: 'user', message: prompt, jobId }]);

    try {
      const result = config?.customApiUrl
        ? await squid.ai().ask(config.customApiUrl, { prompt, jobId, agentId })
        : await squid.ai().runAutomation(options?.campaignId || config?.campaignId || 'main-campaign', {
            reason: options?.reason || agentId,
            locales: options?.locales,
            prompt,
          });

      const runtimeJobId = result?.job?.id;
      if (runtimeJobId) {
        const subscription = squid.ai().streamJobStatus(runtimeJobId).subscribe({
          next: (events) => {
            setStatusUpdates(current => ({
              ...current,
              [runtimeJobId]: Array.isArray(events)
                ? [...(current[runtimeJobId] || []), ...events]
                : [...(current[runtimeJobId] || []), events],
            }));
          },
        });
        window.setTimeout(() => subscription.unsubscribe(), 30000);
      }

      const responseText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      setData(responseText);
      setHistory(prev => [...prev, { id: crypto.randomUUID(), type: 'ai', message: responseText, jobId }]);
      setComplete(true);
      return result;
    } catch (nextError) {
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  };

  return {
    chat,
    history,
    data,
    loading,
    error,
    complete,
    statusUpdates,
  };
}
