import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";

// ─── Article types ───

export type KBArticle = {
  id: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  category: "product_help" | "doctrine" | "domain";
  relatedIds?: string[];
};

// ─── Reading state (persisted in localStorage) ───

type ReadingState = {
  bookmarkedIds: string[];
  readIds: string[];
  notes: Record<string, string>;
  struggles: string[];
};

const STORAGE_KEY = "ois_kb_reading_state";

function loadReadingState(): ReadingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { bookmarkedIds: [], readIds: [], notes: {}, struggles: [] };
}

function saveReadingState(state: ReadingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Reading Engine Component ───

type ReadingEngineProps = {
  articles: KBArticle[];
};

type FilterMode = "all" | "bookmarked" | "unread" | "struggle";

export function ReadingEngine({ articles }: ReadingEngineProps) {
  const [state, setState] = useState<ReadingState>(loadReadingState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [focusMode, setFocusMode] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => { saveReadingState(state); }, [state]);

  const selectedArticle = articles.find((a) => a.id === selectedId) ?? null;

  // Sync notes draft when selection changes
  useEffect(() => {
    setNotesDraft(selectedId ? (state.notes[selectedId] ?? "") : "");
  }, [selectedId]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const article of articles) {
      for (const tag of article.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [articles]);

  const allCategories = useMemo(() => {
    return [...new Set(articles.map((a) => a.category))].sort();
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter((article) => {
      if (filterMode === "bookmarked" && !state.bookmarkedIds.includes(article.id)) return false;
      if (filterMode === "unread" && state.readIds.includes(article.id)) return false;
      if (filterMode === "struggle" && !state.struggles.includes(article.id)) return false;
      if (categoryFilter !== "all" && article.category !== categoryFilter) return false;
      if (tagFilter !== "all" && !article.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [articles, filterMode, categoryFilter, tagFilter, state]);

  const toggleBookmark = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      bookmarkedIds: prev.bookmarkedIds.includes(id)
        ? prev.bookmarkedIds.filter((x) => x !== id)
        : [...prev.bookmarkedIds, id],
    }));
  }, []);

  const markRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      readIds: prev.readIds.includes(id) ? prev.readIds : [...prev.readIds, id],
    }));
  }, []);

  const toggleStruggle = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      struggles: prev.struggles.includes(id)
        ? prev.struggles.filter((x) => x !== id)
        : [...prev.struggles, id],
    }));
  }, []);

  const saveNotes = useCallback((id: string, text: string) => {
    setState((prev) => ({
      ...prev,
      notes: { ...prev.notes, [id]: text },
    }));
  }, []);

  const progressPct = articles.length
    ? Math.round((state.readIds.length / articles.length) * 100)
    : 0;

  // ─── Focus mode: show only the selected article ───
  if (focusMode && selectedArticle) {
    return (
      <div className="view-stack">
        <SectionCard
          eyebrow="Focus mode"
          title={selectedArticle.title}
          description="Reading without distraction. Close focus mode to return to the full list."
          actions={
            <button className="btn btn-secondary" onClick={() => setFocusMode(false)}>
              Exit focus mode
            </button>
          }
        >
          <div style={{ lineHeight: 1.7, fontSize: "var(--text-body, 15px)", maxWidth: 720 }}>
            <p>{selectedArticle.body || selectedArticle.summary}</p>
          </div>
          <div style={{ marginTop: "var(--space-4, 16px)", borderTop: "1px solid var(--border, #e0e0e0)", paddingTop: "var(--space-3, 12px)" }}>
            <label style={{ fontWeight: 600, fontSize: "var(--text-sm, 13px)", display: "block", marginBottom: "var(--space-2, 8px)" }}>
              Your notes
            </label>
            <textarea
              className="progress-textarea"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Capture your observations, questions, or insights..."
              style={{ minHeight: 80 }}
            />
            <div style={{ display: "flex", gap: "var(--space-2, 8px)", marginTop: "var(--space-2, 8px)" }}>
              <button
                className="btn btn-secondary"
                onClick={() => saveNotes(selectedArticle.id, notesDraft)}
                disabled={notesDraft === (state.notes[selectedArticle.id] ?? "")}
              >
                Save notes
              </button>
              <button className="btn btn-secondary" onClick={() => { markRead(selectedArticle.id); setFocusMode(false); }}>
                Mark read and close
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ─── Main reading engine view ───
  return (
    <SectionCard
      eyebrow="Reading engine"
      title="Study and internalize"
      description="Track your reading progress, bookmark important articles, mark struggles, and take notes. This is a learning system, not just a page list."
    >
      {/* Progress strip */}
      <div style={{ marginBottom: "var(--space-4, 16px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm, 13px)", marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>Reading progress</span>
          <span>{state.readIds.length}/{articles.length} articles read ({progressPct}%)</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2, #f0f0f0)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--success, #16a34a)", borderRadius: 3, transition: "width 0.3s ease" }} />
        </div>
        <div className="dependency-list" style={{ marginTop: "var(--space-2, 8px)" }}>
          <span>{state.bookmarkedIds.length} bookmarked</span>
          <span>{state.struggles.length} marked as struggle</span>
          <span>{Object.values(state.notes).filter(Boolean).length} with notes</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "var(--space-2, 8px)", flexWrap: "wrap", marginBottom: "var(--space-4, 16px)" }}>
        {(["all", "bookmarked", "unread", "struggle"] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            className={`status-pill ${filterMode === mode ? "active" : ""}`}
            onClick={() => setFilterMode(mode)}
          >
            {mode === "all" ? `All (${articles.length})` : mode === "bookmarked" ? `Bookmarked (${state.bookmarkedIds.length})` : mode === "unread" ? `Unread (${articles.length - state.readIds.length})` : `Struggle (${state.struggles.length})`}
          </button>
        ))}
        {allCategories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "4px 12px", fontSize: "var(--text-sm, 14px)" }}
          >
            <option value="all">All categories</option>
            {allCategories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        )}
        {allTags.length > 1 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "4px 12px", fontSize: "var(--text-sm, 14px)" }}
          >
            <option value="all">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Article list */}
      <div className="library-grid">
        {filtered.map((article) => {
          const isRead = state.readIds.includes(article.id);
          const isBookmarked = state.bookmarkedIds.includes(article.id);
          const isStruggle = state.struggles.includes(article.id);
          const hasNotes = Boolean(state.notes[article.id]);
          const isSelected = selectedId === article.id;

          return (
            <article
              key={article.id}
              className={`library-card library-card-selectable ${isSelected ? "selected" : ""}`}
              style={{ opacity: isRead && filterMode === "all" ? 0.7 : 1, cursor: "pointer" }}
              onClick={() => { setSelectedId(article.id); markRead(article.id); }}
            >
              <div className="thread-row">
                <span style={{ textTransform: "capitalize" }}>{article.category.replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: "var(--space-1, 4px)" }}>
                  {isRead && <em style={{ color: "var(--success, #16a34a)" }}>read</em>}
                  {isBookmarked && <em style={{ color: "var(--warning, #f59e0b)" }}>saved</em>}
                  {isStruggle && <em style={{ color: "var(--danger, #dc2626)" }}>struggle</em>}
                  {hasNotes && <em>notes</em>}
                </div>
              </div>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <div className="dependency-list">
                {article.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </article>
          );
        })}
        {!filtered.length && (
          <div className="empty-state compact">
            <p>No articles match the current filter.</p>
          </div>
        )}
      </div>

      {/* Selected article detail */}
      {selectedArticle && (
        <div style={{ marginTop: "var(--space-4, 16px)", borderTop: "1px solid var(--border, #e0e0e0)", paddingTop: "var(--space-4, 16px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3, 12px)" }}>
            <div>
              <p className="section-eyebrow" style={{ textTransform: "capitalize" }}>{selectedArticle.category.replace(/_/g, " ")}</p>
              <h3 style={{ margin: 0 }}>{selectedArticle.title}</h3>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2, 8px)" }}>
              <button className="btn btn-secondary" style={{ fontSize: "var(--text-xs, 11px)", padding: "2px 10px" }} onClick={() => toggleBookmark(selectedArticle.id)}>
                {state.bookmarkedIds.includes(selectedArticle.id) ? "Remove bookmark" : "Bookmark"}
              </button>
              <button className="btn btn-secondary" style={{ fontSize: "var(--text-xs, 11px)", padding: "2px 10px" }} onClick={() => toggleStruggle(selectedArticle.id)}>
                {state.struggles.includes(selectedArticle.id) ? "Clear struggle" : "Mark struggle"}
              </button>
              <button className="btn btn-secondary" style={{ fontSize: "var(--text-xs, 11px)", padding: "2px 10px" }} onClick={() => setFocusMode(true)}>
                Focus mode
              </button>
            </div>
          </div>
          <div style={{ lineHeight: 1.7, fontSize: "var(--text-body, 15px)", maxWidth: 720 }}>
            <p>{selectedArticle.body || selectedArticle.summary}</p>
          </div>
          {/* Notes */}
          <div style={{ marginTop: "var(--space-3, 12px)" }}>
            <label style={{ fontWeight: 600, fontSize: "var(--text-sm, 13px)", display: "block", marginBottom: "var(--space-2, 8px)" }}>
              Your notes
            </label>
            <textarea
              className="progress-textarea"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Capture your observations, questions, or insights..."
              style={{ minHeight: 60 }}
            />
            {notesDraft !== (state.notes[selectedArticle.id] ?? "") && (
              <button className="btn btn-secondary" style={{ marginTop: "var(--space-2, 8px)" }} onClick={() => saveNotes(selectedArticle.id, notesDraft)}>
                Save notes
              </button>
            )}
          </div>
          {/* Related */}
          {selectedArticle.relatedIds?.length ? (
            <div style={{ marginTop: "var(--space-3, 12px)" }}>
              <p className="section-eyebrow">Related articles</p>
              <div className="dependency-list">
                {selectedArticle.relatedIds.map((id) => {
                  const related = articles.find((a) => a.id === id);
                  return related ? (
                    <button key={id} className="btn btn-secondary" style={{ fontSize: "var(--text-xs, 11px)", padding: "2px 10px" }} onClick={() => { setSelectedId(id); markRead(id); }}>
                      {related.title}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
