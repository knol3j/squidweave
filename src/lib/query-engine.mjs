import {
  getPathValue,
  buildPredicate,
  normalizeSort,
  applySort,
  applySelect,
} from "./query-utils.mjs";

function normalizeIncludes(includes) {
  if (!includes) {
    return [];
  }
  return Array.isArray(includes) ? includes : [includes];
}

export class QueryEngine {
  constructor({ store, schemaRegistry, connectors }) {
    this.store = store;
    this.schemaRegistry = schemaRegistry;
    this.connectors = connectors;
  }

  listCollections() {
    return this.schemaRegistry.list().map(descriptor => ({
      name: descriptor.name,
      source: descriptor.source,
      primaryKey: descriptor.primaryKey,
      metadata: descriptor.metadata || {},
    }));
  }

  getSchema(name) {
    const descriptor = this.schemaRegistry.get(name);
    if (!descriptor) {
      throw new Error(`Unknown collection: ${name}`);
    }
    return descriptor;
  }

  async resolveCollection(descriptor, query = {}) {
    if (descriptor.source?.type === "connector") {
      const connector = this.connectors[descriptor.source.connector];
      if (!connector) {
        throw new Error(`Unknown connector source: ${descriptor.source.connector}`);
      }
      const result = await connector.query({
        collection: descriptor.name,
        filter: query.filter || null,
        sort: query.sort || null,
        limit: query.limit,
        offset: query.offset,
        select: query.select || null,
      });
      return {
        items: Array.isArray(result.items) ? result.items : [],
        sourceStatus: {
          type: "connector",
          connector: descriptor.source.connector,
          mode: result.mode,
          accepted: result.accepted,
        },
      };
    }

    return {
      items: this.store.getCollection(descriptor.name),
      sourceStatus: {
        type: "store",
        live: Boolean(descriptor.source?.live),
      },
    };
  }

  async applyIncludes(items, descriptor, includes) {
    const specs = normalizeIncludes(includes);
    if (!specs.length) {
      return items;
    }

    const result = [];
    for (const item of items) {
      let nextItem = { ...item };
      for (const includeSpec of specs) {
        const relationName = typeof includeSpec === "string" ? includeSpec : includeSpec.relation;
        const relation = (descriptor.relations || []).find(entry => entry.name === relationName);
        if (!relation) {
          continue;
        }
        const relatedDescriptor = this.getSchema(relation.collection);
        const relatedCollection = (await this.resolveCollection(relatedDescriptor, includeSpec)).items;
        const localValue = getPathValue(item, relation.localField);
        let relatedItems = relatedCollection.filter(candidate => getPathValue(candidate, relation.foreignField) === localValue);
        if (includeSpec?.filter) {
          relatedItems = relatedItems.filter(buildPredicate(includeSpec.filter));
        }
        relatedItems = applySort(relatedItems, includeSpec?.sort);
        if (Number.isFinite(Number(includeSpec?.offset)) || Number.isFinite(Number(includeSpec?.limit))) {
          const offset = Math.max(0, Number(includeSpec?.offset) || 0);
          const limit = Number.isFinite(Number(includeSpec?.limit)) ? Math.max(0, Number(includeSpec.limit)) : relatedItems.length;
          relatedItems = relatedItems.slice(offset, offset + limit);
        }
        relatedItems = applySelect(relatedItems, includeSpec?.select);
        nextItem[includeSpec?.as || relation.name] = relation.type === "one" ? (relatedItems[0] || null) : relatedItems;
      }
      result.push(nextItem);
    }
    return result;
  }

  async execute(query = {}) {
    const descriptor = this.getSchema(query.collection);
    const resolved = await this.resolveCollection(descriptor, query);
    const predicate = buildPredicate(query.filter);
    const filtered = resolved.items.filter(predicate);
    const sorted = applySort(filtered, query.sort);
    const offset = Math.max(0, Number(query.offset) || 0);
    const limit = Number.isFinite(Number(query.limit)) ? Math.max(0, Number(query.limit)) : sorted.length;
    const paged = sorted.slice(offset, offset + limit);
    const included = await this.applyIncludes(paged, descriptor, query.include);
    const items = applySelect(included, query.select);

    return {
      collection: descriptor.name,
      count: items.length,
      totalCount: sorted.length,
      offset,
      limit,
      items,
      query: {
        filter: query.filter || null,
        sort: normalizeSort(query.sort),
        select: Array.isArray(query.select) ? query.select : null,
        include: normalizeIncludes(query.include),
      },
      schema: {
        name: descriptor.name,
        primaryKey: descriptor.primaryKey,
        fields: descriptor.fields || [],
        relations: descriptor.relations || [],
        source: descriptor.source || { type: "store" },
        metadata: descriptor.metadata || {},
      },
      sourceStatus: resolved.sourceStatus,
      executedAt: new Date().toISOString(),
    };
  }

  matchesChange(query = {}, change = {}) {
    const descriptor = this.schemaRegistry.get(query.collection);
    if (!descriptor) {
      return false;
    }
    const watchedCollections = new Set([descriptor.name]);
    for (const includeSpec of normalizeIncludes(query.include)) {
      const relationName = typeof includeSpec === "string" ? includeSpec : includeSpec.relation;
      const relation = (descriptor.relations || []).find(entry => entry.name === relationName);
      if (relation) {
        watchedCollections.add(relation.collection);
      }
    }
    return watchedCollections.has(change.collection);
  }
}
