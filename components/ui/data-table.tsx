"use client";

import React, { Children, isValidElement, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SpringSelect } from "./spring-select";
import { formatDate } from "@/lib/datetime";

/* -------------------------------------------------------------------------- */
/*  DataTable — the other half of every dashboard.                             */
/*                                                                             */
/*  • Sortable columns (click: asc → desc → off) · sticky header               */
/*  • Row selection with select-all, shift-click ranges and a bulk-action bar  */

/*  • Sorting makes rows glide to their new place instead of jumping           */
/*  • Narrow containers show a list (CSS container queries, no JS measuring)  */
/*  • Search, "show more" paging, empty state, keyboard + screen-reader support */
/*                                                                             */
/*  One file · deps: react 19, framer-motion, tailwindcss · light + dark.      */
/* -------------------------------------------------------------------------- */

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

type Primitive = string | number | boolean | Date | null | undefined;

export interface DataTableColumn<T> {
  /** Unique id. Also the default property read from the row */
  key: string;
  header: string;
  /** Value used for sorting + search (default: row[key]) */
  accessor?: (row: T) => Primitive;
  /** What to show in the cell (default: the accessor value as text). The same markup
   *  serves the table and the phone list: CSS decides the layout. */
  cell?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Default true */
  sortable?: boolean;
  /** Hotel SES: smallest width this column can be read at, in rem, cell padding included
   *  (default 0). Below the width where the essential columns' minimums fit, the table
   *  shows the phone list instead, so it never scrolls sideways. */
  minWidth?: number;
  /** Share of the remaining width (default: 1.8 for the primary column, 1 otherwise). */
  grow?: number;
  /** Hotel SES: 1 = essential (default). When the list runs out of width, columns with a
   *  higher number are hidden first (highest first); the phone list always shows them. */
  priority?: number;
  /** The row's name: first line of the phone list item. Usually your first column */
  primary?: boolean;
  /** Left out of the phone list (still a column in table mode). */
  hideOnMobile?: boolean;
  /** Label in the phone list's details line (default: header; "" for none) */
  mobileLabel?: string;
  /** In the phone list, put this cell on its own line under the details (actions, sparklines) */
  fullWidthOnMobile?: boolean;
}

/** The one row-action format of every table: small buttons with short labels
 *  (`ROW_BUTTON`), then icon buttons (`ROW_ICON_BUTTON` with `flex-none`: edit, delete). */
export const ROW_BUTTON = "sm" as const;
export const ROW_ICON_BUTTON = "icon-sm" as const;

/** Props for a labelled row button that keeps one width in table mode (so the buttons
 *  line up as a column down the table) and its natural width in the phone list. */
export const rowFixedWidth = (width: string) => ({ className: "dt-fixed", style: { "--dt-w": width } as React.CSSProperties });

/** Row buttons: labelled buttons, then icon buttons (`flex-none`). Right-aligned on one
 *  line in table mode; in the phone list, on their own line under the row's details,
 *  labelled buttons wrapping on the left and icon buttons together on the right. */
export function DataTableActions({ children }: { children: ReactNode }) {
  const isIcon = (c: ReactNode) => isValidElement<{ className?: string }>(c) && (c.props.className ?? "").split(" ").includes("flex-none");
  const all = Children.toArray(children);
  const icons = all.filter(isIcon);
  return (
    <div className="dt-actions">
      <div className="dt-actions-main">{all.filter((c) => !isIcon(c))}</div>
      {icons.length > 0 && <div className="dt-actions-icons">{icons}</div>}
    </div>
  );
}

export type SortState = { key: string; dir: "asc" | "desc" } | null;
type Id = string | number;

export interface DataTableProps<T extends { id: Id }> {
  rows: T[];
  columns: DataTableColumn<T>[];
  /** Readable name for a row, used by checkboxes and screen readers */
  getRowLabel?: (row: T) => string;
  selectable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Extra text to match when searching */
  searchText?: (row: T) => string;
  defaultSort?: SortState;
  /** Controlled sort */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Controlled selection */
  selected?: Id[];
  onSelectionChange?: (ids: Id[]) => void;
  /** Buttons shown in the bar when rows are selected */
  bulkActions?: (selectedIds: Id[]) => ReactNode;
  /** Right side of the toolbar */
  toolbar?: ReactNode;
  /** Rows shown at first; "Show more" reveals this many each time (default 20, Infinity = all) */
  pageSize?: number;
  /** Table mode: scroll height in px before the header sticks (default 520).
   *  Hotel SES: null = no internal scroll (the page scrolls). */
  maxHeight?: number | null;
  density?: "comfortable" | "compact";
  /** Container width below which the table always shows the phone list (default 640) */
  cardBreakpoint?: number;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
const ring = "ring-1 ring-black/[0.07] dark:ring-white/[0.07]";
const hairline = "border-black/[0.06] dark:border-white/[0.07]";
const muted = "text-neutral-500 dark:text-neutral-400"; // Hotel SES: >= 4.5:1 on dark surfaces
const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70 dark:focus-visible:ring-white/40";


/** Nulls last, numbers numerically, dates by time, strings naturally ("item 2" < "item 10") */
function compareValues(a: Primitive, b: Primitive): number {
  if (a instanceof Date) a = +a;
  if (b instanceof Date) b = +b;
  if (typeof a === "boolean") a = a ? 1 : 0;
  if (typeof b === "boolean") b = b ? 1 : 0;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function sortRows<T>(rows: T[], get: (row: T) => Primitive, dir: "asc" | "desc"): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i, v: get(row) }))
    .sort((p, q) => {
      const pn = p.v == null, qn = q.v == null;
      if (pn || qn) return pn && qn ? p.i - q.i : pn ? 1 : -1; // empty values always last
      return compareValues(p.v, q.v) * sign || p.i - q.i; // stable
    })
    .map((x) => x.row);
}

/* ========================================================================== */
/*  Small UI parts                                                            */
/* ========================================================================== */

function Checkbox({
  checked,
  indeterminate,
  onToggle,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onToggle: (e: React.MouseEvent) => void;
  label: string;
}) {
  const on = checked || !!indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={onToggle}
      className={cx(
        "relative grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] transition-[background-color,box-shadow] duration-150 [-webkit-tap-highlight-color:transparent]",
        "before:absolute before:-inset-3 before:content-['']", // generous touch target
        on ? "bg-neutral-900 dark:bg-white" : "bg-transparent ring-1 ring-inset ring-black/20 dark:ring-white/25",
        focus,
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3 text-white dark:text-neutral-900" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path
          d={indeterminate ? "M4 8h8" : "M3.5 8.5l3 3 6-6.5"}
          initial={false}
          animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
        />
      </svg>
    </button>
  );
}

function SortIcon({ state }: { state: "asc" | "desc" | null }) {
  return (
    <svg viewBox="0 0 12 14" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5.2 6 2.2l3 3" className={cx("transition-opacity duration-150", state === "asc" ? "opacity-100" : state === "desc" ? "opacity-20" : "opacity-40")} />
      <path d="M3 8.8l3 3 3-3" className={cx("transition-opacity duration-150", state === "desc" ? "opacity-100" : state === "asc" ? "opacity-20" : "opacity-40")} />
    </svg>
  );
}

/* ========================================================================== */
/*  Layout: CSS container queries (no width measured in JavaScript)           */
/* ========================================================================== */

/**
 * The phone list is the base layout (globals.css, `.dt-*`). Each table adds its own
 * container queries, computed from its columns: from the width where the essential
 * columns fit (and at least `breakpoint`), rows become a grid; optional columns
 * (priority > 1) appear as width allows, lowest priority number first. The server's
 * HTML is therefore right at any width: nothing switches after hydration.
 */
function tableCss<T>(scope: string, columns: DataTableColumn<T>[], primary: DataTableColumn<T>, selectable: boolean, breakpoint: number, cellPadY: number, rowMinHeight: number, maxHeight: number | null) {
  const S = `.${scope}`;
  const check = selectable ? 44 : 0;
  const need = (cs: DataTableColumn<T>[]) => check + cs.reduce((sum, c) => sum + (c.minWidth ?? 0) * 16, 0);
  const tracks = (cs: DataTableColumn<T>[]) =>
    [selectable ? "44px" : null, ...cs.map((c) => `minmax(${c.minWidth ?? 0}rem, ${c.grow ?? (c === primary ? 1.8 : 1)}fr)`)].filter(Boolean).join(" ");
  const col = (c: DataTableColumn<T>) => `${S} [data-col=${JSON.stringify(c.key)}]`;

  // Column sets from the fullest to the leanest: optional columns leave highest priority number first.
  const optional = columns.filter((c) => !c.primary && (c.priority ?? 1) > 1).sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1));
  const sets = [columns];
  for (const c of optional) sets.push(sets[sets.length - 1].filter((x) => x !== c));
  const leanest = sets[sets.length - 1];
  const at = (cs: DataTableColumn<T>[]) => Math.max(breakpoint, need(cs));

  const table = [
    `${S} .dt-sortbar{display:none}`,
    `${S} .dt-grid{display:grid;align-items:center;padding:0;gap:0}`,
    `${S} .dt-row{min-height:${rowMinHeight}px}`,
    `${S} .dt-check{display:grid;place-items:center;align-self:stretch}`,
    `${S} .dt-cell{display:flex;flex:none;max-width:none;padding:${cellPadY}px 12px;font-size:13.5px}`,
    `${S} .dt-cell.dt-end{justify-content:flex-end;text-align:right}`,
    `${S} .dt-cell.dt-center{justify-content:center;text-align:center}`,
    `${S} .dt-label{display:none}`,
    `${S} .dt-value{width:100%}`,
    `${S} .dt-hide-list,${S} .dt-empty{display:flex}`,
    `${S} .dt-actions{justify-content:flex-end;align-items:center}`,
    `${S} .dt-actions-main{flex:none;flex-wrap:nowrap}`,
    `${S} .dt-fixed{width:var(--dt-w)}`,
    maxHeight != null ? `${S} .dt-scroll{max-height:${maxHeight}px;overflow-y:auto;overscroll-behavior:contain}` : "",
  ].join("");

  // Leanest set first, fullest last: a wider container matches more rules, and the last one wins.
  const ranges = [...sets]
    .reverse()
    .map((cs) => `@container dt (min-width:${at(cs)}px){${S} .dt-grid{grid-template-columns:${tracks(cs)}}${optional.map((c) => `${col(c)}{display:${cs.includes(c) ? "flex" : "none"}}`).join("")}}`)
    .join("");

  return `@container dt (min-width:${at(leanest)}px){${table}}${ranges}`;
}

const alignClass = { left: "", right: "dt-end", center: "dt-center" } as const;

/* ========================================================================== */
/*  DataTable                                                                 */
/* ========================================================================== */

export function DataTable<T extends { id: Id }>({
  rows,
  columns,
  getRowLabel = (r) => String(r.id),
  selectable = true,
  searchable = true,
  searchPlaceholder = "Rechercher…",
  searchText,
  defaultSort = null,
  sort: controlledSort,
  onSortChange,
  selected: controlledSelected,
  onSelectionChange,
  bulkActions,
  toolbar,
  pageSize = 20,
  maxHeight = 520,
  density = "comfortable",
  cardBreakpoint = 640,
  onRowClick,
  emptyState,
  ariaLabel = "Tableau de données",
  className = "",
}: DataTableProps<T>) {
  const reduce = useReducedMotion();
  // Scope for this table's container queries (useId is stable between server and client).
  const scope = `dt-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const css = useMemo(
    () => tableCss(scope, columns, primary, selectable, cardBreakpoint, density === "compact" ? 8 : 14, density === "compact" ? 44 : 60, maxHeight),
    [scope, columns, primary, selectable, cardBreakpoint, density, maxHeight],
  );

  const [query, setQuery] = useState("");
  const [innerSort, setInnerSort] = useState<SortState>(defaultSort);
  const [innerSel, setInnerSel] = useState<Id[]>([]);
  const [limit, setLimit] = useState(pageSize);
  const [scrolled, setScrolled] = useState(false);
  const [announce, setAnnounce] = useState("");
  const lastClicked = useRef<number | null>(null);

  const sort = controlledSort !== undefined ? controlledSort : innerSort;
  const selectedIds = controlledSelected ?? innerSel;
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const setSort = (s: SortState) => {
    if (controlledSort === undefined) setInnerSort(s);
    onSortChange?.(s);
    const col = columns.find((c) => c.key === s?.key);
    setAnnounce(s && col ? `Trié par ${col.header}, ordre ${s.dir === "asc" ? "croissant" : "décroissant"}` : "Tri réinitialisé");
  };
  const setSelected = (ids: Id[]) => {
    if (controlledSelected === undefined) setInnerSel(ids);
    onSelectionChange?.(ids);
  };

  const read = useCallback(
    (row: T, col: DataTableColumn<T>): Primitive => (col.accessor ? col.accessor(row) : ((row as Record<string, unknown>)[col.key] as Primitive)),
    [],
  );

  /* ----------------------------- filter + sort ----------------------------- */
  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q)
      list = rows.filter((r) => {
        if (searchText && searchText(r).toLowerCase().includes(q)) return true;
        return columns.some((c) => {
          const v = read(r, c);
          return v != null && String(v instanceof Date ? v.toISOString() : v).toLowerCase().includes(q);
        });
      });
    const col = sort ? columns.find((c) => c.key === sort.key) : undefined;
    return sort && col ? sortRows(list, (r) => read(r, col), sort.dir) : list;
  }, [rows, columns, query, sort, searchText, read]);

  useEffect(() => setLimit(pageSize), [query, pageSize]);
  const visible = processed.slice(0, limit);
  const sortable = columns.filter((c) => c.sortable !== false);

  /* ------------------------------- selection ------------------------------- */
  const allSelected = processed.length > 0 && processed.every((r) => selected.has(r.id));
  const someSelected = processed.some((r) => selected.has(r.id));

  const toggleAll = () => {
    const ids = new Set(selected);
    if (allSelected) processed.forEach((r) => ids.delete(r.id));
    else processed.forEach((r) => ids.add(r.id));
    setSelected([...ids]);
    lastClicked.current = null;
  };
  const toggleRow = (id: Id, index: number, e: React.MouseEvent) => {
    const ids = new Set(selected);
    if (e.shiftKey && lastClicked.current !== null) {
      const [a, b] = [Math.min(lastClicked.current, index), Math.max(lastClicked.current, index)];
      const turnOn = !selected.has(id);
      for (let i = a; i <= b; i++) {
        if (turnOn) ids.add(visible[i].id);
        else ids.delete(visible[i].id);
      }
    } else if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    lastClicked.current = index;
    setSelected([...ids]);
  };

  const clickHeader = (col: DataTableColumn<T>) => {
    if (sort?.key !== col.key) setSort({ key: col.key, dir: "asc" });
    else if (sort.dir === "asc") setSort({ key: col.key, dir: "desc" });
    else setSort(null);
  };

  const spring = reduce ? { duration: 0 } : ({ type: "spring", duration: 0.55, bounce: 0.04 } as const);

  /* -------------------------------- toolbar -------------------------------- */
  const selectionBar = (
    <motion.div
      key="sel"
      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : -6, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex h-full w-full items-center justify-between gap-3"
    >
      <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100" aria-live="polite">
        {selectedIds.length} {selectedIds.length <= 1 ? "sélectionnée" : "sélectionnées"}
      </p>
      <div className="flex items-center gap-1.5">
        {bulkActions?.(selectedIds)}
        <button
          type="button"
          onClick={() => setSelected([])}
          className={`h-9 rounded-xl px-3 text-[12.5px] font-medium text-neutral-500 transition-colors duration-150 [@media(hover:hover)]:hover:bg-black/[0.05] [@media(hover:hover)]:hover:text-neutral-900 dark:[@media(hover:hover)]:hover:bg-white/[0.07] dark:[@media(hover:hover)]:hover:text-neutral-100 ${focus}`}
        >
          Effacer
        </button>
      </div>
    </motion.div>
  );

  const normalBar = (
    <motion.div
      key="tools"
      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : -6, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex h-full w-full items-center justify-between gap-3"
    >
      {searchable ? (
        <label className="relative flex min-w-0 max-w-[320px] flex-1 items-center">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Rechercher dans le tableau"
            className="h-10 w-full rounded-xl bg-black/[0.04] pl-9 pr-3 text-[16px] text-neutral-900 outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-400/50 dark:bg-white/[0.05] dark:text-neutral-100 sm:h-9 sm:text-[13.5px] dark:focus:ring-white/25 [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      ) : (
        <span className={`text-[13px] ${muted}`}>{processed.length} {processed.length <= 1 ? "ligne" : "lignes"}</span>
      )}
      <div className="flex shrink-0 items-center gap-2">
        {searchable && <span className={`hidden text-[12.5px] tabular-nums sm:block ${muted}`}>{processed.length} {processed.length <= 1 ? "ligne" : "lignes"}</span>}
        {toolbar}
      </div>
    </motion.div>
  );

  /* ---------------------------------- cells --------------------------------- */
  const renderCell = (row: T, col: DataTableColumn<T>): ReactNode => {
    if (col.cell) return col.cell(row);
    const v = read(row, col);
    return v == null ? <span className="text-neutral-400">—</span> : String(v instanceof Date ? formatDate(v) : v); // Hotel SES: dd/MM/yyyy, hotel time
  };

  /* ------------------------------ render: header ---------------------------- */
  // Phone list: a sort menu (the list has no column headers). Hidden in table mode.
  const sortBar = (
    <div className="dt-sortbar mb-3 flex items-center gap-3">
      {selectable && <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onToggle={toggleAll} label="Sélectionner toutes les lignes" />}
      <SpringSelect
        aria-label="Trier par"
        className="flex-1"
        triggerClassName="h-11"
        value={sort?.key ?? ""}
        onChange={(key) => setSort(key ? { key, dir: sort?.dir ?? "desc" } : null)}
        options={[
          { value: "", label: "Tri : ordre par défaut" },
          ...sortable.map((c) => ({ value: c.key, label: `Tri : ${c.header}` })),
        ]}
      />
      <button
        type="button"
        disabled={!sort}
        aria-label={sort?.dir === "asc" ? "Tri croissant. Passer en décroissant" : "Tri décroissant. Passer en croissant"}
        onClick={() => sort && setSort({ key: sort.key, dir: sort.dir === "asc" ? "desc" : "asc" })}
        className={`grid size-11 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-neutral-600 transition-opacity active:scale-[0.96] disabled:opacity-40 dark:bg-white/[0.05] dark:text-neutral-300 ${focus}`}
      >
        <SortIcon state={sort?.dir ?? null} />
      </button>
    </div>
  );

  // Table mode: column headers. Hidden in the phone list.
  const header = (
    <div
      role="row"
      className={cx(
        "dt-head dt-grid sticky top-0 z-10 border-b bg-white/90 text-[12px] font-medium backdrop-blur dark:bg-surface/90",
        hairline,
        scrolled && "shadow-[0_8px_16px_-12px_rgba(0,0,0,0.25)]",
      )}
    >
      {selectable && (
        <div role="columnheader" className="dt-check grid h-11 place-items-center">
          <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onToggle={toggleAll} label="Sélectionner toutes les lignes" />
        </div>
      )}
      {columns.map((c) => {
        const state = sort?.key === c.key ? sort.dir : null;
        const can = c.sortable !== false;
        return (
          <div
            key={c.key}
            role="columnheader"
            data-col={c.key}
            aria-sort={state === "asc" ? "ascending" : state === "desc" ? "descending" : can ? "none" : undefined}
            className={cx("flex h-11 min-w-0 items-center px-3", c.align === "right" ? "justify-end text-right" : c.align === "center" ? "justify-center text-center" : "justify-start text-left")}
          >
            {can ? (
              <button
                type="button"
                onClick={() => clickHeader(c)}
                className={cx(
                  "-mx-2 inline-flex h-8 min-w-0 max-w-[calc(100%+1rem)] items-center gap-1.5 rounded-lg px-2 transition-colors duration-150 [-webkit-tap-highlight-color:transparent]",
                  c.align === "right" && "flex-row-reverse",
                  state ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500 [@media(hover:hover)]:hover:text-neutral-900 dark:[@media(hover:hover)]:hover:text-neutral-100",
                  focus,
                )}
              >
                <span className="truncate">{c.header}</span>
                <SortIcon state={state} />
              </button>
            ) : (
              <span className="truncate text-neutral-500">{c.header}</span>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ------------------------------- render: rows ------------------------------ */
  // One markup for both layouts: the phone list by default (name, a line of
  // "label value" details, full-width cells such as actions), a grid row in table mode.
  const rowEls = visible.map((row, index) => {
    const isSel = selected.has(row.id);
    const label = getRowLabel(row);
    const interactive = onRowClick
      ? {
          tabIndex: 0,
          onClick: (e: React.MouseEvent) => {
            if (!(e.target as HTMLElement).closest("button,a,input,select,label")) onRowClick(row);
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onRowClick(row);
            }
          },
        }
      : {};

    return (
      <motion.div
        key={row.id}
        layout={reduce ? false : "position"}
        initial={false}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={spring}
        role="row"
        aria-selected={selectable ? isSel : undefined}
        aria-rowindex={index + 2}
        {...interactive}
        className={cx(
          "dt-row dt-grid border-b bg-white transition-colors duration-150 last:border-b-0 dark:bg-surface",
          hairline,
          isSel ? "bg-neutral-50 dark:bg-white/[0.045]" : "[@media(hover:hover)]:hover:bg-neutral-50/70 dark:[@media(hover:hover)]:hover:bg-white/[0.025]",
          onRowClick && cx("cursor-pointer", focus),
        )}
      >
        {selectable && (
          <div role="cell" className="dt-check">
            <Checkbox checked={isSel} onToggle={(e) => toggleRow(row.id, index, e)} label={`Sélectionner ${label}`} />
          </div>
        )}
        {columns.map((c) => {
          const value = renderCell(row, c);
          const isPrimary = c === primary;
          const name = isPrimary || c.fullWidthOnMobile ? "" : (c.mobileLabel ?? c.header);
          return (
            <div
              key={c.key}
              role="cell"
              data-col={c.key}
              className={cx(
                "dt-cell min-w-0",
                alignClass[c.align ?? "left"],
                isPrimary ? "dt-primary font-medium text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300",
                c.fullWidthOnMobile && "dt-wide",
                c.hideOnMobile && "dt-hide-list",
                (value == null || value === false) && "dt-empty",
              )}
            >
              {name && <span className={cx("dt-label shrink-0", muted)}>{name}</span>}
              <div className="dt-value min-w-0 [overflow-wrap:anywhere]">{value}</div>
            </div>
          );
        })}
      </motion.div>
    );
  });

  const empty = (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {emptyState ?? (
        <>
          <p className="text-[14px] font-medium text-neutral-900 dark:text-neutral-100">Aucun résultat</p>
          <p className={`text-[13px] ${muted}`}>{query ? `Aucun résultat pour « ${query} ».` : "Rien à afficher pour le moment."}</p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className={`h-9 rounded-xl bg-black/[0.05] px-3.5 text-[12.5px] font-medium text-neutral-700 transition-transform active:scale-[0.97] dark:bg-white/[0.07] dark:text-neutral-200 ${focus}`}
            >
              Effacer la recherche
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={cx("dt w-full text-neutral-700 antialiased dark:text-neutral-300", scope, className)}>
      <style>{css}</style>
      {/* toolbar / selection bar (same height so nothing jumps). Hotel SES: omitted when
          there is nothing to put in it (no search, tools or selection), e.g. when the
          page already filters the rows in its own toolbar. */}
      {(searchable || toolbar || selectable) && (
        <div className="relative mb-3 h-11">
          <AnimatePresence mode="wait" initial={false}>
            {selectedIds.length > 0 && selectable ? selectionBar : normalBar}
          </AnimatePresence>
        </div>
      )}

      {sortBar}

      <div
        className={cx("overflow-hidden rounded-2xl bg-white dark:bg-surface", ring)}
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 24px 48px -32px rgba(0,0,0,0.2)" }}
      >
        {/* Hotel SES: only a height-capped table (table mode, `maxHeight`) is its own
            vertical scroller; uncapped, wheel and touch scrolling pass to the page. */}
        <motion.div layoutScroll onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)} className="dt-scroll">
          <div role="table" aria-label={ariaLabel} aria-rowcount={processed.length + 1} aria-colcount={columns.length + (selectable ? 1 : 0)}>
            {header}
            <div role="rowgroup" className="relative">
              <AnimatePresence initial={false} mode="popLayout">
                {rowEls}
              </AnimatePresence>
              {processed.length === 0 && empty}
            </div>
          </div>
        </motion.div>

        {processed.length > limit && (
          <div className={cx("flex items-center justify-between gap-3 border-t px-4 py-3 text-[12.5px]", hairline)}>
            <span className={`tabular-nums ${muted}`}>
              {visible.length} sur {processed.length} affichées
            </span>
            <button
              type="button"
              onClick={() => setLimit((l) => l + pageSize)}
              className={`h-9 rounded-xl bg-black/[0.05] px-3.5 text-[12.5px] font-medium text-neutral-700 transition-transform active:scale-[0.97] dark:bg-white/[0.07] dark:text-neutral-200 [@media(hover:hover)]:hover:bg-black/[0.08] dark:[@media(hover:hover)]:hover:bg-white/[0.11] ${focus}`}
            >
              Afficher {Math.min(pageSize, processed.length - limit)} de plus
            </button>
          </div>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

export default DataTable;
