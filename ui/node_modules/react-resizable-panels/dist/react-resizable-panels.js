"use client";
import { jsx as X, jsxs as Cn } from "react/jsx-runtime";
import { useId as Rn, useLayoutEffect as Qt, useEffect as He, useRef as B, useCallback as re, createContext as en, useContext as tn, useState as he, useMemo as Pe, useImperativeHandle as dt, useSyncExternalStore as Qe, Children as En, isValidElement as nn } from "react";
function De(e) {
  const t = Rn();
  return `${e ?? t}`;
}
const ne = typeof window < "u" ? Qt : He;
function ye(e) {
  const t = B(e);
  return ne(() => {
    t.current = e;
  }, [e]), re(
    (...n) => t.current?.(...n),
    [t]
  );
}
function Ve(...e) {
  return ye((t) => {
    e.forEach((n) => {
      if (n)
        switch (typeof n) {
          case "function": {
            n(t);
            break;
          }
          case "object": {
            n.current = t;
            break;
          }
        }
    });
  });
}
function at(e, t) {
  return t ? e * 2 + 1 : e + 1;
}
function Mn(e, t) {
  return t ? e * 2 - 1 : e;
}
function zt(e, t, n) {
  const o = at(e, n);
  return t === void 0 ? `${o} / -1` : `${o} / span ${Mn(t, n)}`;
}
function Pn(e) {
  return `${e * 2} / span 1`;
}
function Tn({
  crossCount: e,
  crossSpan: t,
  crossStart: n,
  hasGutters: o
}) {
  const r = t === void 0 ? e : n + t;
  if (n === 0 && r === e)
    return "1 / -1";
  let i = at(n, o), s = at(r - 1, o) + 1;
  return o && (n > 0 && i--, r < e && s++), `${i} / ${s}`;
}
function ft(e, t) {
  return Number.isInteger(e) && e >= 1 && e < t;
}
function O(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
const on = en(null);
function rn() {
  const e = tn(on);
  return O(
    e,
    "Grid Context not found; did you render a Cell or Gridline outside of a Grid?"
  ), e;
}
function Dn({
  children: e,
  className: t,
  column: n,
  columnSpan: o = 1,
  elementRef: r,
  id: i,
  row: s,
  rowSpan: c = 1,
  style: a,
  ...u
}) {
  const l = De(i), { gutters: d, registerCell: g } = rn(), p = B(null), m = Ve(p, r);
  return ne(() => {
    const f = p.current;
    if (f !== null)
      return g({
        column: n,
        columnSpan: o,
        element: f,
        id: l,
        row: s,
        rowSpan: c
      });
  }, [n, o, l, g, s, c]), /* @__PURE__ */ X(
    "div",
    {
      ...u,
      className: t,
      "data-cell": !0,
      "data-testid": l,
      id: l,
      ref: m,
      style: {
        overflow: "auto",
        ...a,
        // Allow cells to shrink smaller than their content
        minHeight: 0,
        minWidth: 0,
        gridColumn: zt(n, o, d.column),
        gridRow: zt(s, c, d.row)
      },
      children: e
    }
  );
}
Dn.displayName = "Cell";
let Ye;
function kn() {
  return Ye === void 0 && (typeof matchMedia == "function" ? Ye = !!matchMedia("(pointer:coarse)").matches : Ye = !1), Ye;
}
function ct({
  expandHitTargets: e,
  axis: t,
  rect: n
}) {
  const o = e ? kn() ? t.resizeTargetMinimumSize.coarse : t.resizeTargetMinimumSize.fine : 0;
  if (n.width < o) {
    const r = o - n.width;
    n = new DOMRect(
      n.x - r / 2,
      n.y,
      n.width + r,
      n.height
    );
  }
  if (n.height < o) {
    const r = o - n.height;
    n = new DOMRect(
      n.x,
      n.y - r / 2,
      n.width,
      n.height + r
    );
  }
  return n;
}
function It({
  axis: e,
  cells: t,
  index: n,
  rect: o
}) {
  let r = [o];
  for (const i of t) {
    const s = e === "column" ? i.column : i.row, c = e === "column" ? i.columnSpan : i.rowSpan;
    if (s >= n || s + c <= n)
      continue;
    const a = i.element.getBoundingClientRect(), u = e === "column" ? a.top : a.left, l = e === "column" ? a.bottom : a.right;
    l <= u || (r = r.flatMap((d) => {
      const g = e === "column" ? d.top : d.left, p = e === "column" ? d.bottom : d.right;
      if (u >= p || l <= g)
        return [d];
      const m = [], f = (y, h) => {
        m.push(
          e === "column" ? new DOMRect(d.x, y, d.width, h - y) : new DOMRect(y, d.y, h - y, d.height)
        );
      };
      return g < u && f(g, u), p > l && f(l, p), m;
    }));
  }
  return r;
}
function An({
  axis: e,
  cells: t,
  crossTrackCount: n,
  expandHitTargets: o,
  resizeAxis: r,
  axisSize: i,
  includeDisabled: s,
  separatorPlacements: c
}) {
  const { items: a, separators: u } = r, l = a.length;
  let d = -1, g = -1, p = 0;
  if (a.forEach((b, w) => {
    b.constraintProps.disabled || (p++, d === -1 && (d = w), g = w);
  }), !s && p < 2)
    return [];
  const m = (b) => s || b > d && b <= g, f = [], y = (b, w, v) => ({
    axis: r,
    axisSize: i,
    items: [a[b - 1], a[b]],
    rect: w,
    separator: v
  }), h = (b, w) => {
    let v;
    for (const T of t) {
      const A = e === "column" ? T.row : T.column, E = e === "column" ? T.rowSpan : T.columnSpan;
      if (w === "start" ? A === b : A + E - 1 === b) {
        const D = T.element.getBoundingClientRect();
        if (w === "start") {
          const C = e === "column" ? D.top : D.left;
          v = v === void 0 ? C : Math.min(v, C);
        } else {
          const C = e === "column" ? D.bottom : D.right;
          v = v === void 0 ? C : Math.max(v, C);
        }
      }
    }
    return v;
  }, S = /* @__PURE__ */ new Set();
  for (const b of u) {
    const w = c.get(b);
    if (!w || w.index < 1 || w.index >= l || (S.add(w.index), !s && (b.disabled || b.element.hasAttribute("aria-disabled"))) || !m(w.index))
      continue;
    let v = b.element.getBoundingClientRect();
    const { crossSpan: T, crossStart: A } = w, E = T === void 0 ? n : A + T;
    let D = e === "column" ? v.top : v.left, C = e === "column" ? v.bottom : v.right;
    if (A > 0) {
      const I = h(A - 1, "end");
      I !== void 0 && I < D && (D = I);
    }
    if (E < n) {
      const I = h(E, "start");
      I !== void 0 && I > C && (C = I);
    }
    v = e === "column" ? new DOMRect(v.x, D, v.width, C - D) : new DOMRect(D, v.y, C - D, v.height), v = ct({ expandHitTargets: o, axis: r, rect: v }), s ? f.push(y(w.index, v, b)) : It({
      axis: e,
      cells: t,
      index: w.index,
      rect: v
    }).forEach((I) => {
      f.push(y(w.index, I, b));
    });
  }
  const z = (b, w) => {
    It({
      axis: e,
      cells: t,
      index: b,
      rect: ct({ expandHitTargets: o, axis: r, rect: w })
    }).forEach((v) => {
      f.push(y(b, v));
    });
  }, x = Array.from(
    { length: n },
    () => new Array(l)
  );
  for (const b of t) {
    const [w, v, T, A] = e === "column" ? [b.column, b.columnSpan, b.row, b.rowSpan] : [b.row, b.rowSpan, b.column, b.columnSpan];
    for (let E = Math.max(0, T); E < Math.min(n, T + A); E++)
      for (let D = Math.max(0, w); D < Math.min(l, w + v); D++)
        x[E][D] ??= b;
  }
  const R = /* @__PURE__ */ new Map(), N = (b) => {
    let w = R.get(b);
    if (!w) {
      const v = b.element.getBoundingClientRect();
      w = e === "column" ? {
        crossEnd: v.bottom,
        crossStart: v.top,
        end: v.right,
        start: v.left
      } : {
        crossEnd: v.right,
        crossStart: v.left,
        end: v.bottom,
        start: v.top
      }, R.set(b, w);
    }
    return w;
  }, $ = ({ crossEnd: b, crossStart: w, end: v, start: T }) => e === "column" ? new DOMRect(T, w, v - T, b - w) : new DOMRect(w, T, b - w, v - T);
  for (let b = 1; b < l; b++) {
    if (S.has(b) || !m(b))
      continue;
    let w;
    for (let v = 0; v < n; v++) {
      const T = x[v][b - 1], A = x[v][b];
      let E;
      if ((T || A) && T !== A) {
        const D = T ? N(T) : void 0, C = A ? N(A) : void 0, I = D?.end ?? C.start, M = C?.start ?? D.end, q = Math.max(
          D?.crossStart ?? -1 / 0,
          C?.crossStart ?? -1 / 0
        ), J = Math.min(
          D?.crossEnd ?? 1 / 0,
          C?.crossEnd ?? 1 / 0
        );
        E = {
          crossEnd: Math.max(q, J),
          crossStart: q,
          end: Math.max(I, M),
          start: Math.min(I, M)
        };
      }
      E ? w = w ? {
        crossEnd: Math.max(w.crossEnd, E.crossEnd),
        crossStart: Math.min(w.crossStart, E.crossStart),
        end: Math.max(w.end, E.end),
        start: Math.min(w.start, E.start)
      } : E : w && (z(b, $(w)), w = void 0);
    }
    w && z(b, $(w));
  }
  return f;
}
function ce(e) {
  const t = parseFloat(e ?? "");
  return Number.isFinite(t) ? t : 0;
}
function $n({
  axis: e,
  element: t,
  gutterSizes: n,
  hasGutters: o,
  layout: r,
  trackIds: i
}) {
  const s = i.length, c = o ? s * 2 - 1 : s, a = t.ownerDocument.defaultView?.getComputedStyle(t), u = e === "column" ? a?.gridTemplateColumns : a?.gridTemplateRows;
  if (u) {
    const f = u.trim().split(/\s+/);
    if (f.length === c && f.every((y) => /^-?[\d.]+px$/.test(y))) {
      const y = i.map(
        (h, S) => ce(f[o ? S * 2 : S])
      );
      return {
        availableSize: y.reduce((h, S) => h + S, 0),
        trackSizes: y
      };
    }
  }
  const l = e === "column" ? t.offsetWidth : t.offsetHeight, d = e === "column" ? ce(a?.paddingLeft) + ce(a?.paddingRight) + ce(a?.borderLeftWidth) + ce(a?.borderRightWidth) : ce(a?.paddingTop) + ce(a?.paddingBottom) + ce(a?.borderTopWidth) + ce(a?.borderBottomWidth), g = ce(e === "column" ? a?.columnGap : a?.rowGap), p = n.reduce((f, y) => f + y, 0), m = Math.max(
    0,
    l - d - g * Math.max(0, c - 1) - p
  );
  return {
    availableSize: m,
    trackSizes: i.map(
      (f) => r && r[f] !== void 0 ? r[f] / 100 * m : m / s
    )
  };
}
function sn(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
class an {
  #e = {};
  addListener(t, n) {
    const o = this.#e[t];
    return o === void 0 ? this.#e[t] = [n] : o.includes(n) || o.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const o = this.#e[t];
    if (o !== void 0) {
      if (o.length === 1) {
        o[0].call(null, n);
        return;
      }
      let r;
      const i = Array.from(o);
      for (let s = 0; s < i.length; s++) {
        const c = i[s];
        try {
          c.call(null, n);
        } catch (a) {
          r ??= { error: a };
        }
      }
      if (r)
        throw r.error;
    }
  }
  removeAllListeners() {
    this.#e = {};
  }
  removeListener(t, n) {
    const o = this.#e[t];
    if (o !== void 0) {
      const r = o.indexOf(n);
      r >= 0 && o.splice(r, 1);
    }
  }
}
let V = {
  cursorFlags: 0,
  state: "inactive"
};
const mt = new an();
function ie() {
  return V;
}
function pt(e) {
  return mt.addListener("change", e);
}
function On(e, t = [], n, o = !1) {
  const r = V, i = { ...V };
  i.cursorFlags = e, i.state === "active" && (i.didPointerMove ||= o, i.previews = t, n && (i.previewLayoutMap = n)), V = i, mt.emit("change", {
    prev: r,
    next: i
  });
}
function de(e) {
  const t = V;
  V = e, t.state === "active" && e.state !== "active" && t.didPointerMove && t.hitRegions.forEach(({ separator: n }) => {
    n && n.element.ownerDocument.activeElement === n.element && n.element.blur();
  }), mt.emit("change", {
    prev: t,
    next: e
  });
}
function Nn(e) {
  V.state !== "active" || !V.previews.some((t) => t.separator === e) || de({
    ...V,
    previews: V.previews.map(
      (t) => t.separator === e ? { ...t } : t
    )
  });
}
function Gn(e) {
  if (V.state === "inactive")
    return;
  const t = V.hitRegions.filter((o) => o.axis !== e), n = V.state === "active" && V.previews.some((o) => o.axis === e);
  if (!(t.length === V.hitRegions.length && !n))
    if (t.length === 0)
      de({ cursorFlags: 0, state: "inactive" });
    else if (V.state === "active") {
      const o = new Map(V.initialLayoutMap), r = new Map(V.previewLayoutMap);
      o.delete(e), r.delete(e), de({
        ...V,
        cursorFlags: 0,
        hitRegions: t,
        initialLayoutMap: o,
        previewLayoutMap: r,
        previews: V.previews.filter((i) => i.axis !== e)
      });
    } else
      de({ ...V, hitRegions: t });
}
const Fn = (e) => e, st = () => {
}, cn = 1, ln = 2, un = 4, dn = 8, Lt = 3, Ct = 12;
let Xe;
function Rt() {
  return Xe === void 0 && (Xe = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (Xe = !0)), Xe;
}
function _n({
  cursorFlags: e,
  axes: t,
  state: n
}) {
  let o = 0, r = 0;
  switch (n) {
    case "active":
    case "hover":
      t.forEach((i) => {
        if (!i.mutableState.disableCursor)
          switch (i.orientation) {
            case "horizontal": {
              o++;
              break;
            }
            case "vertical": {
              r++;
              break;
            }
          }
      });
  }
  if (!(o === 0 && r === 0)) {
    switch (n) {
      case "active": {
        if (e && Rt()) {
          const i = (e & cn) !== 0, s = (e & ln) !== 0, c = (e & un) !== 0, a = (e & dn) !== 0;
          if (i)
            return c ? "se-resize" : a ? "ne-resize" : "e-resize";
          if (s)
            return c ? "sw-resize" : a ? "nw-resize" : "w-resize";
          if (c)
            return "s-resize";
          if (a)
            return "n-resize";
        }
        break;
      }
    }
    return Rt() ? o > 0 && r > 0 ? "move" : o > 0 ? "ew-resize" : "ns-resize" : o > 0 && r > 0 ? "grab" : o > 0 ? "col-resize" : "row-resize";
  }
}
const Et = /* @__PURE__ */ new WeakMap();
function Mt(e) {
  if (!e.defaultView || !e.adoptedStyleSheets)
    return;
  let { prevStyle: t, styleSheet: n } = Et.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  let o = ie();
  switch (o.state !== "inactive" && o.ownerDocument !== e && (o = { cursorFlags: 0, state: "inactive" }), o.state) {
    case "active":
    case "hover": {
      const r = _n({
        cursorFlags: o.cursorFlags,
        axes: o.hitRegions.map((s) => s.axis),
        state: o.state
      }), i = `*, *:hover {cursor: ${r} !important; }`;
      if (t === i)
        return;
      t = i, r ? n.cssRules.length === 0 ? n.insertRule(i) : n.replaceSync(i) : n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
    case "inactive": {
      t = void 0, n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
  }
  Et.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
function Pt(e) {
  return e.state === "inactive" ? void 0 : e.ownerDocument;
}
function Bn({
  next: e,
  prev: t
}) {
  const n = Pt(t), o = Pt(e);
  n && n !== o && Mt(n), o && Mt(o);
}
function Te({
  axis: e
}) {
  const { layoutStrategy: t, orientation: n, items: o } = e;
  return t ? t.calculateAvailableSize() : o.reduce((r, i) => (r += n === "horizontal" ? i.element.offsetWidth : i.element.offsetHeight, r), 0);
}
function ht(e, t) {
  const n = e.compareDocumentPosition(t);
  return n & Node.DOCUMENT_POSITION_DISCONNECTED ? 0 : n & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : n & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
}
function Ge(e, t) {
  return Array.from(t).sort((n, o) => {
    const r = e === "horizontal" ? qn(n, o) : Hn(n, o);
    return r !== 0 ? r : ht(n.element, o.element);
  });
}
function qn(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function Hn(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function lt(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function fn(e, t) {
  return {
    x: e.x >= t.left && e.x <= t.right ? 0 : Math.min(
      Math.abs(e.x - t.left),
      Math.abs(e.x - t.right)
    ),
    y: e.y >= t.top && e.y <= t.bottom ? 0 : Math.min(
      Math.abs(e.y - t.top),
      Math.abs(e.y - t.bottom)
    )
  };
}
function Vn({
  orientation: e,
  rects: t,
  targetRect: n
}) {
  const o = {
    x: n.x + n.width / 2,
    y: n.y + n.height / 2
  };
  let r, i = Number.MAX_VALUE;
  for (const s of t) {
    const { x: c, y: a } = fn(o, s), u = e === "horizontal" ? c : a;
    u < i && (i = u, r = s);
  }
  return O(r, "No rect found"), r;
}
function gt({
  expandHitTargets: e = !0,
  axis: t,
  includeDisabled: n = !1
}) {
  if (t.layoutStrategy)
    return t.layoutStrategy.calculateHitRegions({
      expandHitTargets: e,
      axis: t,
      includeDisabled: n
    });
  const { element: o, orientation: r, items: i, separators: s } = t, c = Ge(
    r,
    Array.from(o.children).filter(lt).filter((h) => !h.hasAttribute("data-resize-preview")).map((h) => ({ element: h }))
  ).map(({ element: h }) => h), a = [];
  let u = !1, l = !1, d = -1, g, p = -1, m = 0, f, y = [];
  {
    let h = -1;
    for (const S of c)
      S.hasAttribute("data-panel") && (h++, S.hasAttribute("data-disabled") || (m++, d === -1 && (d = h), p = h));
  }
  if (n || m > 1) {
    let h = -1;
    for (const S of c)
      if (S.hasAttribute("data-panel")) {
        h++;
        const z = i.find(
          (x) => x.element === S
        );
        if (z) {
          if (f) {
            const x = f.element.getBoundingClientRect(), R = S.getBoundingClientRect();
            let N;
            if (l) {
              const $ = r === "horizontal" ? new DOMRect(
                x.right,
                x.top,
                0,
                x.height
              ) : new DOMRect(
                x.left,
                x.bottom,
                x.width,
                0
              ), b = r === "horizontal" ? new DOMRect(R.left, R.top, 0, R.height) : new DOMRect(R.left, R.top, R.width, 0);
              switch (y.length) {
                case 0: {
                  N = [
                    $,
                    b
                  ];
                  break;
                }
                case 1: {
                  const w = y[0], v = Vn({
                    orientation: r,
                    rects: [x, R],
                    targetRect: w.element.getBoundingClientRect()
                  });
                  N = [
                    w,
                    v === x ? b : $
                  ];
                  break;
                }
                default: {
                  N = y;
                  break;
                }
              }
            } else
              y.length ? N = y : N = [
                r === "horizontal" ? new DOMRect(
                  x.right,
                  R.top,
                  R.left - x.right,
                  R.height
                ) : new DOMRect(
                  R.left,
                  x.bottom,
                  R.width,
                  R.top - x.bottom
                )
              ];
            for (const $ of N) {
              const b = ct({
                expandHitTargets: e,
                axis: t,
                rect: "width" in $ ? $ : $.element.getBoundingClientRect()
              }), w = h <= d || h > p;
              (n || !u && !w) && (g ??= Te({ axis: t }), a.push({
                axis: t,
                axisSize: g,
                items: [f, z],
                separator: "width" in $ ? void 0 : $,
                rect: b
              })), u = !1;
            }
          }
          l = !1, f = z, y = [];
        }
      } else if (S.hasAttribute("data-separator")) {
        S.ariaDisabled !== null && (u = !0);
        const z = s.find(
          (x) => x.element === S
        );
        z ? y.push(z) : (f = void 0, y = []);
      } else
        l = !0;
  }
  return a;
}
function jn(e, t) {
  const n = getComputedStyle(e), o = parseFloat(n.fontSize);
  return t * o;
}
function Un(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), o = parseFloat(n.fontSize);
  return t * o;
}
function Wn(e) {
  return e / 100 * window.innerHeight;
}
function Yn(e) {
  return e / 100 * window.innerWidth;
}
function Ce({
  axisSize: e,
  itemElement: t,
  styleProp: n
}) {
  let o;
  const [r, i] = sn(n);
  switch (i) {
    case "%": {
      o = r / 100 * e;
      break;
    }
    case "px": {
      o = r;
      break;
    }
    case "rem": {
      o = Un(t, r);
      break;
    }
    case "em": {
      o = jn(t, r);
      break;
    }
    case "vh": {
      o = Wn(r);
      break;
    }
    case "vw": {
      o = Yn(r);
      break;
    }
  }
  return o;
}
function K(e) {
  return parseFloat(e.toFixed(3));
}
function ut(e) {
  const { items: t } = e, n = Te({ axis: e });
  return n === 0 ? t.map((o) => ({
    groupResizeBehavior: o.constraintProps.groupResizeBehavior,
    collapsedSize: 0,
    collapsible: o.constraintProps.collapsible === !0,
    defaultSize: void 0,
    disabled: o.constraintProps.disabled,
    minSize: 0,
    maxSize: 100,
    itemId: o.id
  })) : t.map((o) => {
    const { element: r, constraintProps: i } = o;
    let s = 0;
    if (i.collapsedSize !== void 0) {
      const d = Ce({
        axisSize: n,
        itemElement: r,
        styleProp: i.collapsedSize
      });
      s = K(d / n * 100);
    }
    let c;
    if (i.collapsedThreshold !== void 0) {
      const d = Ce({
        axisSize: n,
        itemElement: r,
        styleProp: i.collapsedThreshold
      });
      c = K(d / n * 100);
    }
    let a;
    if (i.defaultSize !== void 0) {
      const d = Ce({
        axisSize: n,
        itemElement: r,
        styleProp: i.defaultSize
      });
      a = K(d / n * 100);
    }
    let u = 0;
    if (i.minSize !== void 0) {
      const d = Ce({
        axisSize: n,
        itemElement: r,
        styleProp: i.minSize
      });
      u = K(d / n * 100);
    }
    let l = 100;
    if (i.maxSize !== void 0) {
      const d = Ce({
        axisSize: n,
        itemElement: r,
        styleProp: i.maxSize
      });
      l = K(d / n * 100);
    }
    return {
      groupResizeBehavior: i.groupResizeBehavior,
      collapsedSize: s,
      collapsedThreshold: c,
      collapsible: i.collapsible === !0,
      defaultSize: a,
      disabled: i.disabled,
      minSize: u,
      maxSize: l,
      itemId: o.id
    };
  });
}
let ue = /* @__PURE__ */ new Map();
const yt = new an();
let Fe = 0;
const Ke = [];
let Je;
function et() {
  Fe++;
}
function St() {
  for (let e = 0; e < Ke.length; e++)
    try {
      yt.emit("axisChange", Ke[e]);
    } catch (t) {
      Je ??= { error: t };
    }
  Ke.length = 0;
}
function tt() {
  if (Fe === 1 && St(), Fe--, Fe === 0 && Je) {
    const { error: e } = Je;
    throw Je = void 0, e;
  }
}
function Xn(e) {
  ue = new Map(ue), ue.delete(e);
}
function Ee(e, t) {
  for (const [n] of ue)
    if (n.id === e)
      return n;
}
function ae(e, t) {
  for (const [n, o] of ue)
    if (n.id === e)
      return o;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function ge() {
  return ue;
}
function Be(e, t) {
  return yt.addListener("axisChange", (n) => {
    n.axis.id === e && t(n);
  });
}
function fe(e, t, n) {
  const o = ue.get(e);
  ue = new Map(ue), ue.set(e, t);
  const r = {
    axis: e,
    isUserInteraction: n?.isUserInteraction === !0,
    prev: o,
    next: t
  };
  Fe > 0 ? Ke.push(r) : yt.emit("axisChange", r);
}
function mn(e, { pointerId: t, pointerType: n }) {
  return t === e.pointerId || // There is only one pen, but it may be assigned a new pointerId each time it comes into range
  n === "pen" && e.pointerType === "pen";
}
function nt(e, t, n = {}) {
  return e.ownerDocument === t && (n.pointerId === void 0 || mn(e, n));
}
function Kn(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function Y(e, t, n = 0) {
  return Math.abs(K(e) - K(t)) <= n;
}
function le(e, t) {
  return Y(e, t) ? 0 : e > t ? 1 : -1;
}
function Me({
  overrideDisabledItems: e,
  itemConstraints: t,
  prevSize: n,
  size: o
}) {
  const {
    collapsedSize: r = 0,
    collapsedThreshold: i,
    collapsible: s,
    disabled: c,
    maxSize: a = 100,
    minSize: u = 0
  } = t;
  if (c && !e)
    return n;
  if (le(o, u) < 0)
    if (s) {
      const l = i ?? (u - r) / 2, d = le(n, r) <= 0, g = d ? r + l : u - l, p = le(o, g);
      le(o, r) <= 0 || p < 0 || i !== void 0 && d && p === 0 ? o = r : o = u;
    } else
      o = u;
  return o = Math.min(a, o), o = K(o), o;
}
function qe({
  delta: e,
  initialLayout: t,
  itemConstraints: n,
  pivotIndices: o,
  prevLayout: r,
  trigger: i
}) {
  if (Y(e, 0))
    return t;
  const s = i === "imperative-api", c = n.map(
    ({ itemId: m }) => t[m]
  ), a = n.map(
    ({ itemId: m }) => r[m]
  ), u = [...c], [l, d] = o;
  O(l != null, "Invalid first pivot index"), O(d != null, "Invalid second pivot index");
  let g = 0;
  switch (i) {
    case "keyboard": {
      {
        const m = e < 0 ? d : l, f = n[m];
        O(
          f,
          `Panel constraints not found for index ${m}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: h,
          minSize: S = 0
        } = f;
        if (h) {
          const z = c[m];
          if (O(
            z != null,
            `Previous layout not found for panel index ${m}`
          ), Y(z, y)) {
            const x = S - z;
            le(x, Math.abs(e)) > 0 && (e = e < 0 ? 0 - x : x);
          }
        }
      }
      {
        const m = e < 0 ? l : d, f = n[m];
        O(
          f,
          `No panel constraints found for index ${m}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: h,
          minSize: S = 0
        } = f;
        if (h) {
          const z = c[m];
          if (O(
            z != null,
            `Previous layout not found for panel index ${m}`
          ), Y(z, S)) {
            const x = z - y;
            le(x, Math.abs(e)) > 0 && (e = e < 0 ? 0 - x : x);
          }
        }
      }
      break;
    }
    default: {
      const m = e < 0 ? d : l, f = n[m];
      O(
        f,
        `Panel constraints not found for index ${m}`
      );
      const y = c[m], { collapsedSize: h, collapsedThreshold: S, collapsible: z, minSize: x } = f;
      if (z && le(y, x) < 0) {
        const R = x - h, N = S ?? R / 2, $ = y + Math.abs(e);
        if (le($, x) < 0) {
          const b = le(Math.abs(e), N), w = S === void 0 && e < 0;
          b > 0 || b === 0 && w ? e = e < 0 ? -R : R : e = 0;
        }
      }
      break;
    }
  }
  {
    const m = e < 0 ? 1 : -1;
    let f = e < 0 ? d : l, y = 0;
    for (; ; ) {
      const S = c[f];
      O(
        S != null,
        `Previous layout not found for panel index ${f}`
      );
      const x = Me({
        overrideDisabledItems: s,
        itemConstraints: n[f],
        prevSize: S,
        size: 100
      }) - S;
      if (y += x, f += m, f < 0 || f >= n.length)
        break;
    }
    const h = Math.min(Math.abs(e), Math.abs(y));
    e = e < 0 ? 0 - h : h;
  }
  {
    let f = e < 0 ? l : d;
    for (; f >= 0 && f < n.length; ) {
      const y = Math.abs(e) - Math.abs(g), h = c[f];
      O(
        h != null,
        `Previous layout not found for panel index ${f}`
      );
      const S = h - y, z = Me({
        overrideDisabledItems: s,
        itemConstraints: n[f],
        prevSize: h,
        size: S
      });
      if (!Y(h, z) && (g += h - z, u[f] = z, g.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? f-- : f++;
    }
  }
  if (Kn(a, u))
    return r;
  {
    const m = e < 0 ? d : l, f = c[m];
    O(
      f != null,
      `Previous layout not found for panel index ${m}`
    );
    const y = f + g, h = Me({
      overrideDisabledItems: s,
      itemConstraints: n[m],
      prevSize: f,
      size: y
    });
    if (u[m] = h, !Y(h, y)) {
      let S = y - h, x = e < 0 ? d : l;
      for (; x >= 0 && x < n.length; ) {
        const R = u[x];
        O(
          R != null,
          `Previous layout not found for panel index ${x}`
        );
        const N = R + S, $ = Me({
          overrideDisabledItems: s,
          itemConstraints: n[x],
          prevSize: R,
          size: N
        });
        if (Y(R, $) || (S -= $ - R, u[x] = $), Y(S, 0))
          break;
        e > 0 ? x-- : x++;
      }
    }
  }
  const p = Object.values(u).reduce(
    (m, f) => f + m,
    0
  );
  return Y(p, 100, 0.1) ? u.reduce((m, f, y) => (m[n[y].itemId] = f, m), {}) : r;
}
function se(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || le(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function vt(e) {
  et();
  try {
    Jn(e);
  } finally {
    tt();
  }
}
function Jn({
  commit: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: o,
  mountedAxes: r,
  pointerDownAtPoint: i,
  prevCursorFlags: s
}) {
  let c = 0;
  const a = ie();
  let u = a.state === "active" ? a.previews : [];
  const l = new Map(
    a.state === "active" ? a.previewLayoutMap : void 0
  );
  n.forEach((p) => {
    const { axis: m, axisSize: f } = p, { orientation: y, items: h } = m;
    if (e && m.resizePreviewMode !== "separator")
      return;
    const { disableCursor: S } = m.mutableState;
    let z = 0;
    i ? y === "horizontal" ? z = (t.clientX - i.x) / f * 100 : z = (t.clientY - i.y) / f * 100 : y === "horizontal" ? z = t.clientX < 0 ? -100 : 100 : z = t.clientY < 0 ? -100 : 100;
    const x = o.get(m), R = r.get(m);
    if (!x || !R)
      return;
    const {
      defaultLayoutDeferred: N,
      derivedItemConstraints: $,
      axisSize: b,
      layout: w,
      separatorToItems: v
    } = R;
    if ($ && w && v) {
      const T = m.resizePreviewMode === "separator" ? l.get(m) ?? w : w, A = qe({
        delta: z,
        initialLayout: x,
        itemConstraints: $,
        pivotIndices: p.items.map((E) => h.indexOf(E)),
        prevLayout: T,
        trigger: "mouse-or-touch"
      });
      if (m.resizePreviewMode === "separator" && !e && !se(A, T)) {
        l.set(m, A);
        let E = 0;
        const D = h.map((C) => (E += A[C.id] - x[C.id], E * (f / 100)));
        u = u.map((C) => {
          if (C.axis !== m)
            return C;
          const I = D[C.itemIndex];
          return I === C.offset ? C : { ...C, offset: I };
        });
      }
      if (se(A, T) && z !== 0 && !S)
        switch (y) {
          case "horizontal": {
            c |= z < 0 ? cn : ln;
            break;
          }
          case "vertical": {
            c |= z < 0 ? un : dn;
            break;
          }
        }
      (m.resizePreviewMode !== "separator" || e) && !se(A, w) && fe(p.axis, {
        defaultLayoutDeferred: N,
        derivedItemConstraints: $,
        axisSize: b,
        layout: A,
        requestedAxisSize: b,
        requestedLayout: A,
        separatorToItems: v
      });
    }
  });
  let d = 0;
  t.movementX === 0 ? d |= s & Lt : d |= c & Lt, t.movementY === 0 ? d |= s & Ct : d |= c & Ct;
  const g = a.state === "active" && (t.clientX !== a.pointerDownAtPoint.x || t.clientY !== a.pointerDownAtPoint.y);
  On(d, u, l, g);
}
function pn(e, t) {
  const n = ie();
  if (n.state !== "active" || !nt(n, e, t))
    return;
  const o = ge();
  et();
  try {
    vt({
      commit: !0,
      event: t,
      hitRegions: n.hitRegions,
      initialLayoutMap: n.initialLayoutMap,
      mountedAxes: o,
      pointerDownAtPoint: n.pointerDownAtPoint,
      prevCursorFlags: n.cursorFlags
    }), St(), de({
      cursorFlags: 0,
      state: "inactive"
    }), n.hitRegions.length > 0 && (t.preventDefault?.(), n.hitRegions.forEach((r) => {
      if (!o.has(r.axis))
        return;
      const i = ae(r.axis.id, !0);
      fe(r.axis, i, {
        isUserInteraction: !0
      });
    }));
  } finally {
    tt();
  }
}
function Tt(e) {
  if (e.defaultPrevented)
    return;
  const { clientX: t, clientY: n, movementX: o, movementY: r } = e;
  pn(e.currentTarget, {
    clientX: t,
    clientY: n,
    movementX: o,
    movementY: r
  });
}
function Zn(e, t, n) {
  let o, r = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const i of t) {
    const s = fn(n, i.rect);
    switch (e) {
      case "horizontal": {
        (s.x < r.x || s.x === r.x && s.y <= r.y) && (o = i, r = s);
        break;
      }
      case "vertical": {
        (s.y < r.y || s.y === r.y && s.x <= r.x) && (o = i, r = s);
        break;
      }
    }
  }
  return o ? {
    distance: r,
    hitRegion: o
  } : void 0;
}
function Qn(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function eo(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: At(e),
    b: At(t)
  };
  let o;
  for (; n.a.at(-1) === n.b.at(-1); )
    o = n.a.pop(), n.b.pop();
  O(
    o,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const r = {
    a: kt(Dt(n.a)),
    b: kt(Dt(n.b))
  };
  if (r.a === r.b) {
    const i = o.childNodes, s = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let c = i.length;
    for (; c--; ) {
      const a = i[c];
      if (a === s.a) return 1;
      if (a === s.b) return -1;
    }
  }
  return Math.sign(r.a - r.b);
}
const to = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function no(e) {
  const t = getComputedStyle(hn(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function oo(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || no(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || to.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function Dt(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (O(n, "Missing node"), oo(n)) return n;
  }
  return null;
}
function kt(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function At(e) {
  const t = [];
  for (; e; )
    t.push(e), e = hn(e);
  return t;
}
function hn(e) {
  const { parentNode: t } = e;
  return Qn(t) ? t.host : t;
}
function ro(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function io(e) {
  try {
    return e.matches(":modal");
  } catch {
    return !1;
  }
}
function so({
  axisElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (lt(n)) {
    const o = n.closest("dialog");
    if (o && !o.contains(e) && io(o))
      return !1;
  }
  if (!lt(n) || n.contains(e) || e.contains(n))
    return !0;
  if (eo(n, e) > 0) {
    let o = n;
    for (; o; ) {
      if (o.contains(e))
        return !0;
      if (ro(o.getBoundingClientRect(), t))
        return !1;
      o = o.parentElement;
    }
  }
  return !0;
}
function bt(e, t, n) {
  const o = [];
  return t.forEach((r, i) => {
    if (i.disabled || i.element.ownerDocument !== n)
      return;
    const s = gt({ axis: i }), c = Zn(i.orientation, s, {
      x: e.clientX,
      y: e.clientY
    });
    c && c.distance.x <= 0 && c.distance.y <= 0 && so({
      axisElement: i.element,
      hitRegion: c.hitRegion.rect,
      pointerEventTarget: e.target
    }) && o.push(c.hitRegion);
  }), o;
}
function Se({
  layout: e,
  itemConstraints: t
}) {
  const n = t.map(({ itemId: s }) => e[s]), o = [...n], r = o.reduce(
    (s, c) => s + c,
    0
  );
  if (Object.keys(e).length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${Object.values(e).map((s) => `${s}%`).join(", ")}`
    );
  if (!Y(r, 100) && o.length > 0)
    for (let s = 0; s < t.length; s++) {
      const c = o[s];
      O(c != null, `No layout data found for index ${s}`);
      const a = 100 / r * c;
      o[s] = a;
    }
  let i = 0;
  for (let s = 0; s < t.length; s++) {
    const c = n[s];
    O(c != null, `No layout data found for index ${s}`);
    const a = o[s];
    O(a != null, `No layout data found for index ${s}`);
    const u = Me({
      overrideDisabledItems: !0,
      itemConstraints: t[s],
      prevSize: c,
      size: a
    });
    a != u && (i += a - u, o[s] = u);
  }
  if (!Y(i, 0))
    for (let s = 0; s < t.length; s++) {
      const c = o[s];
      O(c != null, `No layout data found for index ${s}`);
      const a = c + i, u = Me({
        overrideDisabledItems: !0,
        itemConstraints: t[s],
        prevSize: c,
        size: a
      });
      if (c !== u && (i -= u - c, o[s] = u, Y(i, 0)))
        break;
    }
  return o.reduce((s, c, a) => (s[t[a].itemId] = c, s), {});
}
function xt({
  axisId: e,
  itemId: t
}) {
  const n = () => {
    const a = ge();
    for (const [
      u,
      {
        defaultLayoutDeferred: l,
        derivedItemConstraints: d,
        layout: g,
        axisSize: p,
        separatorToItems: m
      }
    ] of a)
      if (u.id === e)
        return {
          defaultLayoutDeferred: l,
          derivedItemConstraints: d,
          axis: u,
          axisSize: p,
          layout: g,
          separatorToItems: m
        };
    throw Error(`Group ${e} not found`);
  }, o = () => {
    const a = n().derivedItemConstraints.find(
      (u) => u.itemId === t
    );
    if (a !== void 0)
      return a;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, r = () => {
    const a = n().axis.items.find((u) => u.id === t);
    if (a !== void 0)
      return a;
    throw Error(`Layout not found for Panel ${t}`);
  }, i = () => {
    const a = n().layout[t];
    if (a !== void 0)
      return a;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = ({
    nextSize: a,
    items: u,
    prevLayout: l,
    derivedItemConstraints: d
  }) => {
    const g = i(), p = u.findIndex((h) => h.id === t), m = p === 0, f = p === u.length - 1;
    if (f && a < g && (m || u.slice(0, p).every((h, S) => {
      const z = d[S];
      return z?.collapsible && Y(z.collapsedSize, l[z.itemId]);
    }))) {
      const h = u.slice(0, p).reduce((S, z) => S + l[z.id], 0);
      return {
        ...l,
        [t]: K(100 - h)
      };
    }
    return qe({
      delta: f ? g - a : a - g,
      initialLayout: l,
      itemConstraints: d,
      pivotIndices: f ? [p - 1, p] : [p, p + 1],
      prevLayout: l,
      trigger: "imperative-api"
    });
  }, c = (a) => {
    const u = i();
    if (a === u)
      return;
    const {
      defaultLayoutDeferred: l,
      derivedItemConstraints: d,
      axis: g,
      axisSize: p,
      layout: m,
      separatorToItems: f
    } = n(), y = s({
      nextSize: a,
      items: g.items,
      prevLayout: m,
      derivedItemConstraints: d
    }), h = Se({
      layout: y,
      itemConstraints: d
    });
    se(m, h) || fe(g, {
      defaultLayoutDeferred: l,
      derivedItemConstraints: d,
      axisSize: p,
      layout: h,
      requestedAxisSize: p,
      requestedLayout: h,
      separatorToItems: f
    });
  };
  return {
    collapse: () => {
      const { collapsible: a, collapsedSize: u } = o(), { mutableValues: l } = r(), d = i();
      a && d !== u && (l.expandToSize = d, c(u));
    },
    expand: () => {
      const { collapsible: a, collapsedSize: u, minSize: l } = o(), { mutableValues: d } = r(), g = i();
      if (a && g === u) {
        let p = d.expandToSize ?? l;
        p === 0 && (p = 1), c(p);
      }
    },
    getSize: () => {
      const { axis: a } = n(), u = i(), { element: l } = r(), d = a.layoutStrategy ? a.layoutStrategy.getItemSizeInPixels(t) : a.orientation === "horizontal" ? l.offsetWidth : l.offsetHeight;
      return {
        asPercentage: u,
        inPixels: d
      };
    },
    isCollapsed: () => {
      const { collapsible: a, collapsedSize: u } = o(), l = i();
      return a && Y(u, l);
    },
    resize: (a) => {
      const { axis: u } = n(), { element: l } = r(), d = Te({ axis: u }), g = Ce({
        axisSize: d,
        itemElement: l,
        styleProp: a
      }), p = K(g / d * 100);
      c(p);
    }
  };
}
function $t(e) {
  if (e.defaultPrevented)
    return;
  const t = ge();
  bt(
    e,
    t,
    e.currentTarget
  ).forEach((o) => {
    if (o.separator && !o.separator.disableDoubleClick) {
      const r = o.items.find(
        (i) => i.constraintProps.defaultSize !== void 0
      );
      if (r) {
        const i = r.constraintProps.defaultSize, s = xt({
          axisId: o.axis.id,
          itemId: r.id
        });
        s && i !== void 0 && (s.resize(i), e.preventDefault());
      }
    }
  });
}
function gn(e) {
  const t = ge();
  for (const [n] of t)
    if (n.separators.some(
      (o) => o.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function _e({
  axisId: e
}) {
  const t = () => {
    const n = ge();
    for (const [o, r] of n)
      if (o.id === e)
        return { axis: o, ...r };
    throw Error(`Could not find Group with id "${e}"`);
  };
  return {
    getLayout() {
      const { defaultLayoutDeferred: n, layout: o } = t();
      return n ? {} : o;
    },
    setLayout(n) {
      const {
        defaultLayoutDeferred: o,
        derivedItemConstraints: r,
        axis: i,
        axisSize: s,
        layout: c,
        separatorToItems: a
      } = t(), u = Se({
        layout: n,
        itemConstraints: r
      });
      return o ? c : (se(c, u) || fe(i, {
        defaultLayoutDeferred: o,
        derivedItemConstraints: r,
        axisSize: s,
        layout: u,
        requestedAxisSize: s,
        requestedLayout: u,
        separatorToItems: a
      }), u);
    }
  };
}
function we(e, t) {
  const n = gn(e), o = ae(n.id, !0), r = n.separators.find(
    (d) => d.element === e
  );
  O(r, "Matching separator not found");
  const i = o.separatorToItems.get(r);
  O(i, "Matching panels not found");
  const s = i.map((d) => n.items.indexOf(d)), a = _e({ axisId: n.id }).getLayout(), u = qe({
    delta: t,
    initialLayout: a,
    itemConstraints: o.derivedItemConstraints,
    pivotIndices: s,
    prevLayout: a,
    trigger: "keyboard"
  }), l = Se({
    layout: u,
    itemConstraints: o.derivedItemConstraints
  });
  se(a, l) || fe(
    n,
    {
      defaultLayoutDeferred: o.defaultLayoutDeferred,
      derivedItemConstraints: o.derivedItemConstraints,
      axisSize: o.axisSize,
      layout: l,
      requestedAxisSize: o.axisSize,
      requestedLayout: l,
      separatorToItems: o.separatorToItems
    },
    // Keyboard resizes (arrow keys, Home/End, Enter collapse/expand) originate
    // from a real DOM event on the separator, so they are user interactions
    // just like pointer drags. This function is only reached from
    // onDocumentKeyDown. See #716.
    { isUserInteraction: !0 }
  );
}
function Ot(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = gn(t);
  if (!(n.disabled || n.separators.find(
    (r) => r.element === t
  )?.disabled))
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && we(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && we(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && we(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && we(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), we(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const r = ae(n.id, !0), { derivedItemConstraints: i, layout: s, separatorToItems: c } = r, a = n.separators.find(
          (g) => g.element === t
        );
        O(a, "Matching separator not found");
        const u = c.get(a);
        O(u, "Matching panels not found");
        const l = u[0], d = i.find(
          (g) => g.itemId === l.id
        );
        if (O(d, "Panel metadata not found"), d.collapsible) {
          const g = s[l.id], p = d.collapsedSize === g ? n.mutableState.expandedItemSizes[l.id] ?? d.minSize : d.collapsedSize;
          we(t, p - g);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const r = n.separators.map(
          (a) => a.element
        ), i = Array.from(r).findIndex(
          (a) => a === e.currentTarget
        );
        O(i !== null, "Index not found");
        const s = e.shiftKey ? i > 0 ? i - 1 : r.length - 1 : i + 1 < r.length ? i + 1 : 0;
        r[s].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), we(t, -100);
        break;
      }
    }
}
function ke(e, t) {
  const n = ie();
  if (n.state !== "active" || !nt(n, e, t))
    return !1;
  const o = ge();
  et();
  try {
    n.previewLayoutMap.forEach((r, i) => {
      const s = o.get(i);
      i.resizePreviewMode === "separator" && s && !se(r, s.layout) && fe(i, {
        ...s,
        layout: r,
        requestedAxisSize: s.axisSize,
        requestedLayout: r
      });
    }), St(), de({
      cursorFlags: 0,
      state: "inactive"
    }), n.hitRegions.forEach((r) => {
      if (!o.has(r.axis))
        return;
      const i = ae(r.axis.id, !0);
      fe(r.axis, i, {
        isUserInteraction: !0
      });
    });
  } finally {
    tt();
  }
  return !0;
}
function Nt(e) {
  const t = ie();
  if (t.state !== "active")
    return;
  const n = t.hitRegions.flatMap(
    ({ separator: o }) => o ? [o.element] : []
  );
  !n.some((o) => o === e.target) || n.some(
    (o) => o.hasPointerCapture?.(e.pointerId)
  ) || ke(e.currentTarget, e);
}
function Gt(e) {
  ke(e.currentTarget, e);
}
function ao(e, t) {
  const { element: n, orientation: o, items: r } = e, i = n.getBoundingClientRect(), s = o === "horizontal";
  return gt({
    expandHitTargets: !1,
    axis: e,
    includeDisabled: !0
  }).map(({ items: a, rect: u, separator: l }, d) => {
    const g = r.indexOf(a[0]), p = s ? u.left + u.width / 2 : u.top + u.height / 2;
    return {
      active: t.some((f) => {
        if (f.axis !== e || f.items[0] !== a[0])
          return !1;
        if (l || f.separator)
          return f.separator === l;
        const y = s ? f.rect.left + f.rect.width / 2 : f.rect.top + f.rect.height / 2;
        return Y(p, y);
      }),
      axis: e,
      key: l ? `separator-${l.id}` : `panel-${a[0].id}-${d}`,
      offset: 0,
      itemIndex: g,
      rect: new DOMRect(
        (s && !l ? p : u.left) - i.left - n.clientLeft + n.scrollLeft,
        (!s && !l ? p : u.top) - i.top - n.clientTop + n.scrollTop,
        s && !l ? 0 : u.width,
        !s && !l ? 0 : u.height
      ),
      separator: l
    };
  });
}
function Ft(e) {
  if (e.defaultPrevented)
    return;
  if (e.pointerType === "mouse" && e.button > 0)
    return;
  const t = ie();
  if (t.state === "active") {
    mn(t, e) && ke(
      t.ownerDocument,
      t
    );
    return;
  }
  const n = ge(), o = bt(
    e,
    n,
    e.currentTarget
  );
  if (o.length === 0)
    return;
  const r = /* @__PURE__ */ new Map();
  let i = !1;
  o.forEach((c) => {
    c.separator && (i || (i = !0, c.separator.element.focus({
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#browser_compatibility
      focusVisible: !1,
      preventScroll: !0
    })));
    const a = n.get(c.axis);
    a && r.set(c.axis, a.layout);
  });
  const s = Array.from(r.keys()).flatMap(
    (c) => c.resizePreviewMode === "separator" ? ao(c, o) : []
  );
  de({
    cursorFlags: 0,
    didPointerMove: !1,
    hitRegions: o,
    initialLayoutMap: r,
    ownerDocument: e.currentTarget,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    pointerId: e.pointerId,
    pointerType: e.pointerType,
    previewLayoutMap: new Map(r),
    previews: s,
    state: "active"
  }), e.preventDefault();
}
function _t(e) {
  const t = e.currentTarget, n = ge(), o = ie();
  switch (o.state) {
    case "active": {
      if (!nt(o, t, e))
        return;
      vt({
        commit: !1,
        event: e,
        hitRegions: o.hitRegions,
        initialLayoutMap: o.initialLayoutMap,
        mountedAxes: n,
        prevCursorFlags: o.cursorFlags
      });
    }
  }
}
function Bt(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = ie(), o = ge();
  switch (n.state) {
    case "active": {
      if (!nt(n, t, e))
        return;
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        ke(t, e);
        return;
      }
      for (const r of n.hitRegions)
        if (r.separator) {
          const { element: i } = r.separator;
          i.isConnected && !i.hasPointerCapture?.(e.pointerId) && i.setPointerCapture?.(e.pointerId);
        }
      vt({
        commit: !1,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedAxes: o,
        pointerDownAtPoint: n.pointerDownAtPoint,
        prevCursorFlags: n.cursorFlags
      });
      break;
    }
    default: {
      const r = bt(
        e,
        o,
        t
      );
      r.length === 0 ? n.state !== "inactive" && de({
        cursorFlags: 0,
        state: "inactive"
      }) : de({
        cursorFlags: 0,
        hitRegions: r,
        ownerDocument: t,
        state: "hover"
      });
      break;
    }
  }
}
function qt(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement) {
    const t = ie();
    switch (t.state) {
      case "hover":
        t.ownerDocument === e.currentTarget && de({
          cursorFlags: 0,
          state: "inactive"
        });
    }
  }
}
function Ht(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || pn(e.currentTarget, e);
}
function Vt(e) {
  e.target === e.currentTarget && ke(e.currentTarget.document);
}
function jt(e) {
  ke(e.currentTarget.document);
}
function co(e) {
  let t = 0, n = 0;
  const o = {};
  for (const i of e)
    if (i.defaultSize !== void 0) {
      t++;
      const s = K(i.defaultSize);
      n += s, o[i.itemId] = s;
    } else
      o[i.itemId] = void 0;
  const r = e.length - t;
  if (r !== 0) {
    const i = K((100 - n) / r);
    for (const s of e)
      s.defaultSize === void 0 && (o[s.itemId] = i);
  }
  return o;
}
function lo(e, t) {
  const n = e.map((r) => r.id), o = Object.keys(t);
  if (n.length !== o.length)
    return !1;
  for (const r of n)
    if (!o.includes(r))
      return !1;
  return !0;
}
function Ut({
  axis: e,
  itemConstraints: t
}) {
  const n = e.items.map(({ id: r }) => r).join(","), o = e.mutableState.defaultLayout;
  return e.mutableState.layouts[n] ?? (o && lo(e.items, o) ? o : co(t));
}
function Wt({
  itemIds: e,
  layout: t
}) {
  return Se({
    layout: t,
    itemConstraints: e.map((n) => ({
      collapsedSize: 0,
      collapsible: !1,
      defaultSize: void 0,
      disabled: void 0,
      itemId: n,
      maxSize: 100,
      minSize: 0
    }))
  });
}
function uo(e, t, n) {
  if (!n[0])
    return;
  const r = e.items.find((u) => u.element === t);
  if (!r || !r.onResize)
    return;
  const i = Te({ axis: e }), s = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, c = r.mutableValues.prevSize, a = {
    asPercentage: K(s / i * 100),
    inPixels: s
  };
  r.mutableValues.prevSize = a, r.onResize(a, r.id, c);
}
function yn(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const o in e)
    if (e[o] !== t[o])
      return !1;
  return !0;
}
function fo(e, t) {
  return e.length !== t.length ? !1 : e.every((n, o) => yn(n, t[o]));
}
function mo({
  axis: e,
  nextAxisSize: t,
  prevAxisSize: n,
  prevLayout: o
}) {
  if (n <= 0 || t <= 0 || n === t)
    return o;
  let r = 0, i = 0, s = !1;
  const c = /* @__PURE__ */ new Map(), a = [];
  for (const d of e.items) {
    const g = o[d.id] ?? 0;
    switch (d.constraintProps.groupResizeBehavior) {
      case "preserve-pixel-size": {
        s = !0;
        const p = g / 100 * n, m = K(
          p / t * 100
        );
        c.set(d.id, m), r += m;
        break;
      }
      case "preserve-relative-size":
      default: {
        a.push(d.id), i += g;
        break;
      }
    }
  }
  if (!s || a.length === 0)
    return o;
  const u = 100 - r, l = { ...o };
  if (c.forEach((d, g) => {
    l[g] = d;
  }), i > 0)
    for (const d of a) {
      const g = o[d] ?? 0;
      l[d] = K(
        g / i * u
      );
    }
  else {
    const d = K(u / a.length);
    for (const g of a)
      l[g] = d;
  }
  return l;
}
const Le = /* @__PURE__ */ new Map();
let Yt = !1;
function Sn(e) {
  let t = !0;
  O(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, o = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set(), i = new n((m) => {
    let f;
    et();
    try {
      for (const y of m) {
        const { borderBoxSize: h, target: S } = y;
        if (S === e.element) {
          if (t) {
            const z = Te({ axis: e });
            if (z === 0)
              break;
            const x = ae(e.id);
            if (!x)
              break;
            const R = ut(e);
            let N = x.requestedAxisSize, $ = x.requestedLayout;
            x.defaultLayoutDeferred && (N = z, $ = Wt({
              itemIds: e.items.map(({ id: v }) => v),
              layout: Ut({
                axis: e,
                itemConstraints: R
              })
            }));
            const b = mo({
              axis: e,
              nextAxisSize: z,
              prevAxisSize: N,
              prevLayout: $
            }), w = Se({
              layout: b,
              itemConstraints: R
            });
            if (!x.defaultLayoutDeferred && se(x.layout, w) && fo(
              x.derivedItemConstraints,
              R
            ) && x.axisSize === z)
              continue;
            fe(e, {
              defaultLayoutDeferred: !1,
              derivedItemConstraints: R,
              axisSize: z,
              layout: w,
              requestedAxisSize: N,
              requestedLayout: $,
              separatorToItems: x.separatorToItems
            });
          }
        } else
          try {
            uo(e, S, h);
          } catch (z) {
            f ??= { error: z };
          }
      }
    } finally {
      tt();
    }
    if (f)
      throw f.error;
  });
  i.observe(e.element), e.items.forEach((m) => {
    O(
      !o.has(m.id),
      `Panel ids must be unique; id "${m.id}" was used more than once`
    ), o.add(m.id), m.onResize && i.observe(m.element);
  });
  const s = Te({ axis: e }), c = ut(e), a = Ut({
    axis: e,
    itemConstraints: c
  }), u = Se({
    layout: a,
    itemConstraints: c
  }), l = e.element.ownerDocument, d = l.defaultView;
  Le.set(
    l,
    (Le.get(l) ?? 0) + 1
  );
  const g = /* @__PURE__ */ new Map();
  return gt({ axis: e, includeDisabled: !0 }).forEach((m) => {
    m.separator && g.set(m.separator, m.items);
  }), fe(e, {
    defaultLayoutDeferred: s === 0,
    derivedItemConstraints: c,
    axisSize: s,
    layout: u,
    requestedAxisSize: s,
    requestedLayout: Wt({
      itemIds: e.items.map(({ id: m }) => m),
      layout: a
    }),
    separatorToItems: g
  }), e.separators.forEach((m) => {
    O(
      !r.has(m.id),
      `Separator ids must be unique; id "${m.id}" was used more than once`
    ), r.add(m.id), m.element.addEventListener("keydown", Ot);
  }), Yt || (Yt = !0, pt(Bn)), Le.get(l) === 1 && (l.addEventListener("contextmenu", Tt, !0), l.addEventListener("dblclick", $t, !0), l.addEventListener(
    "lostpointercapture",
    Nt,
    !0
  ), l.addEventListener(
    "pointercancel",
    Gt,
    !0
  ), l.addEventListener("pointerdown", Ft, !0), l.addEventListener("pointerleave", _t), l.addEventListener("pointermove", Bt), l.addEventListener("pointerout", qt), l.addEventListener("pointerup", Ht, !0), d?.addEventListener("blur", Vt), d?.addEventListener("pagehide", jt)), function() {
    t = !1, Le.set(
      l,
      Math.max(0, (Le.get(l) ?? 0) - 1)
    ), Xn(e), Gn(e), e.separators.forEach((f) => {
      f.element.removeEventListener("keydown", Ot);
    }), Le.get(l) || (l.removeEventListener(
      "contextmenu",
      Tt,
      !0
    ), l.removeEventListener(
      "dblclick",
      $t,
      !0
    ), l.removeEventListener(
      "lostpointercapture",
      Nt,
      !0
    ), l.removeEventListener(
      "pointercancel",
      Gt,
      !0
    ), l.removeEventListener(
      "pointerdown",
      Ft,
      !0
    ), l.removeEventListener("pointerleave", _t), l.removeEventListener("pointermove", Bt), l.removeEventListener("pointerout", qt), l.removeEventListener("pointerup", Ht, !0), d?.removeEventListener("blur", Vt), d?.removeEventListener("pagehide", jt)), i.disconnect();
  };
}
function vn({
  derivedItemConstraints: e,
  axis: t,
  layout: n,
  prevLayout: o,
  requestedLayout: r
}) {
  const i = t.items.map(({ id: s }) => s).join(",");
  t.mutableState.layouts[i] = r, o && e.forEach((s) => {
    if (s.collapsible) {
      const c = Y(
        s.collapsedSize,
        n[s.itemId]
      ), a = Y(
        s.collapsedSize,
        o[s.itemId]
      );
      c && !a && (t.mutableState.expandedItemSizes[s.itemId] = o[s.itemId]);
    }
  });
}
function bn() {
  const [e, t] = he({}), n = re(() => t({}), []);
  return [e, n];
}
function ot(e) {
  const t = B({ ...e });
  return ne(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const wt = en(null);
function po({
  layout: e,
  itemConstraints: t,
  itemId: n,
  itemIndex: o
}) {
  let r, i;
  const s = e[n], c = t.find(
    (a) => a.itemId === n
  );
  if (c) {
    const a = c.maxSize, u = c.collapsible ? c.collapsedSize : c.minSize, l = [o, o + 1];
    i = Se({
      layout: qe({
        delta: u - s,
        initialLayout: e,
        itemConstraints: t,
        pivotIndices: l,
        prevLayout: e
      }),
      itemConstraints: t
    })[n], r = Se({
      layout: qe({
        delta: a - s,
        initialLayout: e,
        itemConstraints: t,
        pivotIndices: l,
        prevLayout: e
      }),
      itemConstraints: t
    })[n];
  }
  return {
    valueControls: n,
    valueMax: r,
    valueMin: i,
    valueNow: s
  };
}
function xn({
  attributes: e,
  axisId: t,
  axisOrientation: n,
  children: o,
  className: r,
  disableCursor: i,
  disabled: s,
  disableDoubleClick: c,
  elementRef: a,
  id: u,
  isSharedHitRegion: l,
  preview: d,
  registerSeparator: g,
  requiredStyle: p,
  style: m,
  styleDefaults: f,
  tabIndex: y = 0,
  updateSeparatorProps: h
}) {
  const S = ot({
    disabled: s,
    disableDoubleClick: c,
    children: o,
    className: r,
    preview: d,
    style: m
  }), [z, x] = he({}), [R, N] = he("inactive"), [$, b] = he(!1), w = B(null), v = B(null), T = Ve(w, a), A = n === "horizontal" ? "vertical" : "horizontal";
  ne(() => {
    const C = w.current;
    if (C !== null) {
      const I = {
        disabled: S.disabled,
        disableDoubleClick: S.disableDoubleClick,
        element: C,
        id: u,
        get children() {
          return S.children;
        },
        get className() {
          return S.className;
        },
        get preview() {
          return S.preview;
        },
        get style() {
          return S.style;
        }
      };
      v.current = I;
      const M = g(I), q = pt(
        (H) => {
          N(
            H.next.state !== "inactive" && H.next.hitRegions.some(
              (Z) => Z.separator === I || (l?.(Z) ?? !1)
            ) ? H.next.state : "inactive"
          );
        }
      ), J = Be(
        t,
        (H) => {
          const { derivedItemConstraints: Z, layout: ve, separatorToItems: ze } = H.next, Ie = ze.get(I);
          if (Ie) {
            const be = Ie[0], L = Z.findIndex(
              (F) => F.itemId === be.id
            ), { layoutStrategy: P } = H.axis;
            x({
              ...po({
                layout: ve,
                itemConstraints: Z,
                itemId: be.id,
                itemIndex: L
              }),
              // Items without DOM elements of their own (e.g. Grid tracks) control other elements
              ...P?.getItemAriaControls && {
                valueControls: P.getItemAriaControls(
                  be.id
                )
              }
            });
          }
        }
      );
      return () => {
        v.current = null, q(), J(), M();
      };
    }
  }, [t, u, l, g, S]), ne(() => {
    const C = v.current;
    C && Nn(C);
  }, [d]), He(() => {
    h(u, { disabled: s, disableDoubleClick: c });
  }, [s, c, u, h]);
  let E;
  s && !i && (E = "not-allowed");
  let D;
  if (s)
    D = "disabled";
  else
    switch (R) {
      case "active": {
        D = "active";
        break;
      }
      default:
        $ ? D = "focus" : D = R;
    }
  return /* @__PURE__ */ X(
    "div",
    {
      ...e,
      "aria-controls": z.valueControls,
      "aria-disabled": s || void 0,
      "aria-orientation": A,
      "aria-valuemax": z.valueMax,
      "aria-valuemin": z.valueMin,
      "aria-valuenow": z.valueNow,
      children: o,
      className: r,
      "data-separator": D,
      "data-testid": u,
      id: u,
      onBlur: () => b(!1),
      onFocus: () => b(!0),
      ref: T,
      role: "separator",
      style: {
        ...f,
        cursor: E,
        ...m,
        ...p,
        // Inform the browser that the library is handling touch events for this element
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: "none"
      },
      tabIndex: s ? void 0 : y
    }
  );
}
function Xt({
  axis: e,
  children: t,
  className: n,
  crossSpan: o,
  crossStart: r,
  disabled: i,
  elementRef: s,
  index: c,
  style: a
}) {
  const u = De(void 0), {
    getDisableCursor: l,
    getResizeAxisId: d,
    gutters: g,
    registerSeparator: p,
    separatorPlacements: m,
    trackCounts: f,
    updateSeparatorProps: y
  } = rn(), h = d(e), S = e === "column" ? "row" : "column", z = f[S], x = !!i || !ft(c, f[e]);
  let R = !0;
  for (const v of m.values())
    if (v.axis === e && v.index === c && !v.disabled && v.crossStart < r) {
      R = !1;
      break;
    }
  const N = re(
    (v) => v.axis.id === h && v.axis.items.indexOf(v.items[1]) === c,
    [h, c]
  ), $ = re(
    (v) => p(
      {
        axis: e,
        crossSpan: o,
        crossStart: r,
        disabled: !!i,
        index: c
      },
      v
    ),
    [e, o, r, i, c, p]
  ), b = Pn(c), w = Tn({
    crossCount: z,
    crossSpan: o,
    crossStart: r,
    hasGutters: g[S]
  });
  return /* @__PURE__ */ X(
    xn,
    {
      axisId: h,
      axisOrientation: e === "column" ? "horizontal" : "vertical",
      className: n,
      disableCursor: l(),
      disabled: x,
      disableDoubleClick: void 0,
      elementRef: s,
      id: u,
      isSharedHitRegion: N,
      registerSeparator: $,
      requiredStyle: {
        gridColumn: e === "column" ? b : w,
        gridRow: e === "row" ? b : w
      },
      style: a,
      tabIndex: R ? 0 : -1,
      updateSeparatorProps: y,
      children: t
    }
  );
}
function wn(e) {
  const { children: t, className: n, disabled: o, elementRef: r, style: i } = e;
  return e.type === "column" ? /* @__PURE__ */ X(
    Xt,
    {
      axis: "column",
      className: n,
      crossSpan: e.rowSpan,
      crossStart: e.row ?? 0,
      disabled: o,
      elementRef: r,
      index: e.column,
      style: i,
      children: t
    }
  ) : /* @__PURE__ */ X(
    Xt,
    {
      axis: "row",
      className: n,
      crossSpan: e.columnSpan,
      crossStart: e.column ?? 0,
      disabled: o,
      elementRef: r,
      index: e.row,
      style: i,
      children: t
    }
  );
}
wn.displayName = "Gridline";
const Re = ["column", "row"], Kt = { columns: {}, rows: {} };
function ho({
  children: e,
  className: t,
  columns: n,
  defaultLayout: o,
  disableCursor: r,
  disabled: i,
  elementRef: s,
  gridRef: c,
  id: a,
  onLayoutChange: u,
  onLayoutChanged: l,
  resizeTargetMinimumSize: d = {
    coarse: 20,
    fine: 10
  },
  rows: g,
  style: p,
  ...m
}) {
  const f = De(a), y = re(
    (L) => L === "column" ? `${f}:columns` : `${f}:rows`,
    [f]
  ), h = Jt(n, "columns"), S = Jt(g, "rows"), z = (L) => L === "column" ? h : S, x = B({
    onLayoutChange: Kt,
    onLayoutChanged: Kt
  }), R = ye((L) => {
    Zt(x.current.onLayoutChange, L) || (x.current.onLayoutChange = L, u?.(L));
  }), N = ye(
    (L, P, F) => {
      Zt(x.current.onLayoutChanged, L) || (x.current.onLayoutChanged = L, l?.(L, { isUserInteraction: P, requestedLayout: F }));
    }
  ), $ = B(null), b = Ve($, s), [w, v] = bn(), T = B({
    cells: [],
    column: { expandedItemSizes: {}, layouts: {} },
    loggedErrors: /* @__PURE__ */ new Set(),
    row: { expandedItemSizes: {}, layouts: {} },
    separators: /* @__PURE__ */ new Map()
  }), A = { column: !1, row: !1 };
  for (const L of T.current.separators.values())
    A[L.axis] = !0;
  zn(e, A);
  const E = ot({
    defaultLayout: o,
    disableCursor: r,
    resizeTargetMinimumSize: d
  }), D = ye(() => !!E.disableCursor), C = re(
    (L) => {
      const P = T.current;
      return P.cells = [...P.cells, L], v(), () => {
        P.cells = P.cells.filter(
          (F) => F !== L
        ), v();
      };
    },
    [v]
  ), I = re(
    (L, P) => {
      const F = T.current;
      return F.separators = new Map(F.separators), F.separators.set(P, L), v(), () => {
        F.separators = new Map(F.separators), F.separators.delete(P), v();
      };
    },
    [v]
  ), M = re(
    (L, {
      disabled: P,
      disableDoubleClick: F
    }) => {
      for (const G of T.current.separators.keys())
        G.id === L && (G.disabled = P, G.disableDoubleClick = F);
    },
    []
  ), q = T.current.separators, J = Pe(
    () => ({
      getDisableCursor: D,
      getResizeAxisId: y,
      gutters: {
        column: A.column,
        row: A.row
      },
      id: f,
      registerCell: C,
      registerSeparator: I,
      separatorPlacements: q,
      trackCounts: {
        column: h.length,
        row: S.length
      },
      updateSeparatorProps: M
    }),
    [
      h.length,
      D,
      y,
      A.column,
      A.row,
      f,
      C,
      I,
      S.length,
      q,
      M
    ]
  ), H = B([]);
  ne(() => {
    const L = $.current;
    if (L === null)
      return;
    const P = T.current, F = yo({
      cells: P.cells,
      separatorPlacements: P.separators,
      trackCounts: { column: h.length, row: S.length }
    });
    F.forEach((k) => {
      P.loggedErrors.has(k) || console.error(k);
    }), P.loggedErrors = new Set(F);
    const G = (k) => Array.from(P.separators.entries()).filter(([, W]) => W.axis === k).sort(([, W], [, me]) => W.index - me.index).map(([W]) => W), _ = (k) => {
      const W = k === "column" ? h : S, me = k === "column" ? S : h, pe = W.map((Q) => Q.id), je = y(k), Ue = G(k), xe = Ue.length > 0, We = W.map(
        ({ id: Q, ...oe }, ee) => ({
          // Tracks don't have DOM elements of their own;
          // the Grid element is used to resolve relative size constraints (e.g. "em")
          element: L,
          id: pe[ee],
          idIsStable: !0,
          mutableValues: {
            expandToSize: void 0,
            prevSize: void 0
          },
          onResize: void 0,
          constraintProps: oe
        })
      ), $e = () => {
        const Q = [];
        if (xe) {
          for (const [oe, ee] of P.separators)
            if (ee.axis === k && ft(ee.index, W.length)) {
              const Ne = oe.element.getBoundingClientRect();
              Q[ee.index] = Math.max(
                Q[ee.index] ?? 0,
                k === "column" ? Ne.width : Ne.height
              );
            }
        }
        return $n({
          axis: k,
          element: L,
          gutterSizes: Q.filter((oe) => oe !== void 0),
          hasGutters: xe,
          layout: ae(je)?.layout,
          trackIds: pe
        });
      };
      let Oe;
      const it = E.defaultLayout?.[k === "column" ? "columns" : "rows"];
      if (it !== void 0 && Object.keys(it).length === pe.length) {
        Oe = {};
        for (const Q of pe) {
          const oe = it[Q];
          oe !== void 0 && (Oe[Q] = oe);
        }
      }
      return {
        disabled: !!i,
        element: L,
        id: je,
        layoutStrategy: {
          getItemAriaControls: (Q) => {
            const oe = pe.indexOf(Q);
            return P.cells.filter((ee) => {
              const Ne = k === "column" ? ee.column : ee.row, Ln = k === "column" ? ee.columnSpan : ee.rowSpan;
              return Ne <= oe && oe < Ne + Ln;
            }).map((ee) => ee.element.id).filter(Boolean).join(" ") || void 0;
          },
          calculateAvailableSize: () => $e().availableSize,
          calculateHitRegions: ({
            expandHitTargets: Q,
            axis: oe,
            includeDisabled: ee
          }) => An({
            axis: k,
            cells: P.cells,
            crossTrackCount: me.length,
            expandHitTargets: Q,
            resizeAxis: oe,
            axisSize: $e().availableSize,
            includeDisabled: ee,
            separatorPlacements: P.separators
          }),
          getItemSizeInPixels: (Q) => $e().trackSizes[pe.indexOf(Q)] ?? 0
        },
        mutableState: {
          defaultLayout: Oe,
          disableCursor: !!E.disableCursor,
          expandedItemSizes: P[k].expandedItemSizes,
          layouts: P[k].layouts
        },
        orientation: k === "column" ? "horizontal" : "vertical",
        items: We,
        resizePreviewMode: "panel",
        get resizeTargetMinimumSize() {
          return E.resizeTargetMinimumSize;
        },
        separators: Ue
      };
    }, j = Re.map(_);
    H.current = j;
    const U = j.map((k) => Sn(k)), te = () => {
      const [k, W] = j.map(
        (me) => ae(me.id)
      );
      if (!(!k || !W || k.defaultLayoutDeferred || W.defaultLayoutDeferred))
        return {
          layout: { columns: k.layout, rows: W.layout },
          requestedLayout: {
            columns: k.requestedLayout,
            rows: W.requestedLayout
          }
        };
    };
    {
      const k = te();
      if (k)
        try {
          try {
            R(k.layout);
          } finally {
            N(
              k.layout,
              !1,
              k.requestedLayout
            );
          }
        } catch (W) {
          throw H.current = [], U.forEach((me) => me()), W;
        }
    }
    const Ae = j.map(
      (k) => Be(k.id, (W) => {
        const {
          defaultLayoutDeferred: me,
          derivedItemConstraints: pe,
          layout: je,
          requestedLayout: Ue
        } = W.next;
        if (me || pe.length === 0)
          return;
        vn({
          derivedItemConstraints: pe,
          axis: k,
          layout: je,
          prevLayout: W.prev?.layout,
          requestedLayout: Ue
        });
        const xe = te();
        if (xe) {
          const We = ie(), $e = We.state !== "active" || !We.hitRegions.some(
            (Oe) => j.includes(Oe.axis)
          );
          try {
            R(xe.layout);
          } finally {
            $e && N(
              xe.layout,
              W.isUserInteraction,
              xe.requestedLayout
            );
          }
        }
      })
    );
    return () => {
      H.current = [], U.forEach((k) => k()), Ae.forEach((k) => k());
    };
  }, [
    h,
    i,
    y,
    f,
    N,
    R,
    S,
    w,
    E
  ]), He(() => {
    H.current.forEach((L) => {
      L.mutableState.defaultLayout = o?.[L.orientation === "horizontal" ? "columns" : "rows"], L.mutableState.disableCursor = !!r;
    });
  }), dt(c, () => {
    const L = () => {
      const [G, _] = Re.map(y);
      return !Ee(G) || !Ee(_) ? { columns: {}, rows: {} } : {
        columns: _e({
          axisId: G
        }).getLayout(),
        rows: _e({ axisId: _ }).getLayout()
      };
    }, P = (G) => G.map((_) => `"${_}"`).join(", "), F = (G, _) => {
      const j = y(G), U = () => {
        const te = Ee(j);
        return O(te, `Grid "${f}" has not been mounted`), O(
          te.items.some((Ae) => Ae.id === _),
          `Grid "${f}" no longer contains a ${G} with id "${_}"; ${G} ids are ${P(te.items.map((Ae) => Ae.id))}`
        ), xt({ axisId: j, itemId: _ });
      };
      return {
        collapse: () => U().collapse(),
        expand: () => U().expand(),
        getSize: () => U().getSize(),
        isCollapsed: () => U().isCollapsed(),
        resize: (te) => U().resize(te)
      };
    };
    return {
      getLayout: L,
      getTrackById: (G, _) => {
        const j = G === "column" ? h : S, U = `${_}`;
        return O(
          j.some((te) => te.id === U),
          `Grid "${f}" does not contain a ${G} with id "${U}"; ${G} ids are ${P(j.map((te) => te.id))}`
        ), F(G, U);
      },
      getTrackByIndex: (G, _) => {
        const j = G === "column" ? h : S, U = Number.isInteger(_) ? j[_] : void 0;
        return O(
          U,
          `Grid "${f}" does not contain a ${G} at index ${_}; it has ${j.length} ${G}s`
        ), F(G, U.id);
      },
      setLayout: (G) => (Re.forEach((_) => {
        const j = G[_ === "column" ? "columns" : "rows"], U = y(_);
        j && Ee(U) && _e({ axisId: U }).setLayout(j);
      }), L())
    };
  }, [h, y, f, S]);
  const Z = () => Re.map((L) => {
    const P = ae(y(L)), F = z(L);
    return (P && !P.defaultLayoutDeferred ? F.map((_) => `minmax(0, ${P.layout[_.id] ?? 1}fr)`) : go(
      F,
      o?.[L === "column" ? "columns" : "rows"]
    )).join(A[L] ? " auto " : " ");
  }).join("|"), ve = re(
    (L) => {
      const P = Re.map(
        (F) => Be(y(F), L)
      );
      return () => P.forEach((F) => F());
    },
    [y]
  ), ze = Qe(
    ve,
    Z,
    Z
  ), [Ie, be] = ze.split("|");
  return /* @__PURE__ */ X(on.Provider, { value: J, children: /* @__PURE__ */ X(
    "div",
    {
      ...m,
      className: t,
      "data-grid": !0,
      "data-testid": f,
      id: f,
      ref: b,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...p,
        display: "grid",
        gridTemplateColumns: Ie,
        gridTemplateRows: be,
        // Inform the browser that the library is handling touch events for this element
        // NOTE This is not an inherited style
        touchAction: "none"
      },
      children: /* @__PURE__ */ X(wt.Provider, { value: null, children: e })
    }
  ) });
}
ho.displayName = "Grid";
function Jt(e, t) {
  const n = JSON.stringify(e);
  return Pe(() => {
    const o = typeof e == "number" ? Array.from({ length: e }, (r, i) => ({ id: `${i}` })) : e.map((r, i) => ({
      ...r,
      id: `${r.id ?? i}`
    }));
    return O(
      o.length > 0,
      `Grid must have at least one track; "${t}" is ${n}`
    ), o;
  }, [n]);
}
function zn(e, t) {
  En.forEach(e, (n) => {
    if (nn(n))
      if (n.type === wn) {
        const { type: o } = n.props;
        o === "column" ? t.column = !0 : o === "row" && (t.row = !0);
      } else // Fragments
      typeof n.type == "symbol" && n.props !== null && typeof n.props == "object" && "children" in n.props && zn(n.props.children, t);
  });
}
function go(e, t) {
  if (t)
    return e.map(
      (i) => `minmax(0, ${t[i.id] ?? 1}fr)`
    );
  const n = e.map(
    (i) => i.defaultSize === void 0 ? void 0 : sn(i.defaultSize)
  );
  let o = 100, r = 0;
  return n.forEach((i) => {
    i === void 0 ? r++ : i[1] === "%" && (o -= i[0]);
  }), n.map((i) => {
    if (i === void 0)
      return `minmax(0, ${Math.max(0, o) / Math.max(1, r)}fr)`;
    const [s, c] = i;
    return c === "%" ? `minmax(0, ${s}fr)` : `${s}${c}`;
  });
}
function yo({
  cells: e,
  separatorPlacements: t,
  trackCounts: n
}) {
  const o = [];
  for (const c of e)
    Re.forEach((a) => {
      const [u, l] = a === "column" ? [c.column, c.columnSpan] : [c.row, c.rowSpan], d = n[a];
      (!Number.isInteger(u) || !Number.isInteger(l) || u < 0 || l < 1 || u + l > d) && o.push(
        `Invalid Cell ${a} placement (${a}: ${u}, ${a}Span: ${l}); Grid has ${d} ${a}s`
      );
    });
  const r = ({
    axis: c,
    crossSpan: a,
    crossStart: u,
    disabled: l,
    index: d
  }) => {
    const g = c === "column" ? "row" : "column";
    let p = `type="${c}" ${c}={${d}}`;
    return (u !== 0 || a !== void 0) && (p += ` ${g}={${u}}`), a !== void 0 && (p += ` ${g}Span={${a}}`), l && (p += " disabled"), `<Gridline ${p} />`;
  }, i = Array.from(t.values()).filter(
    (c) => {
      const { axis: a, crossSpan: u, crossStart: l, index: d } = c, g = a === "column" ? "row" : "column", p = n[a], m = n[g];
      let f = !0;
      return ft(d, p) || (o.push(
        `Invalid ${a} Gridline ${a} (${d}); must be between 1 and ${p - 1}`
      ), f = !1), !Number.isInteger(l) || l < 0 || l >= m ? (o.push(
        `Invalid ${a} Gridline ${g} (${l}); must be between 0 and ${m - 1}`
      ), f = !1) : u !== void 0 && (!Number.isInteger(u) || u < 1 || l + u > m) && (o.push(
        `Invalid ${a} Gridline ${g}Span (${u}); Grid has ${m} ${g}s`
      ), f = !1), f;
    }
  ), s = (c) => {
    const a = n[c.axis === "column" ? "row" : "column"];
    return [
      c.crossStart,
      c.crossSpan === void 0 ? a : c.crossStart + c.crossSpan
    ];
  };
  return i.forEach((c, a) => {
    const { axis: u, index: l } = c, [d, g] = s(c);
    for (const p of e) {
      const [m, f, y, h] = u === "column" ? [p.column, p.columnSpan, p.row, p.rowSpan] : [p.row, p.rowSpan, p.column, p.columnSpan];
      if (m < l && l < m + f && y < g && d < y + h) {
        const S = u === "column" ? "row" : "column";
        o.push(
          `${r(c)} overlaps a Cell that spans across it (${u}: ${m}, ${u}Span: ${f}, ${S}: ${y}, ${S}Span: ${h}); use the ${S} and ${S}Span props to render gridlines beside the Cell instead`
        );
      }
    }
    for (const p of i.slice(a + 1))
      if (p.axis === u && p.index === l) {
        const [m, f] = s(p);
        m < g && d < f && o.push(`${r(c)} overlaps ${r(p)}`);
      }
  }), o;
}
function Zt(e, t) {
  return se(e.columns, t.columns) && se(e.rows, t.rows);
}
function No({
  id: e,
  onlySaveAfterUserInteractions: t,
  storage: n = localStorage
}) {
  const o = `react-resizable-panels:grid:${e}`, r = Qe(
    So,
    () => n.getItem(o),
    () => n.getItem(o)
  ), i = Pe(() => {
    if (r)
      try {
        const c = JSON.parse(r);
        if (c !== null && typeof c == "object")
          return c;
      } catch {
      }
  }, [r]), s = re(
    (c, a) => {
      if (!(t && !a.isUserInteraction))
        try {
          n.setItem(
            o,
            JSON.stringify(a.requestedLayout ?? c)
          );
        } catch (u) {
          console.error(u);
        }
    },
    [t, n, o]
  );
  return {
    /**
     * Pass this value to `Grid` as the `defaultLayout` prop.
     */
    defaultLayout: i,
    /**
     * Attach this callback on the `Grid` as the `onLayoutChanged` prop.
     */
    onLayoutChanged: s
  };
}
function So() {
  return function() {
  };
}
function Go() {
  return he(null);
}
function Fo() {
  return B(null);
}
function vo(e) {
  for (let t = 1; t < e.length; t++)
    if (ht(e[t - 1], e[t]) > 0)
      return !1;
  return !0;
}
function bo({
  separator: e
}) {
  const { element: t } = e, n = B(null);
  return ne(() => {
    const o = t.cloneNode(!0), r = [t, ...t.querySelectorAll("*")], i = [o, ...o.querySelectorAll("*")], s = t.ownerDocument.defaultView;
    return r.forEach((c, a) => {
      const u = i[a];
      if (u instanceof s.HTMLElement || u instanceof s.SVGElement) {
        const l = s.getComputedStyle(c);
        for (let d = 0; d < l.length; d++) {
          const g = l.item(d);
          u.style.setProperty(
            g,
            l.getPropertyValue(g)
          );
        }
      }
      u.removeAttribute("data-testid"), u.removeAttribute("id");
    }), Object.assign(o.style, {
      boxSizing: "border-box",
      height: "100%",
      margin: "0",
      position: "static",
      transform: "none",
      width: "100%"
    }), n.current.appendChild(o), () => o.remove();
  }, [t]), /* @__PURE__ */ X(
    "div",
    {
      ref: n,
      style: {
        height: "100%",
        opacity: 0.65,
        pointerEvents: "none",
        width: "100%"
      }
    }
  );
}
function rt() {
  const e = tn(wt);
  return O(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function In(e) {
  const { registerOverlay: t } = rt(), n = B(e);
  yn(n.current, e) || (n.current = e);
  const o = n.current;
  return ne(
    () => t(o),
    [t, o]
  ), null;
}
In.displayName = "SeparatorOverlay";
function xo({
  active: e,
  orientation: t,
  style: n,
  ...o
}) {
  let r;
  switch (t) {
    case "horizontal": {
      r = {
        height: "100%",
        minWidth: "1px"
      };
      break;
    }
    case "vertical": {
      r = {
        minHeight: "1px",
        width: "100%"
      };
      break;
    }
  }
  return /* @__PURE__ */ X(
    "div",
    {
      ...o,
      "data-separator-overlay": e ? "active" : "inactive",
      style: {
        ...r,
        ...n,
        flexShrink: 0,
        pointerEvents: "none"
      }
    }
  );
}
function wo({
  overlay: e,
  preview: t
}) {
  const { axis: n, offset: o, rect: r, separator: i } = t, s = n.orientation === "horizontal";
  let c = i?.preview, a = e;
  return nn(c) && c.type === In && (a = c.props, c = void 0), c == null && (a ? c = /* @__PURE__ */ X(
    xo,
    {
      ...a,
      active: t.active,
      orientation: n.orientation
    }
  ) : i && (c = /* @__PURE__ */ X(bo, { separator: i }))), /* @__PURE__ */ X(
    "div",
    {
      "aria-hidden": "true",
      "data-resize-preview": !0,
      inert: !0,
      style: {
        height: r.height,
        left: r.left,
        pointerEvents: "none",
        position: "absolute",
        top: r.top,
        transform: s ? `translateX(${o}px)` : `translateY(${o}px)`,
        width: r.width
      },
      children: c
    }
  );
}
function zo(e) {
  return Array.from(e).sort(ht);
}
function Io(e, t) {
  const n = B({
    getLayout: () => ({}),
    setLayout: Fn
  });
  dt(t, () => n.current, []), ne(() => {
    Object.assign(
      n.current,
      _e({ axisId: e })
    );
  });
}
function Lo({
  groupId: e,
  resizePreviewMode: t
}) {
  const [n, o] = he([]), r = B(n);
  return ne(() => {
    const i = (c) => {
      const a = Ee(e), u = t === "separator" && c.state === "active" ? c.previews.filter(
        (d) => d.axis === a && (d.active || !Y(d.offset, 0))
      ) : [], l = r.current;
      l.length === u.length && u.every(
        (d, g) => d === l[g]
      ) || (r.current = u, o(u));
    };
    if (t !== "separator") {
      i(ie());
      return;
    }
    const s = pt(
      ({ next: c }) => i(c)
    );
    return i(ie()), s;
  }, [e, t]), n;
}
function Co({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: o,
  disabled: r,
  elementRef: i,
  groupRef: s,
  id: c,
  onLayoutChange: a,
  onLayoutChanged: u,
  orientation: l = "horizontal",
  resizePreviewMode: d = "panel",
  resizeTargetMinimumSize: g = {
    coarse: 20,
    fine: 10
  },
  style: p,
  ...m
}) {
  const f = B({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), y = ye((I) => {
    se(f.current.onLayoutChange, I) || (f.current.onLayoutChange = I, a?.(I));
  }), h = ye(
    (I, M, q) => {
      se(f.current.onLayoutChanged, I) || (f.current.onLayoutChanged = I, u?.(I, { isUserInteraction: M, requestedLayout: q }));
    }
  ), S = De(c), [z, x] = he(), R = Lo({
    groupId: S,
    resizePreviewMode: d
  }), N = B(null), [$, b] = bn(), w = B([]), v = B({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    separators: []
  }), T = Ve(N, i);
  Io(S, s);
  const A = ye(
    (I, M) => {
      const q = ae(I);
      if (q)
        return {
          flexGrow: q.layout[M] ?? 1
        };
      if (n?.[M])
        return {
          flexGrow: n?.[M]
        };
    }
  ), E = ot({
    defaultLayout: n,
    disableCursor: o,
    resizeTargetMinimumSize: g
  }), D = Pe(
    () => ({
      get disableCursor() {
        return !!E.disableCursor;
      },
      getPanelStyles: A,
      id: S,
      orientation: l,
      registerPanel: (I) => {
        const M = v.current;
        return M.panels = Ge(l, [
          ...M.panels,
          I
        ]), b(), () => {
          M.panels = M.panels.filter(
            (q) => q !== I
          ), b();
        };
      },
      registerOverlay: (I) => (x(I), () => {
        x(void 0);
      }),
      registerSeparator: (I) => {
        const M = v.current;
        return M.separators = Ge(l, [
          ...M.separators,
          I
        ]), b(), () => {
          M.separators = M.separators.filter(
            (q) => q !== I
          ), b();
        };
      },
      updatePanelProps: (I, { disabled: M }) => {
        const J = v.current.panels.find(
          (ve) => ve.id === I
        );
        J && (J.constraintProps.disabled = M);
        const H = Ee(S), Z = ae(S);
        H && Z && fe(H, {
          ...Z,
          derivedItemConstraints: ut(H)
        });
      },
      updateSeparatorProps: (I, {
        disabled: M,
        disableDoubleClick: q
      }) => {
        const H = v.current.separators.find(
          (Z) => Z.id === I
        );
        H && (H.disabled = M, H.disableDoubleClick = q);
      }
    }),
    [A, S, b, l, E]
  ), C = B(null);
  return ne(() => {
    const I = N.current;
    if (I === null)
      return;
    const M = v.current;
    M.panels = Ge(
      l,
      M.panels
    ), M.separators = Ge(
      l,
      M.separators
    ), w.current = zo([
      ...M.panels.map(({ element: L }) => L),
      ...M.separators.map(({ element: L }) => L)
    ]);
    let q;
    if (E.defaultLayout !== void 0 && Object.keys(E.defaultLayout).length === M.panels.length) {
      q = {};
      for (const L of M.panels) {
        const P = E.defaultLayout[L.id];
        P !== void 0 && (q[L.id] = P);
      }
    }
    const J = {
      disabled: !!r,
      element: I,
      id: S,
      mutableState: {
        defaultLayout: q,
        disableCursor: !!E.disableCursor,
        expandedItemSizes: v.current.lastExpandedPanelSizes,
        layouts: v.current.layouts
      },
      orientation: l,
      items: M.panels,
      resizePreviewMode: d,
      get resizeTargetMinimumSize() {
        return E.resizeTargetMinimumSize;
      },
      separators: M.separators
    };
    C.current = J;
    const H = Sn(J), {
      defaultLayoutDeferred: Z,
      derivedItemConstraints: ve,
      layout: ze,
      requestedLayout: Ie
    } = ae(J.id, !0);
    if (!Z && ve.length > 0)
      try {
        try {
          y(ze);
        } finally {
          h(ze, !1, Ie);
        }
      } catch (L) {
        throw C.current = null, H(), L;
      }
    const be = Be(S, (L) => {
      const {
        defaultLayoutDeferred: P,
        derivedItemConstraints: F,
        layout: G,
        requestedLayout: _
      } = L.next;
      if (P || F.length === 0)
        return;
      vn({
        derivedItemConstraints: F,
        axis: J,
        layout: G,
        prevLayout: L.prev?.layout,
        requestedLayout: _
      });
      const j = ie(), U = j.state !== "active" || !j.hitRegions.some((te) => te.axis === J);
      try {
        y(G);
      } finally {
        U && h(
          G,
          L.isUserInteraction,
          _
        );
      }
    });
    return () => {
      C.current = null, H(), be();
    };
  }, [
    r,
    S,
    h,
    y,
    l,
    $,
    d,
    E
  ]), ne(() => {
    vo(w.current) || b();
  }), He(() => {
    const I = C.current;
    I && (I.mutableState.defaultLayout = n, I.mutableState.disableCursor = !!o);
  }), /* @__PURE__ */ X(wt.Provider, { value: D, children: /* @__PURE__ */ Cn(
    "div",
    {
      ...m,
      className: t,
      "data-group": !0,
      "data-testid": S,
      id: S,
      ref: T,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: d === "separator" ? "relative" : void 0,
        ...p,
        display: "flex",
        flexDirection: l === "horizontal" ? "row" : "column",
        flexWrap: "nowrap",
        // Inform the browser that the library is handling touch events for this element
        // but still allow users to scroll content within panels in the non-resizing direction
        // NOTE This is not an inherited style
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: l === "horizontal" ? "pan-y" : "pan-x"
      },
      children: [
        e,
        R.map((I) => /* @__PURE__ */ X(
          wo,
          {
            overlay: z,
            preview: I
          },
          I.key
        ))
      ]
    }
  ) });
}
Co.displayName = "Group";
function Ze(e, t) {
  return `react-resizable-panels:${[e, ...t].join(":")}`;
}
function Ro({
  id: e,
  panelIds: t,
  storage: n
}) {
  const o = Ze(e, []), r = n.getItem(o);
  if (r)
    try {
      const i = JSON.parse(r);
      if (t) {
        const s = t.join(","), c = i[s];
        if (c && Array.isArray(c.layout) && t.length === c.layout.length) {
          const a = {};
          for (let u = 0; u < t.length; u++)
            a[t[u]] = c.layout[u];
          return a;
        }
      } else {
        const s = Object.keys(i);
        if (s.length === 1) {
          const c = i[s[0]];
          if (c && Array.isArray(c.layout)) {
            const a = s[0].split(",");
            if (a.length === c.layout.length) {
              const u = {};
              for (let l = 0; l < a.length; l++)
                u[a[l]] = c.layout[l];
              return u;
            }
          }
        }
      }
    } catch {
    }
}
function _o({
  debounceSaveMs: e = 100,
  onlySaveAfterUserInteractions: t,
  panelIds: n,
  storage: o = localStorage,
  ...r
}) {
  const i = n !== void 0, s = "id" in r ? r.id : r.groupId, c = Ze(s, n ?? []), a = Qe(
    Eo,
    () => o.getItem(c),
    () => o.getItem(c)
  ), u = Pe(() => {
    if (a) {
      const y = JSON.parse(a), h = Object.values(y);
      if (Array.from(h).every((S) => typeof S == "number"))
        return y;
    }
  }, [a]), l = Pe(() => {
    if (!u)
      return Ro({
        id: s,
        panelIds: n,
        storage: o
      });
  }, [u, s, n, o]), d = u ?? l, g = B(null), p = re(() => {
    const y = g.current;
    y && (g.current = null, clearTimeout(y));
  }, []);
  Qt(() => () => {
    p();
  }, [p]);
  const m = re(
    // The hook persists every layout commit -- including library-driven ones --
    // because it owns its own storage and the goal is to remember whatever
    // layout the user is currently looking at. Consumers that only want to
    // persist on user interaction should branch on `isUserInteraction` in
    // their own callback (see #716) rather than via this hook.
    (y, h) => {
      if (t && !h.isUserInteraction)
        return;
      p();
      const S = h.requestedLayout ?? y;
      let z;
      i ? z = Ze(s, Object.keys(S)) : z = Ze(s, []);
      try {
        o.setItem(z, JSON.stringify(S));
      } catch (x) {
        console.error(x);
      }
    },
    [
      p,
      i,
      s,
      t,
      o
    ]
  ), f = re(
    (y) => {
      p(), e === 0 ? m(y, { isUserInteraction: !1 }) : g.current = setTimeout(() => {
        m(y, { isUserInteraction: !1 });
      }, e);
    },
    [p, e, m]
  );
  return {
    /**
     * Pass this value to `Group` as the `defaultLayout` prop.
     */
    defaultLayout: d,
    /**
     * Attach this callback on the `Group` as the `onLayoutChange` prop.
     *
     * @deprecated Use the {@link onLayoutChanged} prop instead.
     */
    onLayoutChange: f,
    /**
     * Attach this callback on the `Group` as the `onLayoutChanged` prop.
     */
    onLayoutChanged: m
  };
}
function Eo() {
  return function() {
  };
}
function Bo() {
  return he(null);
}
function qo() {
  return B(null);
}
function Mo(e, t) {
  const { id: n } = rt(), o = B({
    collapse: st,
    expand: st,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: st
  });
  dt(t, () => o.current, []), ne(() => {
    Object.assign(
      o.current,
      xt({ axisId: n, itemId: e })
    );
  });
}
function Po({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsedThreshold: o,
  collapsible: r = !1,
  defaultSize: i,
  disabled: s,
  elementRef: c,
  groupResizeBehavior: a = "preserve-relative-size",
  id: u,
  maxSize: l = "100%",
  minSize: d = "0%",
  onResize: g,
  panelRef: p,
  style: m,
  ...f
}) {
  const y = !!u, h = De(u), S = ot({
    disabled: s
  }), z = B(null), x = Ve(z, c), {
    getPanelStyles: R,
    id: N,
    orientation: $,
    registerPanel: b,
    updatePanelProps: w
  } = rt(), v = g !== null, T = ye(
    (C, I, M) => {
      g?.(C, u, M);
    }
  );
  ne(() => {
    const C = z.current;
    if (C !== null) {
      const I = {
        element: C,
        id: h,
        idIsStable: y,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: v ? T : void 0,
        constraintProps: {
          groupResizeBehavior: a,
          collapsedSize: n,
          collapsedThreshold: o,
          collapsible: r,
          defaultSize: i,
          disabled: S.disabled,
          maxSize: l,
          minSize: d
        }
      };
      return b(I);
    }
  }, [
    a,
    n,
    o,
    r,
    i,
    v,
    h,
    y,
    l,
    d,
    T,
    b,
    S
  ]), He(() => {
    w(h, { disabled: s });
  }, [s, h, w]), Mo(h, p);
  const A = () => {
    const C = R(N, h);
    if (C)
      return JSON.stringify(C);
  }, E = Qe(
    (C) => Be(N, C),
    A,
    A
  );
  let D;
  return E ? D = JSON.parse(E) : i !== void 0 ? D = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: i
  } : D = { flexGrow: 1 }, /* @__PURE__ */ X(
    "div",
    {
      ...f,
      "data-disabled": s || void 0,
      "data-panel": !0,
      "data-testid": h,
      id: h,
      ref: x,
      style: {
        ...To,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...D
      },
      children: /* @__PURE__ */ X(
        "div",
        {
          className: t,
          style: {
            maxHeight: "100%",
            maxWidth: "100%",
            flexGrow: 1,
            overflow: "auto",
            ...m,
            // Inform the browser that the library is handling touch events for this element
            // but still allow users to scroll content within panels in the non-resizing direction
            // NOTE This is not an inherited style
            // See github.com/bvaughn/react-resizable-panels/issues/662
            touchAction: $ === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
Po.displayName = "Panel";
const To = {
  minHeight: 0,
  maxHeight: "100%",
  height: "auto",
  minWidth: 0,
  maxWidth: "100%",
  width: "auto",
  border: "none",
  borderWidth: 0,
  padding: 0,
  margin: 0
};
function Ho() {
  return he(null);
}
function Vo() {
  return B(null);
}
const Do = { flexBasis: "auto" }, ko = { flexGrow: 0, flexShrink: 0 };
function Ao({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: o,
  elementRef: r,
  id: i,
  preview: s,
  style: c,
  ...a
}) {
  const u = De(i), {
    disableCursor: l,
    id: d,
    orientation: g,
    registerSeparator: p,
    updateSeparatorProps: m
  } = rt();
  return /* @__PURE__ */ X(
    xn,
    {
      attributes: a,
      axisId: d,
      axisOrientation: g,
      className: t,
      disableCursor: l,
      disabled: n,
      disableDoubleClick: o,
      elementRef: r,
      id: u,
      preview: s,
      registerSeparator: p,
      requiredStyle: ko,
      style: c,
      styleDefaults: Do,
      updateSeparatorProps: m,
      children: e
    }
  );
}
Ao.displayName = "Separator";
export {
  Dn as Cell,
  ho as Grid,
  wn as Gridline,
  Co as Group,
  Po as Panel,
  Ao as Separator,
  In as SeparatorOverlay,
  kn as isCoarsePointer,
  No as useDefaultGridLayout,
  _o as useDefaultLayout,
  Go as useGridCallbackRef,
  Fo as useGridRef,
  Bo as useGroupCallbackRef,
  qo as useGroupRef,
  Ho as usePanelCallbackRef,
  Vo as usePanelRef
};
//# sourceMappingURL=react-resizable-panels.js.map
