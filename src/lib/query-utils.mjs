/**
 * query-utils.mjs — shared query filtering, sorting, projection utilities.
 *
 * Deduplicated from openclaw.mjs and query-engine.mjs.
 */

export function getPathValue(record, field) {
  return String(field || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => value?.[key], record);
}

export function compareValues(left, operator, right) {
  switch (operator) {
    case "eq":
      return left === right;
    case "ne":
      return left !== right;
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    case "in":
      return Array.isArray(right) && right.includes(left);
    case "contains":
      return Array.isArray(left)
        ? left.includes(right)
        : String(left || "")
            .toLowerCase()
            .includes(String(right || "").toLowerCase());
    case "startsWith":
      return String(left || "").startsWith(String(right || ""));
    case "endsWith":
      return String(left || "").endsWith(String(right || ""));
    default:
      throw new Error(`Unsupported query operator: ${operator}`);
  }
}

export function normalizeSort(sort) {
  if (!sort) {
    return [];
  }
  return Array.isArray(sort) ? sort : [sort];
}

export function buildPredicate(filter = {}) {
  if (!filter || typeof filter !== "object") {
    return () => true;
  }
  if (Array.isArray(filter.and) && filter.and.length) {
    const predicates = filter.and.map(buildPredicate);
    return (item) => predicates.every((predicate) => predicate(item));
  }
  if (Array.isArray(filter.or) && filter.or.length) {
    const predicates = filter.or.map(buildPredicate);
    return (item) => predicates.some((predicate) => predicate(item));
  }

  const { field, op = "eq", value } = filter;
  if (!field) {
    return () => true;
  }
  return (item) => compareValues(getPathValue(item, field), op, value);
}

export function applySort(items, sort) {
  const rules = normalizeSort(sort);
  if (!rules.length) {
    return items;
  }

  return [...items].sort((left, right) => {
    for (const rule of rules) {
      const field = rule?.field;
      if (!field) continue;
      const direction =
        String(rule.direction || "asc").toLowerCase() === "desc" ? -1 : 1;
      const a = getPathValue(left, field);
      const b = getPathValue(right, field);
      if (a === b) continue;
      if (a == null) return -1 * direction;
      if (b == null) return 1 * direction;
      return a > b ? direction : -1 * direction;
    }
    return 0;
  });
}

export function applySelect(items, fields) {
  if (!Array.isArray(fields) || !fields.length) {
    return items;
  }
  return items.map((item) => {
    const next = {};
    for (const field of fields) {
      next[field] = getPathValue(item, field);
    }
    return next;
  });
}

export function applySpec(items, spec = {}) {
  const filtered = items.filter(buildPredicate(spec.filter));
  const sorted = applySort(filtered, spec.sort);
  const offset = Math.max(0, Number(spec.offset) || 0);
  const limit = Number.isFinite(Number(spec.limit))
    ? Math.max(0, Number(spec.limit))
    : sorted.length;
  const paged = sorted.slice(offset, offset + limit);
  return {
    items: applySelect(paged, spec.select),
    totalCount: sorted.length,
  };
}
