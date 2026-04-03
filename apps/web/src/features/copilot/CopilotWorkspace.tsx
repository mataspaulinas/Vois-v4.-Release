import { useEffect, useMemo, useState } from "react";

import Icon from "../../components/Icon";
import {
  CopilotActionPreview,
  CopilotActionReceipt,
  CopilotActionRecord,
  CopilotActionType,
  CopilotAttachment,
  CopilotMessageRecord,
  CopilotSearchResponse,
  CopilotThreadContext,
  CopilotThreadSummary,
} from "../../lib/api";
import { CopilotRichMessage } from "./CopilotRichMessage";
import {
  compareThreads,
  contentUrlFromReference,
  fileReferencesForMessage,
  groupCopilotThreads,
  nonFileReferencesForMessage,
} from "./copilotHelpers";

type ActionDefinition = {
  type: CopilotActionType;
  title: string;
  description: string;
  mode: "save" | "suggest" | "draft" | "apply";
  enabled: boolean;
  status: string;
};

type Props = {
  open: boolean;
  threads: CopilotThreadSummary[];
  selectedThreadId: string | null;
  selectedThread: CopilotThreadSummary & { messages: CopilotMessageRecord[] } | null;
  selectedThreadContext: CopilotThreadContext | null;
  selectedThreadActions: CopilotActionRecord[];
  loadingActionHistory: boolean;
  actionPreview: CopilotActionPreview | null;
  actionReceipt: CopilotActionReceipt | null;
  previewingActionType: CopilotActionType | null;
  committingActionType: CopilotActionType | null;
  availableActions: ActionDefinition[];
  loading: boolean;
  sending: boolean;
  searching: boolean;
  searchQuery: string;
  searchResults: CopilotSearchResponse | null;
  visibilityFilter: "all" | "shared" | "private";
  sortMode: "recent" | "title" | "created";
  includeArchived: boolean;
  input: string;
  attachments: CopilotAttachment[];
  quotedMessage: CopilotMessageRecord | null;
  contextLabel: string;
  contextSummary: string;
  inputPlaceholder: string;
  unavailableMessage?: string | null;
  actionStatusMessage?: string | null;
  onClose: () => void;
  onSelectThread: (threadId: string) => void;
  onSearchChange: (value: string) => void;
  onVisibilityFilterChange: (value: "all" | "shared" | "private") => void;
  onSortModeChange: (value: "recent" | "title" | "created") => void;
  onIncludeArchivedChange: (value: boolean) => void;
  onInputChange: (value: string) => void;
  onAttachFiles: (files: FileList | null) => void;
  onRemoveAttachment: (fileName: string) => void;
  onSend: () => void;
  onCreateSharedThread: () => void;
  onCreatePrivateThread: () => void;
  onRenameThread: (title: string) => Promise<void> | void;
  onTogglePin: () => Promise<void> | void;
  onToggleArchive: () => Promise<void> | void;
  onDeleteThread: () => Promise<void> | void;
  onQuoteMessage: (messageId: string) => void;
  onClearQuotedMessage: () => void;
  onReuseMessage: (content: string) => void;
  onBranchThread: (messageId: string) => Promise<void> | void;
  onPreviewAction: (actionType: CopilotActionType) => Promise<void> | void;
  onCommitPreview: () => Promise<void> | void;
  onDismissPreview: () => void;
  formatTimestamp: (isoTimestamp: string) => string;
};

export function CopilotWorkspace(props: Props) {
  const [showContext, setShowContext] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  useEffect(() => {
    if (!props.open || typeof document === "undefined") {
      return;
    }
    document.body.classList.add("copilot-workspace-open");
    document.documentElement.classList.add("copilot-workspace-open");
    return () => {
      document.body.classList.remove("copilot-workspace-open");
      document.documentElement.classList.remove("copilot-workspace-open");
    };
  }, [props.open]);

  useEffect(() => {
    if (props.selectedThread) {
      setDraftTitle(props.selectedThread.title);
      setEditingTitle(false);
    }
  }, [props.selectedThread?.id, props.selectedThread?.title]);

  const orderedThreads = useMemo(() => {
    const items = [...props.threads];
    if (props.sortMode === "title") return items.sort((a, b) => a.title.localeCompare(b.title));
    if (props.sortMode === "created") return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items.sort(compareThreads);
  }, [props.sortMode, props.threads]);

  const groupedThreads = useMemo(() => groupCopilotThreads(orderedThreads), [orderedThreads]);
  const searchSections = useMemo(() => {
    if (!props.searchQuery.trim() || !props.searchResults) return [];
    return [
      { label: "Threads", items: props.searchResults.threads },
      { label: "Messages", items: props.searchResults.messages },
      { label: "Files", items: props.searchResults.files },
      { label: "Context", items: props.searchResults.context_objects },
    ].filter((section) => section.items.length);
  }, [props.searchQuery, props.searchResults]);
  const prioritizedActions = useMemo(() => {
    const preferredOrder: CopilotActionType[] = [
      "save_note",
      "apply_to_assessment",
      "create_plan_suggestion",
      "create_task_suggestion",
      "create_diagnosis_note",
      "save_compare_insight",
      "create_escalation_draft",
      "create_follow_up_list",
    ];
    return [...props.availableActions].sort(
      (left, right) => preferredOrder.indexOf(left.type) - preferredOrder.indexOf(right.type)
    );
  }, [props.availableActions]);
  const visibleActions = showAllActions ? prioritizedActions : prioritizedActions.slice(0, 3);

  if (!props.open) return null;

  return (
    <div className="copilot-workspace-shell" onWheelCapture={(event) => event.stopPropagation()}>
      <div className={`copilot-workspace ${showContext ? "copilot-workspace--with-context" : ""}`}>
        <aside className="copilot-workspace__rail">
          <div className="copilot-workspace__header">
            <div>
              <p className="copilot-workspace__eyebrow">VOIS</p>
              <h2>Copilot</h2>
            </div>
            <button onClick={props.onClose} className="copilot-workspace__icon-button" aria-label="Close workspace">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="copilot-workspace__search">
            <Icon name="search" size={15} />
            <input value={props.searchQuery} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Search conversations, notes, files" />
          </div>
          <div className="copilot-workspace__action-row">
            <button onClick={props.onCreateSharedThread} className="copilot-workspace__button copilot-workspace__button--primary" title="New shared thread"><Icon name="add" size={14} /></button>
            <button onClick={props.onCreatePrivateThread} className="copilot-workspace__button" title="New private thread"><Icon name="lock" size={14} /></button>
          </div>
          <div className="copilot-workspace__filters">
            <div className="copilot-workspace__chip-row">
              {(["all", "shared", "private"] as const).map((value) => (
                <button key={value} onClick={() => props.onVisibilityFilterChange(value)} className={`copilot-workspace__chip ${props.visibilityFilter === value ? "is-active" : ""}`}>{value}</button>
              ))}
            </div>
            <div className="copilot-workspace__select-row">
              <select value={props.sortMode} onChange={(event) => props.onSortModeChange(event.target.value as Props["sortMode"])}>
                <option value="recent">Recent</option>
                <option value="title">Title</option>
                <option value="created">Created</option>
              </select>
              <button onClick={() => props.onIncludeArchivedChange(!props.includeArchived)} className="copilot-workspace__button" title={props.includeArchived ? "Hide archived" : "Show archived"}>
                <Icon name={props.includeArchived ? "eye-off" : "eye"} size={14} />
              </button>
            </div>
          </div>
          <div className="copilot-workspace__thread-list">
            {props.searchQuery.trim() ? (
              props.searching ? <div className="copilot-workspace__empty">Searching…</div> :
              searchSections.length ? searchSections.map((section) => (
                <section key={section.label} className="copilot-workspace__section">
                  <p className="copilot-workspace__eyebrow">{section.label}</p>
                  <div className="copilot-workspace__thread-stack">
                    {section.items.map((item) => (
                      <button key={`${section.label}-${item.type}-${item.id}`} className="copilot-workspace__thread" onClick={() => props.onSelectThread(item.thread_id ?? item.id)}>
                        <strong>{item.title}</strong>
                        {item.excerpt ? <span>{item.excerpt}</span> : null}
                      </button>
                    ))}
                  </div>
                </section>
              )) : <div className="copilot-workspace__empty">No results found.</div>
            ) : groupedThreads.length ? groupedThreads.map((group) => (
              <section key={group.label} className="copilot-workspace__section">
                <div className="copilot-workspace__section-head">
                  <p className="copilot-workspace__eyebrow">{group.label}</p>
                </div>
                <div className="copilot-workspace__thread-stack">
                  {group.items.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => props.onSelectThread(thread.id)}
                      className={`copilot-workspace__thread ${props.selectedThreadId === thread.id ? "is-active" : ""}`}
                    >
                      <strong>{thread.title}</strong>
                      <span>{thread.visibility === "private" ? "Private" : "Shared"} · {thread.context_label}</span>
                      {thread.last_message_preview ? <span>{thread.last_message_preview}</span> : null}
                      {thread.last_activity_at ? <span>{props.formatTimestamp(thread.last_activity_at)}</span> : null}
                    </button>
                  ))}
                </div>
              </section>
            )) : <div className="copilot-workspace__empty">No threads yet. Start a shared or private thread.</div>}
          </div>
        </aside>

        <main className="copilot-workspace__main">
          {props.unavailableMessage ? (
            <div className="copilot-workspace__empty">{props.unavailableMessage}</div>
          ) : props.loading ? (
            <div className="copilot-workspace__empty">Loading thread…</div>
          ) : props.selectedThread ? (
            <>
              <div className="copilot-workspace__conversation-header">
                <div>
                  <p className="copilot-workspace__eyebrow">{props.selectedThread.thread_type.replace(/_/g, " ")}</p>
                  {editingTitle ? (
                    <div className="copilot-workspace__action-row">
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        className="copilot-workspace__input"
                        aria-label="Thread title"
                      />
                      <button onClick={() => { void props.onRenameThread(draftTitle); }} className="copilot-workspace__button copilot-workspace__button--primary">Save</button>
                      <button onClick={() => { setDraftTitle(props.selectedThread?.title ?? ""); setEditingTitle(false); }} className="copilot-workspace__button">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <h3>{props.selectedThread.title}</h3>
                      <div className="copilot-workspace__meta-row">
                        <span className="copilot-workspace__meta">{props.selectedThread.context_label}</span>
                        <span className="copilot-workspace__meta">{props.selectedThread.visibility === "private" ? "Private" : "Shared"}</span>
                        <span className="copilot-workspace__meta">{props.selectedThreadContext?.memory_scope_label ?? "In scope"}</span>
                        {props.selectedThread.linked_artifact_type ? <span className="copilot-workspace__meta">Linked: {props.selectedThread.linked_artifact_type.replace(/_/g, " ")}</span> : null}
                      </div>
                    </>
                  )}
                </div>
                <div className="copilot-workspace__message-actions">
                  <button onClick={() => setEditingTitle((current) => !current)} className="copilot-workspace__button" title="Rename"><Icon name="edit" size={14} /></button>
                  <button onClick={() => void props.onTogglePin()} className="copilot-workspace__button" title={props.selectedThread.pinned ? "Unpin" : "Pin"}><Icon name="tasks" size={14} /></button>
                  <button onClick={() => void props.onToggleArchive()} className="copilot-workspace__button" title={props.selectedThread.archived ? "Unarchive" : "Archive"}><Icon name="save" size={14} /></button>
                  <button onClick={() => void props.onDeleteThread()} className="copilot-workspace__button copilot-workspace__button--danger" title="Delete"><Icon name="delete" size={14} /></button>
                  <button onClick={() => setShowContext((current) => !current)} className="copilot-workspace__button" title={showContext ? "Hide context" : "Show context"}><Icon name={showContext ? "eye-off" : "eye"} size={14} /></button>
                </div>
              </div>

              <div className="copilot-workspace__messages">
                {props.selectedThread.messages.map((message) => {
                  const isUser = message.author_role !== "assistant";
                  return (
                    <article key={message.id} className={`copilot-workspace__message ${isUser ? "is-user" : "is-assistant"}`}>
                      <div className="copilot-workspace__message-head">
                        <div>
                          <p className="copilot-workspace__eyebrow">{isUser ? "You" : "VOIS"}</p>
                          <p className="copilot-workspace__muted">{props.formatTimestamp(message.created_at)}</p>
                        </div>
                        <div className="copilot-workspace__message-actions">
                          <button onClick={() => navigator.clipboard.writeText(message.content)} className="copilot-workspace__button" title="Copy"><Icon name="duplicate" size={13} /></button>
                          <button onClick={() => props.onQuoteMessage(message.id)} className="copilot-workspace__button" title="Quote"><Icon name="comment" size={13} /></button>
                          {isUser ? <button onClick={() => props.onReuseMessage(message.content)} className="copilot-workspace__button" title="Edit"><Icon name="edit" size={13} /></button> : null}
                          <button onClick={() => void props.onBranchThread(message.id)} className="copilot-workspace__button" title="Branch"><Icon name="forward" size={13} /></button>
                        </div>
                      </div>
                      <CopilotRichMessage content={message.content} />
                      {showContext && message.provenance.length ? (
                        <div className="copilot-workspace__reference-row">
                          {message.provenance.map((item, index) => (
                            <div key={`${message.id}-prov-${index}`} className="copilot-workspace__reference-card">
                              <strong>{item.label}</strong>
                              <span>{item.detail ?? item.kind.replace(/_/g, " ")}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {fileReferencesForMessage(message.references).length ? <div className="copilot-workspace__reference-row">
                        {fileReferencesForMessage(message.references).map((reference) => {
                          const href = contentUrlFromReference(reference);
                          return <div key={`${message.id}-${reference.label}`} className="copilot-workspace__reference-card">
                            <strong>{reference.label}</strong>
                            {href ? <a href={href} target="_blank" rel="noreferrer">Open file</a> : null}
                          </div>;
                        })}
                      </div> : null}
                      {showContext && nonFileReferencesForMessage(message.references).length ? <div className="copilot-workspace__reference-row">
                        {nonFileReferencesForMessage(message.references).map((reference) => <span key={`${message.id}-${reference.label}`} className="copilot-workspace__reference-chip">{reference.label}</span>)}
                      </div> : null}
                    </article>
                  );
                })}
              </div>

              <div className="copilot-workspace__composer">
                <div className="copilot-workspace__muted" style={{ marginBottom: 8 }}>
                  {props.selectedThread?.visibility === "private" ? "Private conversation" : "Shared conversation"}
                  {props.selectedThreadContext?.memory_scope_label ? ` · ${props.selectedThreadContext.memory_scope_label}` : ""}
                </div>
                {props.quotedMessage ? (
                  <div className="copilot-workspace__notice">
                    Quoting: {props.quotedMessage.content.slice(0, 120)}
                    <button onClick={props.onClearQuotedMessage} className="copilot-workspace__button" style={{ marginLeft: 8 }}>Clear</button>
                  </div>
                ) : null}
                <textarea
                  value={props.input}
                  onChange={(event) => props.onInputChange(event.target.value)}
                  placeholder={props.inputPlaceholder}
                  rows={5}
                />
                {props.attachments.length ? (
                  <div className="copilot-workspace__reference-row">
                    {props.attachments.map((attachment) => (
                      <div key={attachment.file_name} className="copilot-workspace__reference-chip">
                        {attachment.file_name}
                        <button onClick={() => props.onRemoveAttachment(attachment.file_name)} className="copilot-workspace__button">Remove</button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="copilot-workspace__action-row">
                  <label className="copilot-workspace__button">
                    Attach
                    <input type="file" hidden multiple onChange={(event) => props.onAttachFiles(event.target.files)} />
                  </label>
                  <button onClick={props.onSend} className="copilot-workspace__button copilot-workspace__button--primary" disabled={props.sending || !props.input.trim()}>
                    {props.sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="copilot-workspace__empty">Select a thread or start a new one.</div>
          )}
        </main>

        {showContext ? (
          <aside className="copilot-workspace__context">
            <div className="copilot-workspace__section">
              <div className="copilot-workspace__section-head">
                <p className="copilot-workspace__eyebrow">What this conversation is using</p>
              </div>
              <p className="copilot-workspace__muted">{props.selectedThreadContext?.memory_scope_label ?? "Current conversation scope"}</p>
              <div className="copilot-workspace__thread-stack">
                {(props.selectedThreadContext?.provenance_summary ?? []).map((item, index) => (
                  <div key={`summary-${index}`} className="copilot-workspace__reference-card">
                    <strong>{item.label}</strong>
                    <span>{item.detail ?? item.kind.replace(/_/g, " ")}</span>
                  </div>
                ))}
                {!(props.selectedThreadContext?.provenance_summary ?? []).length ? <div className="copilot-workspace__muted">No provenance summary yet.</div> : null}
              </div>
            </div>

            <div className="copilot-workspace__section">
              <div className="copilot-workspace__section-head">
                <p className="copilot-workspace__eyebrow">Helpful next moves</p>
              </div>
              <div className="copilot-workspace__action-cards">
                {visibleActions.map((action) => (
                  <ActionCard
                    key={action.type}
                    title={action.title}
                    description={action.description}
                    status={`${formatActionMode(action.mode)} · ${action.status}`}
                    busy={props.previewingActionType === action.type}
                    disabled={!action.enabled || Boolean(props.committingActionType)}
                    actionLabel={props.previewingActionType === action.type ? "Preparing…" : "Preview"}
                    onAction={() => void props.onPreviewAction(action.type)}
                  />
                ))}
              </div>
              {prioritizedActions.length > 3 ? (
                <button onClick={() => setShowAllActions((current) => !current)} className="copilot-workspace__button" style={{ marginTop: 10 }}>
                  {showAllActions ? "Show fewer actions" : "More actions"}
                </button>
              ) : null}
              {props.actionPreview ? (
                <PreviewCard
                  preview={props.actionPreview}
                  busy={props.committingActionType === props.actionPreview.action_type}
                  onCancel={props.onDismissPreview}
                  onConfirm={() => void props.onCommitPreview()}
                />
              ) : null}
              {props.actionReceipt ? (
                <div className="copilot-workspace__notice">
                  <strong>{props.actionReceipt.receipt_title}</strong>
                  <div>{props.actionReceipt.receipt_summary}</div>
                </div>
              ) : null}
              {props.actionStatusMessage ? <div className="copilot-workspace__notice">{props.actionStatusMessage}</div> : null}
            </div>

            <ContextList
              title="In this conversation"
              items={[
                ...(props.selectedThreadContext?.context_references.map((item) => ({
                  id: `context-${item.type}-${item.id ?? item.label}`,
                  label: item.label,
                  sublabel: item.type.replace(/_/g, " "),
                })) ?? []),
                ...(props.selectedThreadContext?.files.map((item) => ({
                  id: `file-${item.type}-${item.id ?? item.label}`,
                  label: item.label,
                  sublabel: item.type.replace(/_/g, " "),
                })) ?? []),
                ...(props.selectedThreadContext?.related_threads.map((item) => ({
                  id: `thread-${item.id}`,
                  label: item.title,
                  sublabel: item.related_thread_reason ?? item.context_label,
                  onClick: () => props.onSelectThread(item.id),
                })) ?? []),
              ]}
            />

            <section className="copilot-workspace__section">
              <p className="copilot-workspace__eyebrow">Saved from this conversation</p>
              <div className="copilot-workspace__thread-stack">
                {props.loadingActionHistory ? <div className="copilot-workspace__muted">Loading actions…</div> : null}
                {!props.loadingActionHistory && props.selectedThreadActions.length ? props.selectedThreadActions.map((action) => (
                  <div key={action.id} className="copilot-workspace__reference-card">
                    <strong>{action.title}</strong>
                    <span>{formatActionMode(action.mode)} · {formatArtifactLabel(action.target_artifact_type)}</span>
                    <span>{action.actor_name ?? "Unknown user"} · {props.formatTimestamp(action.created_at)}</span>
                  </div>
                )) : !props.loadingActionHistory ? <div className="copilot-workspace__muted">Nothing has been applied from this thread yet.</div> : null}
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function ContextList({ title, items }: { title: string; items: Array<{ id: string; label: string; sublabel: string; onClick?: () => void }> }) {
  return (
    <section className="copilot-workspace__section">
      <p className="copilot-workspace__eyebrow">{title}</p>
      <div className="copilot-workspace__thread-stack">
        {items.length ? items.map((item) => (
          <button key={item.id} onClick={item.onClick} className="copilot-workspace__reference-card">
            <strong>{item.label}</strong>
            <span>{item.sublabel}</span>
          </button>
        )) : <div className="copilot-workspace__muted">Nothing here yet.</div>}
      </div>
    </section>
  );
}

function PreviewCard(props: {
  preview: CopilotActionPreview;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="copilot-workspace__notice">
      <p className="copilot-workspace__eyebrow">Preview</p>
      <strong>{props.preview.title}</strong>
      <div style={{ marginTop: 6 }}>{props.preview.summary}</div>
      {props.preview.side_effect_summary.length ? (
        <ul style={{ margin: "10px 0 0 18px", padding: 0 }}>
          {props.preview.side_effect_summary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {props.preview.warning ? <div style={{ marginTop: 8 }}>{props.preview.warning}</div> : null}
      <div className="copilot-workspace__action-row" style={{ marginTop: 12 }}>
        <button onClick={props.onCancel} className="copilot-workspace__button">Cancel</button>
        <button onClick={props.onConfirm} className="copilot-workspace__button copilot-workspace__button--primary" disabled={props.busy}>
          {props.busy ? "Applying…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

function ActionCard(props: {
  title: string;
  description: string;
  status: string;
  actionLabel: string;
  disabled?: boolean;
  busy?: boolean;
  onAction: () => void;
}) {
  return (
    <button className="copilot-workspace__reference-card" onClick={props.onAction} disabled={props.disabled}>
      <strong>{props.title}</strong>
      <span>{props.description}</span>
      <span>{props.status}</span>
      <span>{props.busy ? "Working…" : props.actionLabel}</span>
    </button>
  );
}

function formatActionMode(mode: "save" | "suggest" | "draft" | "apply") {
  switch (mode) {
    case "save":
      return "Save";
    case "suggest":
      return "Suggestion";
    case "draft":
      return "Draft";
    case "apply":
      return "Apply";
    default:
      return mode;
  }
}

function formatArtifactLabel(value: string | null | undefined) {
  if (!value) return "saved item";
  return value.replace(/_/g, " ");
}

