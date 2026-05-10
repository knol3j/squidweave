# Squid Capability Fork Notes

Studied upstream public repos:

- `squidcloudio/squid-react`
- `squidcloudio/squid-graphql`
- `squidcloudio/squid-angular`

## What Those Repos Actually Provide

- A framework adapter around a shared Squid client, not the whole platform.
- React context and hooks for:
  - client access
  - collection and document access
  - observable and promise state
  - live query subscriptions
  - AI-agent style interactions
- A GraphQL helper that derives authenticated requests from the client connection.
- An Angular module/provider that injects the same client into Angular DI.

## What Was Forked Here

Implemented local compatibility layer:

- `ui/src/lib/squid.tsx`

It provides:

- `SquidCompatProvider`
- `useSquid`
- `useCollection`
- `useDoc`
- `useQuery`
- `useObservable`
- `usePromise`
- `useAiAgent`
- `GraphQLClient`
- `SquidCompatClient`

## Declarative Query Shape

Preferred client query pattern now serializes to backend `/query` and `/stream`:

```ts
const research = useCollection<any>('researchRecords');
const q = research
  .where('campaignId', 'eq', 'main-campaign')
  .sortBy('fitScore', 'desc')
  .limit(10);

const { data, loading } = useQuery(q);
```

Compatibility fallback still exists:

- `collection.query((item) => ...)`

But that path remains client-side only because arbitrary functions cannot be serialized to the backend query engine.

## Important Differences

This app does not have Squid Cloud's generic backend, schema engine, or connector runtime. The compatibility layer therefore targets the LocaleWeave backend and persisted `/state` snapshot.

Supported today:

- Real polling-backed collection/document/query access over existing backend state
- Automation-backed AI hook shape
- GraphQL wrapper for external endpoints when a URL is provided

Not equivalent yet:

- Generic server-side collection definitions
- Arbitrary cross-source joins
- Native streaming transport beyond polling
- Voice/transcription AI flows
- Full database connector abstraction used by Squid Cloud

## Recommended Next Expansion

1. Add backend collection endpoints for generic filtered queries instead of relying on `/state`.
2. Add job/status endpoints so `useAiAgent` can expose real progress streams.
3. Add a typed connector registry so GraphQL and automation adapters share one auth/config source.
