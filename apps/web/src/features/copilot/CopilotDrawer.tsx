import { useEffect, useState, type CSSProperties } from "react";

import Icon from "../../components/Icon";
import {
  CopilotActionPreview,
  CopilotActionReceipt,
  CopilotActionRecord,
  CopilotActionType,
  CopilotAttachment,
  CopilotMessageRecord,
  CopilotThreadContext,
  CopilotThreadSummary,
} from "../../lib/api";
import { CopilotRichMessage } from "./CopilotRichMessage";
import { groupCopilotThreads } from "./copilotHelpers";

type CompactAction = {
  type: CopilotActionType;
  title: string;
  description: string;
  mode: "save" | "suggest" | "draft" | "apply";
  enabled: boolean;
  status: string;
};

type CopilotDrawerProps = {
  open: boolean;
  threads: CopilotThreadSummary[];
  selectedThreadId: string | null;
  selectedThread: (CopilotThreadSummary & { messages: CopilotMessageRecord[] }) | null;
  selectedThreadContext: CopilotThreadContext | null;
  selectedThreadActions: CopilotActionRecord[];
  input: string;
  attachments: CopilotAttachment[];
  loading: boolean;
  sending: boolean;
  formatTimestamp: (isoTimestamp: string) => string;
  contextLabel: string;
  contextSummary: string;
  inputPlaceholder: string;
  unavailableMessage?: string | null;
  compactActions: CompactAction[];
  actionPreview: CopilotActionPreview | null;
  actionReceipt: CopilotActionReceipt | null;
  previewingActionType: CopilotActionType | null;
  committingActionType: CopilotActionType | null;
  onPreviewAction: (actionType: CopilotActionType) => Promise<void> | void;
  onCommitPreview: () => Promise<void> | void;
  onDismissPreview: () => void;
  onSelectThread: (threadId: string) => void;
  onInputChange: (value: string) => void;
  onAttachFiles: (files: FileList | null) => void;
  onRemoveAttachment: (fileName: string) => void;
  onSend: () => void;
  onClose: () => void;
  preFillMessage?: string | null;
  onPreFillConsumed?: () => void;
  screenContext?: string | null;
  drawerContext?: string | null;
  onOpenWorkspace?: () => void;
};

export function CopilotDrawer({
  open,
  threads,
  selectedThreadId,
  selectedThread,
  selectedThreadContext,
  selectedThreadActions,
  input,
  attachments,
  loading,
  sending,
  formatTimestamp,
  contextLabel,
  contextSummary,
  inputPlaceholder,
  unavailableMessage,
  compactActions,
  actionPreview,
  actionReceipt,
  previewingActionType,
  committingActionType,
  onPreviewAction,
  onCommitPreview,
  onDismissPreview,
  onSelectThread,
  onInputChange,
  onAttachFiles,
  onRemoveAttachment,
  onSend,
  onClose,
  preFillMessage,
  onPreFillConsumed,
  screenContext,
  drawerContext,
  onOpenWorkspace,
}: CopilotDrawerProps) {
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    if (preFillMessage && onPreFillConsumed) {
      onInputChange(preFillMessage);
      onPreFillConsumed();
    }
  }, [preFillMessage, onInputChange, onPreFillConsumed]);

  if (!open) {
    return null;
  }

  const groupedThreads = groupCopilotThreads(threads);
  const latestAssistantMessage = selectedThread?.messages?.slice().reverse().find((message) => message.author_role === "assistant");

  return (
    <div
      style={{
        position: "fixed",
        top: "var(--topbar-height, 48px)",
        right: 0,
        width: "min(420px, 100vw)",
        height: "calc(100vh - var(--topbar-height, 48px))",
        background: "var(--color-surface, #FFFFFF)",
        borderLeft: "1px solid var(--color-border-subtle, #E5E5E5)",
        boxShadow: "-10px 0 30px rgba(0,0,0,0.08)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--color-border-subtle, #E5E5E5)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted, #737373)" }}>Copilot</p>
          <h3 style={{ margin: "6px 0 4px", fontSize: 20 }}>Here when you need me</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary, #525252)" }}>{contextLabel} · {contextSummary}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onOpenWorkspace ? (
            <button onClick={onOpenWorkspace} style={iconButtonStyle} title="Open workspace">
              <Icon name="fullscreen" size={16} />
            </button>
          ) : null}
          <button onClick={onClose} aria-label="Close" style={iconButtonStyle}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {(screenContext || drawerContext || selectedThreadContext) ? (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border-subtle, #E5E5E5)",
            background: "var(--color-surface-subtle, #F7F7F5)",
            fontSize: 12,
            color: "var(--color-text-secondary, #525252)",
            lineHeight: 1.5,
          }}
        >
          {screenContext ? <div>Seeing: {screenContext}</div> : null}
          {drawerContext ? <div>Viewing: {drawerContext}</div> : null}
          {selectedThreadContext?.memory_scope_label ? <div>{selectedThreadContext.memory_scope_label}</div> : null}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "148px 1fr", minHeight: 0, flex: 1 }}>
        <aside
          style={{
            borderRight: "1px solid var(--color-border-subtle, #E5E5E5)",
            overflowY: "auto",
            padding: "14px 10px",
          }}
        >
          {groupedThreads.map((group) => (
            <div key={group.label} style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted, #737373)" }}>{group.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.items.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => onSelectThread(thread.id)}
                    style={{
                      ...threadButtonStyle,
                      borderColor: selectedThreadId === thread.id ? "var(--color-text-primary, #111827)" : "var(--color-border-subtle, #E5E5E5)",
                      background: selectedThreadId === thread.id ? "var(--color-surface-subtle, #F7F7F5)" : "transparent",
                    }}
                  >
                    <strong style={{ fontSize: 12 }}>{thread.title}</strong>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted, #737373)" }}>
                      {thread.visibility === "private" ? "Private" : "Shared"} · {thread.context_label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          {unavailableMessage ? (
            <div style={emptyStateStyle}>{unavailableMessage}</div>
          ) : loading ? (
            <div style={emptyStateStyle}>Loading thread…</div>
          ) : (
            <>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border-subtle, #E5E5E5)" }}>
                <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted, #737373)" }}>
                  {selectedThread?.visibility === "private" ? "Private thread" : "Shared thread"}
                </p>
                <h4 style={{ margin: "6px 0 4px", fontSize: 18 }}>{selectedThread?.title ?? "No thread selected"}</h4>
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary, #525252)" }}>
                  {selectedThread?.context_label ?? contextLabel}
                </p>
              </div>

              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border-subtle, #E5E5E5)", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ ...eyebrowStyle, marginBottom: 0 }}>Quick actions</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {compactActions.map((action) => (
                    <button
                      key={action.type}
                      onClick={() => void onPreviewAction(action.type)}
                      disabled={!action.enabled || Boolean(committingActionType)}
                      style={secondaryButtonStyle}
                    >
                      {previewingActionType === action.type ? "Getting this ready…" : action.title}
                    </button>
                  ))}
                </div>
                {actionPreview ? (
                  <div style={cardStyle}>
                    <p style={eyebrowStyle}>Before you save</p>
                    <strong>{actionPreview.title}</strong>
                    <div style={{ marginTop: 6, fontSize: 13, color: "var(--color-text-secondary, #525252)" }}>{actionPreview.summary}</div>
                    {actionPreview.warning ? <div style={{ marginTop: 8, fontSize: 12 }}>{actionPreview.warning}</div> : null}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={onDismissPreview} style={secondaryButtonStyle}>Not now</button>
                      <button onClick={() => void onCommitPreview()} style={primaryButtonStyle} disabled={committingActionType === actionPreview.action_type}>
                        {committingActionType === actionPreview.action_type ? "Saving…" : "Save this"}
                      </button>
                    </div>
                  </div>
                ) : null}
                {actionReceipt ? (
                  <div style={cardStyle}>
                    <p style={eyebrowStyle}>Saved</p>
                    <strong>{actionReceipt.receipt_title}</strong>
                    <div style={{ marginTop: 6, fontSize: 13, color: "var(--color-text-secondary, #525252)" }}>{actionReceipt.receipt_summary}</div>
                  </div>
                ) : null}
                {selectedThreadActions.length ? (
                  <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                    {selectedThreadActions.slice(0, 3).map((action) => (
                      <div key={action.id} style={{ ...cardStyle, minWidth: 150 }}>
                        <p style={eyebrowStyle}>Saved from here</p>
                        <strong style={{ fontSize: 13 }}>{action.title}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {latestAssistantMessage ? (
                  <div style={cardStyle}>
                    <p style={eyebrowStyle}>Latest reply</p>
                    <CopilotRichMessage content={latestAssistantMessage.content} />
                  </div>
                ) : null}
                {selectedThreadContext?.provenance_summary?.length ? (
                  <div style={cardStyle}>
                    <button onClick={() => setShowWhy((current) => !current)} style={{ ...iconButtonStyle, width: "100%" }} title={showWhy ? "Hide provenance" : "Show provenance"}>
                      <Icon name={showWhy ? "eye-off" : "eye"} size={14} />
                    </button>
                    {showWhy ? (
                      <div style={{ marginTop: 10 }}>
                        {selectedThreadContext.provenance_summary.map((item, index) => (
                          <div key={`${item.label}-${index}`} style={{ marginBottom: 8 }}>
                            <strong style={{ display: "block", fontSize: 13 }}>{item.label}</strong>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary, #525252)" }}>{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div style={{ padding: "16px 20px", borderTop: "1px solid var(--color-border-subtle, #E5E5E5)", display: "flex", flexDirection: "column", gap: 12 }}>
                <textarea
                  value={input}
                  onChange={(event) => onInputChange(event.target.value)}
                  placeholder={inputPlaceholder}
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid var(--color-border-subtle, #E5E5E5)",
                    padding: 12,
                    resize: "vertical",
                    font: "inherit",
                  }}
                />
                {attachments.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {attachments.map((attachment) => (
                      <div key={attachment.file_name} style={cardStyle}>
                        <span style={{ fontSize: 12 }}>{attachment.file_name}</span>
                        <button onClick={() => onRemoveAttachment(attachment.file_name)} style={iconButtonStyle}>×</button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={iconButtonStyle} title="Attach files">
                    <Icon name="attach" size={16} />
                    <input type="file" hidden multiple onChange={(event) => onAttachFiles(event.target.files)} />
                  </label>
                  <button onClick={onSend} disabled={sending || !input.trim()} style={{ ...iconButtonStyle, background: "var(--color-text-primary, #111827)", color: "#FFF", borderColor: "var(--color-text-primary, #111827)" }} title="Send">
                    <Icon name={sending ? "loading" : "send"} size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-text-primary, #111827)",
  color: "#FFFFFF",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const secondaryButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-surface-subtle, #F7F7F5)",
  color: "var(--color-text-primary, #111827)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const iconButtonStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "var(--color-text-muted, #737373)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 120ms ease, background 120ms ease",
};

const cardStyle: CSSProperties = {
  border: "1px solid var(--color-border-subtle, #E5E5E5)",
  borderRadius: 12,
  padding: 12,
  background: "#FFFFFF",
};

const threadButtonStyle: CSSProperties = {
  border: "1px solid var(--color-border-subtle, #E5E5E5)",
  borderRadius: 12,
  background: "transparent",
  textAlign: "left" as const,
  padding: 10,
  display: "flex",
  flexDirection: "column" as const,
  gap: 3,
  cursor: "pointer",
};

const emptyStateStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  color: "var(--color-text-muted, #737373)",
  textAlign: "center" as const,
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "var(--color-text-muted, #737373)",
};
