"use client";

import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SpringSelect } from "./spring-select";
import { useElementWidth } from "@/hooks/useElementWidth";
import { formatDate } from "@/lib/datetime";

/* -------------------------------------------------------------------------- */
/*  DataTable — the other half of every dashboard.                             */
/*                                                                             */
/*  • Sortable columns (click: asc → desc → off) · sticky header               */
/*  • Row selection with select-all, shift-click ranges and a bulk-action bar  */

/*  • Sorting makes rows glide to their new place instead of jumping           */
/*  • Under 640px the table becomes stacked cards (with a sort menu)           */
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
  /** What to show in the cell (default: the accessor value as text). `layout` says
   *  whether it renders in a table row or on a stacked card (e.g. bigger touch targets). */
  cell?: (row: T, ctx: CellContext) => ReactNode;
  align?: "left" | "right" | "center";
  /** Default true */
  sortable?: boolean;
  /** Hotel SES: smallest width this column can be read at, in rem, cell padding included
   *  (default 0). The table switches to cards when the columns' minimums no longer fit,
   *  so it never scrolls sideways. */
  minWidth?: number;
  /** Share of the remaining width (default: 1.8 for the primary column, 1 otherwise). */
  grow?: number;
  /** The card title on mobile. Usually your first column */
  primary?: boolean;
  hideOnMobile?: boolean;
  /** Label used on mobile cards (default: header) */
  mobileLabel?: string;
  /** On mobile cards, give this cell the whole row width (great for sparklines) */
  fullWidthOnMobile?: boolean;
}

export type CellContext = { layout: "table" | "cards" };

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
  /** Table scroll height in px before the header sticks (default 520) */
  /** Hotel SES: null = no internal scroll (the page scrolls; sticky header off) */
  maxHeight?: number | null;
  density?: "comfortable" | "compact";
  /** Width below which rows become cards (default 640) */
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

const alignClass = { left: "justify-start text-left", right: "justify-end text-right", center: "justify-center text-center" } as const;

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
  const [rootRef, width] = useElementWidth<HTMLDivElement>(960);
  // Hotel SES: switch to cards whenever the table cannot fit its columns' minimum
  // widths (e.g. next to the sidebar on tablets), not only below a fixed breakpoint.
  const minTableWidth = useMemo(
    () => columns.reduce((sum, c) => sum + (c.minWidth ?? 0) * 16, selectable ? 44 : 0),
    [columns, selectable],
  );
  const cards = width < Math.max(cardBreakpoint, minTableWidth);
  /** Table mode with a height cap: the body is its own vertical scroller. */
  const scrollsY = !cards && maxHeight != null;

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

  const cols = cards ? columns.filter((c) => !c.hideOnMobile) : columns;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const sortable = columns.filter((c) => c.sortable !== false);

  // Every row is its own grid; minmax(<length>, <fr>) tracks resolve identically in
  // each row, so columns line up without a fixed width anywhere.
  const tracks = [selectable ? "44px" : null, ...cols.map((c) => `minmax(${c.minWidth ?? 0}rem, ${c.grow ?? (c === primary ? 1.8 : 1)}fr)`)]
    .filter(Boolean)
    .join(" ");

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
  const rowPad = density === "compact" ? "py-2" : "py-3.5";
  const rowMin = density === "compact" ? "min-h-[44px]" : "min-h-[60px]";

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
    if (col.cell) return col.cell(row, { layout: cards ? "cards" : "table" });
    const v = read(row, col);
    return v == null ? <span className="text-neutral-400">—</span> : String(v instanceof Date ? formatDate(v) : v); // Hotel SES: dd/MM/yyyy, hotel time
  };

  /* ------------------------------ render: header ---------------------------- */
  const header = cards ? (
    <div className={cx("flex items-center gap-3 px-1 pb-3")}>
      {selectable && <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onToggle={toggleAll} label="Sélectionner toutes les lignes" />}
      <SpringSelect
        aria-label="Trier par"
        className="ml-1 flex-1"
        triggerClassName="h-10"
        value={sort?.key ?? ""}
        onChange={(key) => setSort(key ? { key, dir: sort?.dir ?? "desc" } : null)}
        options={[
          { value: "", label: "Tri : ordre par défaut" },
          ...sortable.map((c) => ({ value: c.key, label: `Tri : ${c.header}` })),
        ]}
      />
      <button
        type="button"
        disabled={!sort}
        aria-label={sort?.dir === "asc" ? "Tri croissant. Passer en décroissant" : "Tri décroissant. Passer en croissant"}
        onClick={() => sort && setSort({ key: sort.key, dir: sort.dir === "asc" ? "desc" : "asc" })}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-neutral-600 transition-opacity active:scale-[0.96] disabled:opacity-40 dark:bg-white/[0.05] dark:text-neutral-300 ${focus}`}
      >
        <SortIcon state={sort?.dir ?? null} />
      </button>
    </div>
  ) : (
    <div
      role="row"
      className={cx(
        "sticky top-0 z-10 grid items-center border-b bg-white/90 text-[12px] font-medium backdrop-blur dark:bg-surface/90",
        hairline,
        scrolled && "shadow-[0_8px_16px_-12px_rgba(0,0,0,0.25)]",
      )}
      style={{ gridTemplateColumns: tracks }}
    >
      {selectable && (
        <div role="columnheader" className="grid h-11 place-items-center">
          <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onToggle={toggleAll} label="Sélectionner toutes les lignes" />
        </div>
      )}
      {cols.map((c) => {
        const state = sort?.key === c.key ? sort.dir : null;
        const can = c.sortable !== false;
        return (
          <div
            key={c.key}
            role="columnheader"
            aria-sort={state === "asc" ? "ascending" : state === "desc" ? "descending" : can ? "none" : undefined}
            className={cx("flex h-11 min-w-0 items-center px-3", alignClass[c.align ?? "left"])}
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
  const rowEls = visible.map((row, index) => {
    const isSel = selected.has(row.id);
    const label = getRowLabel(row);
    const common = {
      role: "row" as const,
      "aria-selected": selectable ? isSel : undefined,
      "aria-rowindex": index + 2,
    };
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

    if (cards) {
      const rest = cols.filter((c) => c !== primary);
      return (
        <motion.div
          key={row.id}
          layout={reduce ? false : "position"}
          initial={false}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={spring}
          {...common}
          {...interactive}
          className={cx(
            "rounded-2xl bg-white p-4 dark:bg-surface",
            ring,
            isSel && "bg-neutral-50 ring-neutral-900/25 dark:bg-white/[0.04] dark:ring-white/25",
            onRowClick && cx("cursor-pointer", focus),
          )}
        >
          <div className="flex items-start gap-3">
            {selectable && (
              <div className="pt-0.5">
                <Checkbox checked={isSel} onToggle={(e) => toggleRow(row.id, index, e)} label={`Sélectionner ${label}`} />
              </div>
            )}
            <div role="cell" className="min-w-0 flex-1 text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
              {renderCell(row, primary)}
            </div>
          </div>
          {rest.length > 0 && (
            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3.5 pl-0 sm:pl-0">
              {rest.map((c) => {
                // Hotel SES: skip empty cells (e.g. no actions) and empty labels on cards
                const value = renderCell(row, c);
                if (value == null || value === false) return null;
                const label = c.mobileLabel ?? c.header;
                return (
                  <div key={c.key} role="cell" className={cx("min-w-0", c.fullWidthOnMobile && "col-span-2")}>
                    {label && <p className={`mb-1 text-[11.5px] ${muted}`}>{label}</p>}
                    {/* Hotel SES: values never exceed their cell (long text wraps or truncates) */}
                    <div className="min-w-0 max-w-full overflow-hidden text-[13.5px] text-neutral-800 [overflow-wrap:anywhere] dark:text-neutral-200 [&>*]:max-w-full">{value}</div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        key={row.id}
        layout={reduce ? false : "position"}
        initial={false}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={spring}
        {...common}
        {...interactive}
        className={cx(
          "grid items-center border-b bg-white transition-colors duration-150 last:border-b-0 dark:bg-surface",
          hairline,
          rowMin,
          isSel ? "bg-neutral-50 dark:bg-white/[0.045]" : "[@media(hover:hover)]:hover:bg-neutral-50/70 dark:[@media(hover:hover)]:hover:bg-white/[0.025]",
          onRowClick && cx("cursor-pointer", focus),
        )}
        style={{ gridTemplateColumns: tracks }}
      >
        {selectable && (
          <div role="cell" className="grid place-items-center">
            <Checkbox checked={isSel} onToggle={(e) => toggleRow(row.id, index, e)} label={`Sélectionner ${label}`} />
          </div>
        )}
        {cols.map((c) => (
          <div
            key={c.key}
            role="cell"
            className={cx(
              "flex min-w-0 items-center px-3 text-[13.5px]",
              rowPad,
              alignClass[c.align ?? "left"],
              c === primary ? "font-medium text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300",
            )}
          >
            <div className="w-full min-w-0">{renderCell(row, c)}</div>
          </div>
        ))}
      </motion.div>
    );
  });

  const empty = (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {emptyState ?? (
        <>
          <p className="text-[14px] font-medium text-neutral-900 dark:text-neutral-100">Aucun résultat</p>
          <p className={`text-[13px] ${muted}`}>{query ? `Aucun résultat pour « ${query} ».` : "Rien à afficher pour le moment."}</p>
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
    <div ref={rootRef} className={cx("w-full text-neutral-700 antialiased dark:text-neutral-300", className)}>
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

      <div
        className={cx(!cards && "overflow-hidden rounded-2xl bg-white dark:bg-surface", !cards && ring)}
        style={!cards ? { boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 24px 48px -32px rgba(0,0,0,0.2)" } : undefined}
      >
        {cards && header}
        {/* Hotel SES: only a height-capped table is its own vertical scroller (and may
            contain its scroll). Uncapped, it must let vertical wheel/touch scrolling
            pass to the page: containing it there froze the page under the cursor. */}
        <motion.div
          layoutScroll
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}
          className={cx(scrollsY && "overflow-y-auto overscroll-contain")}
          style={scrollsY ? { maxHeight } : undefined}
          tabIndex={scrollsY ? 0 : undefined}
          aria-label={scrollsY ? `${ariaLabel} (défilant)` : undefined}
        >
          <div
            role="table"
            aria-label={ariaLabel}
            aria-rowcount={processed.length + 1}
            aria-colcount={cols.length + (selectable ? 1 : 0)}
          >
            {!cards && header}
            <div role="rowgroup" className={cx("relative", cards && "grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] items-start gap-2.5")}>
              <AnimatePresence initial={false} mode="popLayout">
                {rowEls}
              </AnimatePresence>
              {processed.length === 0 && empty}
            </div>
          </div>
        </motion.div>

        {processed.length > limit && (
          <div className={cx("flex items-center justify-between gap-3 px-4 py-3 text-[12.5px]", !cards && cx("border-t", hairline), cards && "pt-4")}>
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

