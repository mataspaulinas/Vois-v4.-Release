import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchKBReadingState, saveKBReadingState } from "../../lib/api";
import { Select } from "../../components/ui/Select";
import Icon from "../../components/Icon";
import { ds, pillStyle } from "../../styles/tokens";

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

function persistReadingState(state: ReadingState) {
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
  const backendSynced = useRef(false);

  // Load from backend on mount, then merge with localStorage
  useEffect(() => {
    fetchKBReadingState().then((remote) => {
      if (remote) {
        setState((local) => ({
          bookmarkedIds: remote.bookmarked_ids.length ? remote.bookmarked_ids : local.bookmarkedIds,
          readIds: [...new Set([...local.readIds, ...remote.read_ids])],
          notes: { ...local.notes, ...remote.notes },
          struggles: [...new Set([...local.struggles, ...remote.struggles])],
        }));
        backendSynced.current = true;
      }
    }).catch(() => { /* offline fallback to localStorage */ });
  }, []);

  // Save to localStorage + backend on state change
  useEffect(() => {
    persistReadingState(state);
    if (backendSynced.current) {
      saveKBReadingState({
        bookmarked_ids: state.bookmarkedIds,
        read_ids: state.readIds,
        notes: state.notes,
        struggles: state.struggles,
      }).catch(() => { /* silent -- localStorage is the fallback */ });
    }
  }, [state]);

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
      <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
        <section className="ui-card" style={{ padding: "32px 32px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <p style={ds.eyebrow}>FOCUS MODE</p>
              <h2 style={ds.sectionTitle}>{selectedArticle.title}</h2>
              <p className="small-text" style={{ marginTop: 4 }}>Reading without distraction. Close focus mode to return to the full list.</p>
            </div>
            <button style={ds.btnSecondary} onClick={() => setFocusMode(false)}>Exit focus mode</button>
          </div>
          <div style={{ lineHeight: 1.6, fontSize: 15, color: "var(--color-text-secondary)", maxWidth: 800 }}>
            <p style={{ margin: 0 }}>{selectedArticle.body || selectedArticle.summary}</p>
          </div>
          <div style={{ marginTop: 24, borderTop: "1px solid var(--color-border-subtle)", paddingTop: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 8, color: "var(--color-text-primary)" }}>Your notes</label>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Capture your observations, questions, or insights..."
              className="ui-textarea" style={{ minHeight: 80 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-secondary" style={{ opacity: notesDraft === (state.notes[selectedArticle.id] ?? "") ? 0.5 : 1 }}
                onClick={() => saveNotes(selectedArticle.id, notesDraft)}
                disabled={notesDraft === (state.notes[selectedArticle.id] ?? "")}
              >
                Save notes
              </button>
              <button style={ds.btnSecondary} onClick={() => { markRead(selectedArticle.id); setFocusMode(false); }}>
                Mark read and close
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ─── Main reading engine view ───
  return (
    <section style={ds.card}>
      <p style={ds.eyebrow}>READING ENGINE</p>
      <h2 style={ds.sectionTitle}>Study and internalize</h2>
      <p className="small-text" style={{ marginTop: 4, maxWidth: 720 }}>
        Track your reading progress, bookmark important articles, mark struggles, and take notes.
      </p>

      {/* Progress strip */}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>Reading progress</span>
          <span style={{ color: "var(--color-text-muted)" }}>{state.readIds.length}/{articles.length} articles read ({progressPct}%)</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--color-surface-subtle)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: ds.success, borderRadius: 3, transition: "width 300ms ease" }} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, color: "var(--color-text-muted)" }}>
          <span>{state.bookmarkedIds.length} bookmarked</span>
          <span>{state.struggles.length} marked as struggle</span>
          <span>{Object.values(state.notes).filter(Boolean).length} with notes</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {(["all", "bookmarked", "unread", "struggle"] as FilterMode[]).map((mode) => (
          <button key={mode} style={pillStyle(filterMode === mode)} onClick={() => setFilterMode(mode)}>
            {mode === "all" ? `All (${articles.length})` : mode === "bookmarked" ? `Bookmarked (${state.bookmarkedIds.length})` : mode === "unread" ? `Unread (${articles.length - state.readIds.length})` : `Struggle (${state.struggles.length})`}
          </button>
        ))}
        {allCategories.length > 1 && (
          <Select
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v)}
            options={[
              { value: "all", label: "All categories" },
              ...allCategories.map((c) => ({ value: c, label: c.replace(/_/g, " ") })),
            ]}
          />
        )}
        {allTags.length > 1 && (
          <Select
            value={tagFilter}
            onChange={(v) => setTagFilter(v)}
            options={[
              { value: "all", label: "All tags" },
              ...allTags.map((t) => ({ value: t, label: t })),
            ]}
          />
        )}
      </div>

      {/* Article list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((article) => {
          const isRead = state.readIds.includes(article.id);
          const isBookmarked = state.bookmarkedIds.includes(article.id);
          const isStruggle = state.struggles.includes(article.id);
          const hasNotes = Boolean(state.notes[article.id]);
          const isSelected = selectedId === article.id;

          return (
            <article
              key={article.id}
              className="ui-card"
              style={{
                padding: "16px 20px", cursor: "pointer",
                opacity: isRead && filterMode === "all" ? 0.7 : 1,
                border: isSelected ? `1.5px solid ${ds.accent}` : "1px solid var(--color-border-subtle)",
                transition: "all 180ms ease",
              }}
              onClick={() => { setSelectedId(article.id); markRead(article.id); }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 6 }}>
                <span style={{ textTransform: "capitalize" }}>{article.category.replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {isRead && <span style={{ color: ds.success, fontWeight: 500 }}>read</span>}
                  {isBookmarked && <span style={{ color: ds.warning, fontWeight: 500 }}>saved</span>}
                  {isStruggle && <span style={{ color: ds.danger, fontWeight: 500 }}>struggle</span>}
                  {hasNotes && <span style={{ fontWeight: 500 }}>notes</span>}
                </div>
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{article.title}</h3>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45 }}>{article.summary}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {article.tags.map((tag) => <span key={tag} style={ds.tag}>{tag}</span>)}
              </div>
            </article>
          );
        })}
        {!filtered.length && (
          <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)", gridColumn: "1 / -1" }}>
            No articles match the current filter.
          </p>
        )}
      </div>

      {/* Selected article detail */}
      {selectedArticle && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--color-border-subtle)", paddingTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <p className="eyebrow" style={{ textTransform: "capitalize" }}>{selectedArticle.category.replace(/_/g, " ")}</p>
              <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>{selectedArticle.title}</h3>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={ds.btnSmall} onClick={() => toggleBookmark(selectedArticle.id)}>
                {state.bookmarkedIds.includes(selectedArticle.id) ? "Remove bookmark" : "Bookmark"}
              </button>
              <button style={ds.btnSmall} onClick={() => toggleStruggle(selectedArticle.id)}>
                {state.struggles.includes(selectedArticle.id) ? "Clear struggle" : "Mark struggle"}
              </button>
              <button style={ds.btnSmall} onClick={() => setFocusMode(true)}>Focus mode</button>
            </div>
          </div>
          <div style={{ lineHeight: 1.6, fontSize: 15, color: "var(--color-text-secondary)", maxWidth: 800 }}>
            <p style={{ margin: 0 }}>{selectedArticle.body || selectedArticle.summary}</p>
          </div>
          {/* Notes */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 8, color: "var(--color-text-primary)" }}>Your notes</label>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Capture your observations, questions, or insights..."
              className="ui-textarea" style={{ minHeight: 60 }}
            />
            {notesDraft !== (state.notes[selectedArticle.id] ?? "") && (
              <button className="btn btn-secondary" style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }} onClick={() => saveNotes(selectedArticle.id, notesDraft)} aria-label="Save notes" title="Save notes"><Icon name="save" size={14} /> Save</button>
            )}
          </div>
          {/* Related */}
          {selectedArticle.relatedIds?.length ? (
            <div style={{ marginTop: 16 }}>
              <p style={ds.eyebrow}>RELATED ARTICLES</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {selectedArticle.relatedIds.map((id) => {
                  const related = articles.find((a) => a.id === id);
                  return related ? (
                    <button key={id} style={ds.btnSmall} onClick={() => { setSelectedId(id); markRead(id); }}>
                      {related.title}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
