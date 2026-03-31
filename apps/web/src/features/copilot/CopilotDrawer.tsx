import { useCallback, useEffect, useRef, useState } from "react";
import { CopilotAttachment, CopilotThreadDetail, CopilotThreadSummary } from "../../lib/api";
import Icon from "../../components/Icon";

type CopilotDrawerProps = {
  open: boolean;
  threads: CopilotThreadSummary[];
  selectedThreadId: string | null;
  selectedThread: CopilotThreadDetail | null;
  loading: boolean;
  sending: boolean;
  input: string;
  attachments: CopilotAttachment[];
  onSelectThread: (threadId: string) => void;
  onInputChange: (value: string) => void;
  onAttachFiles: (files: FileList | null) => void;
  onRemoveAttachment: (fileName: string) => void;
  onSend: () => void;
  onClose: () => void;
  formatTimestamp: (isoTimestamp: string) => string;
  contextLabel: string;
  contextSummary: string;
  inputPlaceholder: string;
  unavailableMessage?: string | null;
  signalSuggestion: {
    messageId: string;
    suggestion: {
      add: Array<{ signal_id: string; signal_name?: string | null; notes: string; confidence: string }>;
      remove: string[];
    };
  } | null;
  canApplySignalSuggestion: boolean;
  applyingSignalSuggestion: boolean;
  onApplySignalSuggestion: () => void;
  onDismissSignalSuggestion: () => void;
  preFillMessage?: string | null;
  onPreFillConsumed?: () => void;
  screenContext?: string | null;
  drawerContext?: string | null;
  onCollapseSidebar?: () => void;
  onExpandSidebar?: () => void;
};

export function CopilotDrawer({
  open,
  threads,
  selectedThreadId,
  selectedThread,
  loading,
  sending,
  input,
  attachments,
  onSelectThread,
  onInputChange,
  onAttachFiles,
  onRemoveAttachment,
  onSend,
  onClose,
  formatTimestamp,
  contextLabel,
  contextSummary,
  inputPlaceholder,
  unavailableMessage,
  signalSuggestion,
  canApplySignalSuggestion,
  applyingSignalSuggestion,
  onApplySignalSuggestion,
  onDismissSignalSuggestion,
  preFillMessage,
  onPreFillConsumed,
  screenContext,
  drawerContext,
  onCollapseSidebar,
  onExpandSidebar,
}: CopilotDrawerProps) {
  // Pre-fill the input when an "Ask Copilot" button is clicked
  useEffect(() => {
    if (preFillMessage && onPreFillConsumed) {
      onInputChange(preFillMessage);
      onPreFillConsumed();
    }
  }, [preFillMessage]);

  /* ── Resizable width ── */
  const goldenMax = Math.floor(window.innerWidth * 0.618);
  const [copilotWidth, setCopilotWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const collapsedSidebarRef = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = copilotWidth;
    const maxW = Math.floor(window.innerWidth * 0.618);
    const threshold = window.innerWidth * 0.45;
    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(maxW, startWidth - (ev.clientX - startX)));
      setCopilotWidth(newWidth);
      // Auto-collapse sidebar when copilot exceeds threshold
      if (newWidth > threshold && !collapsedSidebarRef.current) {
        collapsedSidebarRef.current = true;
        onCollapseSidebar?.();
      }
      // Auto-expand sidebar when copilot shrinks back below threshold
      if (newWidth <= threshold && collapsedSidebarRef.current) {
        collapsedSidebarRef.current = false;
        onExpandSidebar?.();
      }
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [copilotWidth, onCollapseSidebar]);

  return (
    <aside
      className={`copilot-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
      style={{
        borderLeft: "3px solid transparent",
        borderImage: "linear-gradient(180deg, #6C5CE7, #A29BFE) 1",
        width: open ? copilotWidth : 0,
        minWidth: open ? copilotWidth : 0,
        transition: isResizing ? "none" : "width 260ms cubic-bezier(0.22,1,0.36,1), min-width 260ms cubic-bezier(0.22,1,0.36,1)",
        position: "relative",
      }}
    >
      {/* ── Header ── */}
      <div
        className="copilot-drawer-header"
        style={{
          padding: "var(--spacing-24) var(--spacing-24) var(--spacing-16)",
          borderBottom: "1px solid var(--color-border-subtle, #E5E5E5)",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "var(--text-section, 20px)",
              fontWeight: "var(--weight-semibold, 600)",
              color: "var(--color-text-primary, #0A0A0A)",
              margin: 0,
              lineHeight: "var(--lh-tight, 1.15)",
            }}
          >
            Working conversations
          </h2>
          <p
            style={{
              fontSize: "var(--text-small, 13px)",
              color: "var(--color-text-muted, #A3A3A3)",
              margin: "var(--spacing-4) 0 0",
            }}
          >
            {contextLabel}: {contextSummary}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted, #A3A3A3)",
            background: "none",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            transition: "all 180ms ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-muted, #F5F5F5)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--color-text-muted, #A3A3A3)"; }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* ── Layout: thread list + conversation ── */}
      <div className="copilot-layout" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Thread sidebar */}
        <div
          className="copilot-thread-list"
          style={{
            width: "40%",
            minWidth: 160,
            maxWidth: 240,
            borderRight: "1px solid var(--color-border-subtle, #E5E5E5)",
            overflowY: "auto",
            padding: "var(--spacing-8)",
          }}
        >
          {threads.map((thread) => (
            <button
              key={thread.id}
              className={`copilot-thread-button ${selectedThreadId === thread.id ? "selected" : ""}`}
              onClick={() => onSelectThread(thread.id)}
              disabled={loading || sending}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: "100%",
                textAlign: "left",
                padding: "var(--spacing-12)",
                marginBottom: "var(--spacing-4)",
                borderRadius: "var(--radius-md, 12px)",
                border: "1px solid transparent",
                background:
                  selectedThreadId === thread.id
                    ? "var(--color-accent-soft, rgba(108,92,231,0.08))"
                    : "transparent",
                cursor: "pointer",
                transition: "background var(--motion-fast, 120ms) var(--easing-standard)",
              }}
            >
              <strong
                style={{
                  fontSize: "var(--text-body, 15px)",
                  fontWeight: "var(--weight-medium, 500)",
                  color: "var(--color-text-primary, #0A0A0A)",
                  lineHeight: "var(--lh-tight, 1.15)",
                }}
              >
                {thread.title}
              </strong>
              <span
                style={{
                  fontSize: "var(--text-small, 13px)",
                  color: "var(--color-text-secondary, #525252)",
                }}
              >
                {thread.scope}
              </span>
              <span
                style={{
                  fontSize: "var(--text-eyebrow, 11px)",
                  color: "var(--color-text-muted, #A3A3A3)",
                }}
              >
                {thread.message_count} messages
                {thread.latest_message_at ? ` | ${formatTimestamp(thread.latest_message_at)}` : ""}
              </span>
            </button>
          ))}
          {!threads.length ? (
            <div style={{ padding: "var(--spacing-24)", textAlign: "center" }}>
              <p
                style={{
                  fontSize: "var(--text-small, 13px)",
                  color: "var(--color-text-muted, #A3A3A3)",
                }}
              >
                No copilot threads available yet.
              </p>
            </div>
          ) : null}
        </div>

        {/* Conversation area */}
        <div
          className="copilot-conversation"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Screen / drawer context card */}
          {(screenContext || drawerContext) && (
            <div style={{
              padding: "8px 12px",
              margin: "12px 24px 0",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-subtle)",
              fontSize: "var(--text-eyebrow)",
              color: "var(--color-text-muted)",
              lineHeight: 1.5,
            }}>
              {screenContext && <div>Seeing: {screenContext}</div>}
              {drawerContext && <div>Viewing: {drawerContext}</div>}
            </div>
          )}
          {unavailableMessage ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--spacing-48)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--text-body, 15px)",
                  color: "var(--color-text-muted, #A3A3A3)",
                  textAlign: "center",
                }}
              >
                {unavailableMessage}
              </p>
            </div>
          ) : null}
          {loading ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--spacing-48)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--text-small, 13px)",
                  color: "var(--color-text-muted, #A3A3A3)",
                }}
              >
                Loading copilot thread...
              </p>
            </div>
          ) : !unavailableMessage && selectedThread ? (
            <>
              {/* Message list */}
              <div
                className="copilot-message-list"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "var(--spacing-24)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-12)",
                }}
              >
                {selectedThread.messages.map((message) => {
                  const isUser = message.author_role !== "assistant";
                  return (
                    <article
                      className={`copilot-message ${message.author_role === "assistant" ? "assistant" : "user"}`}
                      key={message.id}
                      style={{
                        alignSelf: isUser ? "flex-end" : "flex-start",
                        maxWidth: "80%",
                        padding: "var(--spacing-16)",
                        borderRadius: "var(--radius-md, 12px)",
                        background: isUser
                          ? "var(--color-accent-soft, rgba(108,92,231,0.08))"
                          : "var(--color-surface, #FFFFFF)",
                        border: isUser ? "none" : "1px solid var(--color-border-subtle, #E5E5E5)",
                        boxShadow: isUser ? "none" : "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "var(--spacing-8)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "var(--text-eyebrow, 11px)",
                            fontWeight: "var(--weight-semibold, 600)",
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.08em",
                            color: isUser
                              ? "var(--color-accent, #6C5CE7)"
                              : "var(--color-text-muted, #A3A3A3)",
                          }}
                        >
                          {message.author_role === "assistant" ? "VOIS" : "You"}
                        </span>
                        <span
                          style={{
                            fontSize: "var(--text-eyebrow, 11px)",
                            color: "var(--color-text-muted, #A3A3A3)",
                          }}
                        >
                          {message.source_mode} · {formatTimestamp(message.created_at)}
                        </span>
                      </div>
                      <p
                        className="copilot-message-body"
                        style={{
                          fontSize: "var(--text-body, 15px)",
                          lineHeight: "var(--lh-loose, 1.6)",
                          color: "var(--color-text-primary, #0A0A0A)",
                          margin: 0,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {message.content}
                      </p>
                      {fileReferencesForMessage(message.references).length ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "var(--spacing-8)",
                            marginTop: "var(--spacing-12)",
                          }}
                        >
                          {fileReferencesForMessage(message.references).map((reference) => (
                            <a
                              href={contentUrlFromReference(reference) ?? "#"}
                              key={`${message.id}-${reference.id ?? reference.label}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: "var(--text-small, 13px)",
                                fontWeight: "var(--weight-medium, 500)",
                                color: "var(--color-accent, #6C5CE7)",
                                background: "var(--color-accent-soft, rgba(108,92,231,0.08))",
                                padding: "4px 10px",
                                borderRadius: "var(--radius-full, 9999px)",
                                textDecoration: "none",
                                transition: "background var(--motion-fast) var(--easing-standard)",
                              }}
                            >
                              {reference.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {message.attachments.length ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "var(--spacing-8)",
                            marginTop: "var(--spacing-8)",
                          }}
                        >
                          {message.attachments.map((attachment) => (
                            <span
                              key={`${message.id}-${attachment.file_asset_id ?? attachment.file_name}`}
                              style={{
                                fontSize: "var(--text-small, 13px)",
                                color: "var(--color-text-secondary, #525252)",
                                background: "var(--color-bg-muted, #F5F5F5)",
                                padding: "4px 10px",
                                borderRadius: "var(--radius-full, 9999px)",
                              }}
                            >
                              {attachment.file_name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {nonFileReferencesForMessage(message.references).length ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "var(--spacing-8)",
                            marginTop: "var(--spacing-8)",
                          }}
                        >
                          {nonFileReferencesForMessage(message.references).map((reference) => (
                            <span
                              key={`${message.id}-${reference.type}-${reference.label}`}
                              style={{
                                fontSize: "var(--text-small, 13px)",
                                color: "var(--color-text-secondary, #525252)",
                                background: "var(--color-bg-muted, #F5F5F5)",
                                padding: "4px 10px",
                                borderRadius: "var(--radius-full, 9999px)",
                              }}
                            >
                              {reference.type}: {reference.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              {/* Signal suggestion card */}
              {signalSuggestion ? (
                <div
                  style={{
                    margin: "0 var(--spacing-24)",
                    padding: "var(--spacing-20)",
                    background: "var(--color-surface, #FFFFFF)",
                    borderRadius: "var(--radius-md, 12px)",
                    border: "1px solid var(--color-border-subtle, #E5E5E5)",
                    boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
                  }}
                >
                  <p
                    style={{
                      fontSize: "var(--text-eyebrow, 11px)",
                      fontWeight: "var(--weight-semibold, 600)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      color: "var(--color-text-muted, #A3A3A3)",
                      margin: "0 0 var(--spacing-12)",
                    }}
                  >
                    Signal update suggestion
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-8)", marginBottom: "var(--spacing-12)" }}>
                    {signalSuggestion.suggestion.add.map((item) => (
                      <span
                        key={`add-${item.signal_id}`}
                        style={{
                          fontSize: "var(--text-small, 13px)",
                          color: "var(--color-success, #10B981)",
                          background: "var(--color-success-soft, rgba(16,185,129,0.08))",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full, 9999px)",
                        }}
                      >
                        + {item.signal_name ?? item.signal_id}
                      </span>
                    ))}
                    {signalSuggestion.suggestion.remove.map((signalId) => (
                      <span
                        key={`remove-${signalId}`}
                        style={{
                          fontSize: "var(--text-small, 13px)",
                          color: "var(--color-danger, #EF4444)",
                          background: "var(--color-danger-soft, rgba(239,68,68,0.08))",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full, 9999px)",
                        }}
                      >
                        - {signalId}
                      </span>
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize: "var(--text-small, 13px)",
                      color: "var(--color-text-muted, #A3A3A3)",
                      margin: "0 0 var(--spacing-16)",
                    }}
                  >
                    Review before applying. Accepted changes update the saved assessment, not hidden system state.
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={onApplySignalSuggestion}
                      disabled={!canApplySignalSuggestion || applyingSignalSuggestion}
                      aria-label="Apply to assessment"
                      title={applyingSignalSuggestion ? "Applying..." : "Apply to assessment"}
                      style={{
                        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--color-surface)", background: "var(--color-accent, #6C5CE7)", border: "none", borderRadius: "var(--radius-sm)",
                        cursor: !canApplySignalSuggestion || applyingSignalSuggestion ? "not-allowed" : "pointer",
                        opacity: !canApplySignalSuggestion || applyingSignalSuggestion ? 0.4 : 1,
                      }}
                    >
                      <Icon name="check" size={16} />
                    </button>
                    <button
                      onClick={onDismissSignalSuggestion}
                      disabled={applyingSignalSuggestion}
                      aria-label="Dismiss"
                      title="Dismiss suggestion"
                      style={{
                        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--color-text-muted)", background: "none",
                        border: "1px solid var(--color-border-subtle, #E5E5E5)", borderRadius: "var(--radius-sm)",
                        cursor: applyingSignalSuggestion ? "not-allowed" : "pointer",
                        opacity: applyingSignalSuggestion ? 0.4 : 1,
                      }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Input area — pinned to bottom */}
              <div
                style={{
                  flexShrink: 0,
                  padding: "var(--spacing-16) var(--spacing-24) var(--spacing-24)",
                  borderTop: "1px solid var(--color-border-subtle, #E5E5E5)",
                  background: "var(--color-surface, #FFFFFF)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <label
                    title="Attach files"
                    style={{
                      width: 28,
                      height: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-text-muted, #A3A3A3)",
                      background: "none",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      transition: "all 180ms ease",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        onAttachFiles(event.target.files);
                        event.currentTarget.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                    <Icon name="attach" size={16} />
                  </label>
                  {attachments.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-4)" }}>
                      {attachments.map((attachment) => (
                        <button
                          key={attachment.file_name}
                          onClick={() => onRemoveAttachment(attachment.file_name)}
                          disabled={sending}
                          style={{
                            fontSize: "var(--text-eyebrow, 11px)",
                            color: "var(--color-text-secondary, #525252)",
                            background: "var(--color-bg-muted, #F5F5F5)",
                            border: "1px solid var(--color-border-subtle, #E5E5E5)",
                            borderRadius: "var(--radius-full, 9999px)",
                            padding: "3px 10px",
                            cursor: sending ? "not-allowed" : "pointer",
                          }}
                        >
                          {attachment.file_name} x
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div style={{ position: "relative" }}>
                  <textarea
                    value={input}
                    onChange={(event) => onInputChange(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !sending && selectedThreadId) { event.preventDefault(); onSend(); } }}
                    placeholder={inputPlaceholder}
                    style={{
                      width: "100%",
                      minHeight: 56,
                      padding: "12px 48px 12px 12px",
                      fontSize: "var(--text-body, 15px)",
                      fontFamily: "var(--font-sans)",
                      lineHeight: "var(--lh-normal, 1.5)",
                      color: "var(--color-text-primary, #0A0A0A)",
                      background: "var(--color-bg-muted, #F5F5F5)",
                      border: "1px solid var(--color-border-subtle, #E5E5E5)",
                      borderRadius: "var(--radius-md, 12px)",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={onSend}
                    disabled={sending || !selectedThreadId}
                    aria-label="Send"
                    title={sending ? "Sending..." : "Send (Enter)"}
                    style={{
                      position: "absolute",
                      right: 8,
                      bottom: 8,
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-accent-foreground, #FFFFFF)",
                      background: "var(--color-accent, #6C5CE7)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: sending || !selectedThreadId ? "not-allowed" : "pointer",
                      opacity: sending || !selectedThreadId ? 0.4 : 1,
                      transition: "all 180ms ease",
                    }}
                  >
                    {sending
                      ? <Icon name="refresh" size={16} />
                      : <Icon name="send" size={16} />
                    }
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--spacing-48)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--text-body, 15px)",
                  color: "var(--color-text-muted, #A3A3A3)",
                  textAlign: "center",
                }}
              >
                {unavailableMessage
                  ? "VOIS is blocked until the live AI runtime is configured."
                  : "Select a thread to inspect the persisted conversation."}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* ── Resize handle (left edge) ── */}
      {open && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 4,
            height: "100%",
            cursor: "col-resize",
            zIndex: 10,
            background: isResizing ? "var(--color-accent)" : "transparent",
            transition: "background 120ms ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--color-border-strong, #D4D4D4)"; }}
          onMouseLeave={(e) => { if (!isResizing) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
        />
      )}
    </aside>
  );
}

function fileReferencesForMessage(references: CopilotThreadDetail["messages"][number]["references"]) {
  return references.filter((reference) => reference.type === "file_asset" || reference.type === "attachment");
}

function nonFileReferencesForMessage(references: CopilotThreadDetail["messages"][number]["references"]) {
  return references.filter((reference) => reference.type !== "file_asset");
}

function contentUrlFromReference(reference: CopilotThreadDetail["messages"][number]["references"][number]) {
  const payload = reference.payload;
  if (!payload) {
    return null;
  }
  const contentUrl = payload["content_url"];
  if (typeof contentUrl === "string" && contentUrl.length) {
    return contentUrl;
  }
  const url = payload["url"];
  return typeof url === "string" && url.length ? url : null;
}
