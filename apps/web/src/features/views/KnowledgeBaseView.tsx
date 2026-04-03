import { useState, useEffect, useMemo, useCallback } from "react";
import { KBArticleRecord, fetchKBArticle } from "../../lib/api";
import Icon from "../../components/Icon";
// SectionCard intentionally not used — sidebar cards use lightweight wrappers

// ── Props ────────────────────────────────────────────────────────────────────

type KnowledgeBaseViewProps = {
  articles: KBArticleRecord[];
  loading: boolean;
};

// ── Constants ────────────────────────────────────────────────────────────────

const KB_STRUGGLES = [
  { slug: "high-food-cost", label: "High food cost", icon: "chart-bar" as const },
  { slug: "staff-turnover", label: "Staff turnover", icon: "team" as const },
  { slug: "inconsistent-service", label: "Inconsistent service", icon: "warning" as const },
  { slug: "compliance-gaps", label: "Compliance gaps", icon: "lock" as const },
  { slug: "menu-confusion", label: "Menu confusion", icon: "menu" as const },
  { slug: "inventory-chaos", label: "Inventory chaos", icon: "block" as const },
  { slug: "chaotic-openings", label: "Chaotic openings", icon: "today" as const },
  { slug: "low-morale", label: "Low morale", icon: "person" as const },
  { slug: "waste", label: "Excessive waste", icon: "warning" as const },
  { slug: "reactive-management", label: "Reactive management", icon: "execution" as const },
];

const CATEGORY_LABELS: Record<string, string> = {
  "failure-autopsy": "Failure Autopsies",
  "domain-landscape": "Domain Landscapes",
  "playbook": "Playbooks",
  "signal-story": "Signal Stories",
};

const DOMAIN_LABELS: Record<string, string> = {
  operations: "Operations",
  leadership: "Leadership",
  "guest-experience": "Guest Experience",
  safety: "Safety & Compliance",
  talent: "Talent & People",
  financial: "Financial",
};

const DOMAIN_COLORS: Record<string, string> = {
  operations: "rgba(59,130,246,0.08)",
  leadership: "rgba(168,85,247,0.08)",
  "guest-experience": "rgba(236,72,153,0.08)",
  safety: "rgba(239,68,68,0.08)",
  talent: "rgba(34,197,94,0.08)",
  financial: "rgba(245,158,11,0.08)",
};

// ── Local state persistence ──────────────────────────────────────────────────

type KBLocalState = {
  bookmarkedSlugs: string[];
  readProgress: Record<string, { percent: number; lastRead: number }>;
  selectedStruggles: string[];
};

const STORAGE_KEY = "vois_kb_state";

const DEFAULT_LOCAL_STATE: KBLocalState = {
  bookmarkedSlugs: [],
  readProgress: {},
  selectedStruggles: [],
};

function loadLocalState(): KBLocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCAL_STATE;
    return { ...DEFAULT_LOCAL_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LOCAL_STATE;
  }
}

function saveLocalState(state: KBLocalState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silent
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function KnowledgeBaseView({ articles, loading }: KnowledgeBaseViewProps) {
  // Local persistent state
  const [localState, setLocalState] = useState<KBLocalState>(loadLocalState);

  // Navigation
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedArticleFull, setSelectedArticleFull] = useState<KBArticleRecord | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Persist local state on change
  useEffect(() => {
    saveLocalState(localState);
  }, [localState]);

  // Fetch full article when slug changes
  useEffect(() => {
    if (!selectedSlug) {
      setSelectedArticleFull(null);
      return;
    }
    let cancelled = false;
    setLoadingArticle(true);
    fetchKBArticle(selectedSlug).then((result) => {
      if (!cancelled) {
        setSelectedArticleFull(result);
        setLoadingArticle(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const toggleBookmark = useCallback((slug: string) => {
    setLocalState((prev) => {
      const exists = prev.bookmarkedSlugs.includes(slug);
      return {
        ...prev,
        bookmarkedSlugs: exists
          ? prev.bookmarkedSlugs.filter((s) => s !== slug)
          : [...prev.bookmarkedSlugs, slug],
      };
    });
  }, []);

  const toggleStruggle = useCallback((slug: string) => {
    setLocalState((prev) => {
      const exists = prev.selectedStruggles.includes(slug);
      return {
        ...prev,
        selectedStruggles: exists
          ? prev.selectedStruggles.filter((s) => s !== slug)
          : [...prev.selectedStruggles, slug],
      };
    });
  }, []);

  const isBookmarked = useCallback(
    (slug: string) => localState.bookmarkedSlugs.includes(slug),
    [localState.bookmarkedSlugs]
  );

  // ── Computed data ────────────────────────────────────────────────────────

  const uniqueCategories = useMemo(
    () => [...new Set(articles.map((a) => a.category))],
    [articles]
  );

  const uniqueDomains = useMemo(
    () => [...new Set(articles.map((a) => a.domain))],
    [articles]
  );

  const totalToolsReferenced = useMemo(
    () => new Set(articles.flatMap((a) => a.tools)).size,
    [articles]
  );

  const filteredArticles = useMemo(() => {
    let result = articles;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((a) => a.category === categoryFilter);
    }

    if (domainFilter !== "all") {
      result = result.filter((a) => a.domain === domainFilter);
    }

    if (showBookmarksOnly) {
      result = result.filter((a) => localState.bookmarkedSlugs.includes(a.slug));
    }

    if (localState.selectedStruggles.length > 0) {
      result = result.filter((a) =>
        a.struggles.some((s) => localState.selectedStruggles.includes(s))
      );
    }

    return result;
  }, [articles, searchQuery, categoryFilter, domainFilter, showBookmarksOnly, localState]);

  const continueReadingArticles = useMemo(() => {
    const entries = Object.entries(localState.readProgress)
      .filter(([, p]) => p.percent < 100)
      .sort(([, a], [, b]) => b.lastRead - a.lastRead)
      .slice(0, 2);
    return entries
      .map(([slug, progress]) => {
        const article = articles.find((a) => a.slug === slug);
        return article ? { article, progress } : null;
      })
      .filter(Boolean) as Array<{
      article: KBArticleRecord;
      progress: { percent: number; lastRead: number };
    }>;
  }, [localState.readProgress, articles]);

  const recommendedArticles = useMemo(() => {
    if (localState.selectedStruggles.length === 0) return [];

    const scored = articles.map((a) => {
      const matchCount = a.struggles.filter((s) =>
        localState.selectedStruggles.includes(s)
      ).length;
      const unread = !localState.readProgress[a.slug];
      const score = matchCount * 3 + (unread ? 1 : 0) + (a.tags.length > 4 ? 0.5 : 0);
      return { article: a, score };
    });

    return scored
      .filter((s) => s.score > 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.article);
  }, [articles, localState]);

  // ── Pill style helper ────────────────────────────────────────────────────

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "1px solid var(--color-border-subtle)",
    background: active ? "var(--color-accent)" : "var(--color-surface-subtle)",
    color: active ? "#fff" : "var(--color-text-secondary)",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  });

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p className="small-text" style={{ color: "var(--color-text-muted)" }}>
          Loading knowledge base...
        </p>
      </div>
    );
  }

  // ── Article Mode ─────────────────────────────────────────────────────────

  if (selectedSlug) {
    return (
      <ArticleView
        slug={selectedSlug}
        article={selectedArticleFull}
        loading={loadingArticle}
        bookmarked={isBookmarked(selectedSlug)}
        onToggleBookmark={() => toggleBookmark(selectedSlug)}
        onBack={() => setSelectedSlug(null)}
        onNavigate={setSelectedSlug}
        articles={articles}
      />
    );
  }

  // ── Home Mode ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: 48 }}>
      {/* Hero Card */}
      <div className="ui-card" style={{ padding: 32 }}>
        <span className="eyebrow">KNOWLEDGE BASE</span>
        <h1 className="page-title" style={{ margin: "8px 0 4px" }}>
          Operational Knowledge
        </h1>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: 14,
            marginBottom: 24,
            maxWidth: 640,
          }}
        >
          Browse operational articles linked to the ontology — blocks, tools, signals,
          and the patterns they address.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <StatMini label="Articles" value={articles.length} />
          <StatMini label="Domains" value={uniqueDomains.length} />
          <StatMini label="Tools referenced" value={totalToolsReferenced} />
        </div>
      </div>

      {/* Struggle Selector */}
      <div>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            marginBottom: 10,
          }}
        >
          What are you working on?
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {KB_STRUGGLES.map((s) => {
            const active = localState.selectedStruggles.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                style={pillStyle(active)}
                onClick={() => toggleStruggle(s.slug)}
              >
                <Icon name={s.icon} size={14} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Row */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <input
          className="ui-input sm"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 220 }}
        />

        {/* Category pills */}
        <button
          type="button"
          style={pillStyle(categoryFilter === "all")}
          onClick={() => setCategoryFilter("all")}
        >
          All
        </button>
        {uniqueCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            style={pillStyle(categoryFilter === cat)}
            onClick={() => setCategoryFilter(cat)}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}

        {/* Domain pills */}
        <span
          style={{
            width: 1,
            height: 20,
            background: "var(--color-border-subtle)",
            margin: "0 4px",
          }}
        />
        <button
          type="button"
          style={pillStyle(domainFilter === "all")}
          onClick={() => setDomainFilter("all")}
        >
          All domains
        </button>
        {uniqueDomains.map((dom) => (
          <button
            key={dom}
            type="button"
            style={pillStyle(domainFilter === dom)}
            onClick={() => setDomainFilter(dom)}
          >
            {DOMAIN_LABELS[dom] || dom}
          </button>
        ))}

        {/* Bookmark toggle */}
        <span
          style={{
            width: 1,
            height: 20,
            background: "var(--color-border-subtle)",
            margin: "0 4px",
          }}
        />
        <button
          type="button"
          style={pillStyle(showBookmarksOnly)}
          onClick={() => setShowBookmarksOnly((v) => !v)}
        >
          <Icon name="tasks" size={14} />
          My Library
        </button>
      </div>

      {/* Continue Reading */}
      {continueReadingArticles.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: 10,
            }}
          >
            Continue Reading
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {continueReadingArticles.map(({ article, progress }) => (
              <button
                key={article.slug}
                type="button"
                className="ui-card"
                onClick={() => setSelectedSlug(article.slug)}
                style={{
                  flex: "1 1 0",
                  padding: 16,
                  cursor: "pointer",
                  textAlign: "left",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  {article.title}
                </p>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "var(--color-bg-muted)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress.percent}%`,
                      background: "var(--color-accent)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <p
                  className="small-text"
                  style={{ color: "var(--color-text-muted)", marginTop: 4 }}
                >
                  {progress.percent}% complete
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommended for You */}
      {recommendedArticles.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: 10,
            }}
          >
            Recommended for You
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {recommendedArticles.map((a) => (
              <button
                key={a.slug}
                type="button"
                className="ui-card"
                onClick={() => setSelectedSlug(a.slug)}
                style={{
                  flex: "1 1 0",
                  padding: 16,
                  cursor: "pointer",
                  textAlign: "left",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <span
                  className="ui-badge ui-badge--muted"
                  style={{ fontSize: 11, marginBottom: 6 }}
                >
                  {CATEGORY_LABELS[a.category] || a.category}
                </span>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{a.title}</p>
                <p
                  className="small-text"
                  style={{ color: "var(--color-text-muted)", marginTop: 2 }}
                >
                  {a.readTime} min &middot; {a.difficulty}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Article Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {filteredArticles.map((a) => (
          <ArticleCard
            key={a.slug}
            article={a}
            bookmarked={isBookmarked(a.slug)}
            progress={localState.readProgress[a.slug]}
            onSelect={() => setSelectedSlug(a.slug)}
            onToggleBookmark={() => toggleBookmark(a.slug)}
          />
        ))}

        {filteredArticles.length === 0 && (
          <div
            className="ui-card"
            style={{
              gridColumn: "1 / -1",
              padding: 48,
              textAlign: "center",
              color: "var(--color-text-muted)",
            }}
          >
            <Icon name="search" size={24} />
            <p style={{ marginTop: 8, fontSize: 14 }}>No articles match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="ui-card"
      style={{
        padding: "12px 16px",
        textAlign: "center",
        background: "var(--color-surface-subtle)",
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>
        {value}
      </p>
      <p className="small-text" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
    </div>
  );
}

function ArticleCard({
  article,
  bookmarked,
  progress,
  onSelect,
  onToggleBookmark,
}: {
  article: KBArticleRecord;
  bookmarked: boolean;
  progress?: { percent: number; lastRead: number };
  onSelect: () => void;
  onToggleBookmark: () => void;
}) {
  return (
    <div
      className="ui-card"
      style={{ cursor: "pointer", overflow: "hidden", position: "relative" }}
      onClick={onSelect}
    >
      {/* Domain color stripe */}
      <div
        style={{
          height: 4,
          background: DOMAIN_COLORS[article.domain] || "var(--color-border-subtle)",
        }}
      />

      <div style={{ padding: 16 }}>
        {/* Top row: category + bookmark */}
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
        >
          <span className="ui-badge ui-badge--muted" style={{ fontSize: 11 }}>
            {CATEGORY_LABELS[article.category] || article.category}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              color: bookmarked ? "var(--color-accent)" : "var(--color-text-muted)",
            }}
          >
            <Icon name="tasks" size={16} />
          </button>
        </div>

        {/* Title + subtitle */}
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: "10px 0 4px",
            lineHeight: 1.3,
          }}
        >
          {article.title}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            lineHeight: 1.4,
            marginBottom: 12,
          }}
        >
          {article.subtitle}
        </p>

        {/* Bottom row: read time, tools, difficulty */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="small-text" style={{ color: "var(--color-text-muted)" }}>
            {article.readTime} min
          </span>
          {article.tools.length > 0 && (
            <span className="ui-badge ui-badge--muted" style={{ fontSize: 11 }}>
              {article.tools.length} tools
            </span>
          )}
          <span className="ui-badge ui-badge--muted" style={{ fontSize: 11 }}>
            {article.difficulty}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {progress && progress.percent > 0 && (
        <div style={{ height: 3, background: "var(--color-bg-muted)" }}>
          <div
            style={{
              height: "100%",
              width: `${progress.percent}%`,
              background: "var(--color-accent)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ArticleView({
  slug,
  article,
  loading,
  bookmarked,
  onToggleBookmark,
  onBack,
  onNavigate,
  articles,
}: {
  slug: string;
  article: KBArticleRecord | null;
  loading: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onBack: () => void;
  onNavigate: (slug: string) => void;
  articles: KBArticleRecord[];
}) {
  if (loading || !article) {
    return (
      <div style={{ padding: 48 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--color-text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 24,
            padding: 0,
          }}
        >
          <Icon name="back" size={14} />
          Back to articles
        </button>
        {loading && (
          <p className="small-text" style={{ color: "var(--color-text-muted)" }}>
            Loading article...
          </p>
        )}
        {!loading && !article && (
          <p className="small-text" style={{ color: "var(--color-text-muted)" }}>
            Article not found.
          </p>
        )}
      </div>
    );
  }

  const hasSections = article.sections && article.sections.length > 0;
  const hasToc = article.toc && article.toc.length > 0;

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--color-text-secondary)",
          fontSize: 13,
          fontWeight: 500,
          padding: 0,
          alignSelf: "flex-start",
        }}
      >
        <Icon name="back" size={14} />
        Back to articles
      </button>

      {/* Article header */}
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <span className="ui-badge ui-badge--muted" style={{ fontSize: 11 }}>
            {CATEGORY_LABELS[article.category] || article.category}
          </span>
          <span className="ui-badge ui-badge--muted" style={{ fontSize: 11 }}>
            {DOMAIN_LABELS[article.domain] || article.domain}
          </span>
        </div>

        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {article.title}
          </h1>
          <button
            type="button"
            onClick={onToggleBookmark}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: bookmarked ? "var(--color-accent)" : "var(--color-text-muted)",
              flexShrink: 0,
            }}
          >
            <Icon name="tasks" size={18} />
          </button>
        </div>

        <p
          style={{
            fontSize: 15,
            color: "var(--color-text-muted)",
            marginTop: 6,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          {article.subtitle}
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 14,
            fontSize: 13,
            color: "var(--color-text-muted)",
          }}
        >
          <span>{article.readTime} min read</span>
          <span>&middot;</span>
          <span>{article.difficulty}</span>
          <span>&middot;</span>
          <span>{article.module}</span>
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left: Article body */}
        <div>
          {hasSections ? (
            article.sections!.map((section) => (
              <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: 28 }}>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: 8,
                  }}
                >
                  {section.heading}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {section.body}
                </p>
              </div>
            ))
          ) : (
            <div
              className="ui-card"
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--color-text-muted)",
              }}
            >
              <Icon name="report" size={24} />
              <p style={{ marginTop: 8, fontSize: 14 }}>Content is being authored.</p>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Core Blocks */}
          {article.sidebar.coreBlocks.length > 0 && (
            <div className="ui-card"><p className="eyebrow" style={{ marginBottom: 8 }}>Core Blocks</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {article.sidebar.coreBlocks.map((block) => (
                  <li
                    key={block.id}
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      padding: "4px 0",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: 11,
                        marginRight: 6,
                      }}
                    >
                      {block.id}
                    </span>
                    {block.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tools */}
          {article.sidebar.tools.length > 0 && (
            <div className="ui-card"><p className="eyebrow" style={{ marginBottom: 8 }}>Tools</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {article.sidebar.tools.map((tool) => (
                  <span key={tool} className="ui-badge ui-badge--muted" style={{ fontSize: 11 }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Signals */}
          {article.signals.length > 0 && (
            <div className="ui-card"><p className="eyebrow" style={{ marginBottom: 8 }}>Signals</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {article.signals.map((signal) => (
                  <span
                    key={signal}
                    className="ui-badge ui-badge--muted"
                    style={{ fontSize: 11 }}
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metrics */}
          {article.sidebar.metrics.length > 0 && (
            <div className="ui-card"><p className="eyebrow" style={{ marginBottom: 8 }}>Metrics</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {article.sidebar.metrics.map((m, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      padding: "4px 0",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <span>{m.label}</span>
                    <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {m.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Articles */}
          {article.related.length > 0 && (
            <div className="ui-card"><p className="eyebrow" style={{ marginBottom: 8 }}>Related Articles</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {article.related.map((relSlug) => {
                  const relArticle = articles.find((a) => a.slug === relSlug);
                  return (
                    <li key={relSlug} style={{ padding: "3px 0" }}>
                      <button
                        type="button"
                        onClick={() => onNavigate(relSlug)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 13,
                          color: "var(--color-accent)",
                          textDecoration: "underline",
                          textAlign: "left",
                        }}
                      >
                        {relArticle ? relArticle.title : relSlug}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* TOC (floating) */}
      {hasToc && (
        <div
          style={{
            position: "fixed",
            top: 120,
            right: 32,
            width: 180,
            background: "var(--color-surface-subtle)",
            borderRadius: 8,
            padding: 12,
            border: "1px solid var(--color-border-subtle)",
            zIndex: 10,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            On this page
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {article.toc.map((entry) => (
              <li key={entry.id} style={{ padding: "3px 0" }}>
                <a
                  href={`#section-${entry.id}`}
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    textDecoration: "none",
                  }}
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
