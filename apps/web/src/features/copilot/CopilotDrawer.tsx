import { CopilotAttachment, CopilotThreadDetail, CopilotThreadSummary } from "../../lib/api";

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
}: CopilotDrawerProps) {
  return (
    <aside className={`copilot-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="copilot-drawer-header">
        <div>
          <p className="section-eyebrow">vOIS</p>
          <h2>Working conversations</h2>
          <p className="history-note">
            {contextLabel}: {contextSummary}
          </p>
        </div>
        <button className="topbar-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="copilot-layout">
        <div className="copilot-thread-list">
          {threads.map((thread) => (
            <button
              key={thread.id}
              className={`copilot-thread-button ${selectedThreadId === thread.id ? "selected" : ""}`}
              onClick={() => onSelectThread(thread.id)}
              disabled={loading || sending}
            >
              <strong>{thread.title}</strong>
              <span>{thread.scope}</span>
              <span>
                {thread.message_count} messages
                {thread.latest_message_at ? ` | ${formatTimestamp(thread.latest_message_at)}` : ""}
              </span>
            </button>
          ))}
          {!threads.length ? (
            <div className="empty-state compact">
              <p>No copilot threads available yet.</p>
            </div>
          ) : null}
        </div>

        <div className="copilot-conversation">
          {unavailableMessage ? (
            <div className="empty-state">
              <p>{unavailableMessage}</p>
            </div>
          ) : null}
          {loading ? (
            <div className="empty-state compact">
              <p>Loading copilot thread...</p>
            </div>
          ) : !unavailableMessage && selectedThread ? (
            <>
              <div className="copilot-message-list">
                {selectedThread.messages.map((message) => (
                  <article
                    className={`copilot-message ${message.author_role === "assistant" ? "assistant" : "user"}`}
                    key={message.id}
                  >
                    <div className="thread-row">
                      <span>{message.author_role === "assistant" ? "VOIS" : "You"}</span>
                      <em>
                        {message.source_mode} · {formatTimestamp(message.created_at)}
                      </em>
                    </div>
                    <p className="copilot-message-body">{message.content}</p>
                    {fileReferencesForMessage(message.references).length ? (
                      <div className="copilot-file-list">
                        {fileReferencesForMessage(message.references).map((reference) => (
                          <a
                            className="copilot-file-chip"
                            href={contentUrlFromReference(reference) ?? "#"}
                            key={`${message.id}-${reference.id ?? reference.label}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {reference.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {message.attachments.length ? (
                      <div className="dependency-list">
                        {message.attachments.map((attachment) => (
                          <span key={`${message.id}-${attachment.file_asset_id ?? attachment.file_name}`}>
                            attachment: {attachment.file_name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {nonFileReferencesForMessage(message.references).length ? (
                      <div className="dependency-list">
                        {nonFileReferencesForMessage(message.references).map((reference) => (
                          <span key={`${message.id}-${reference.type}-${reference.label}`}>
                            {reference.type}: {reference.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              {signalSuggestion ? (
                <div className="focus-card">
                  <p className="section-eyebrow">Signal update suggestion</p>
                  <div className="dependency-list">
                    {signalSuggestion.suggestion.add.map((item) => (
                      <span key={`add-${item.signal_id}`}>add {item.signal_name ?? item.signal_id}</span>
                    ))}
                    {signalSuggestion.suggestion.remove.map((signalId) => (
                      <span key={`remove-${signalId}`}>remove {signalId}</span>
                    ))}
                  </div>
                  <p className="history-note">
                    Review before applying. Accepted changes update the saved assessment, not hidden system state.
                  </p>
                  <div className="sample-actions">
                    <button
                      className="btn btn-primary"
                      onClick={onApplySignalSuggestion}
                      disabled={!canApplySignalSuggestion || applyingSignalSuggestion}
                    >
                      {applyingSignalSuggestion ? "Applying..." : "Apply to assessment"}
                    </button>
                    <button className="btn btn-secondary" onClick={onDismissSignalSuggestion} disabled={applyingSignalSuggestion}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="progress-form">
                <div className="copilot-attachments-toolbar">
                  <label className="btn btn-secondary attachment-picker">
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        onAttachFiles(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                    Attach files
                  </label>
                  {attachments.length ? (
                    <div className="dependency-list">
                      {attachments.map((attachment) => (
                        <button
                          key={attachment.file_name}
                          className="attachment-chip"
                          onClick={() => onRemoveAttachment(attachment.file_name)}
                          disabled={sending}
                        >
                          {attachment.file_name} x
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <textarea
                  className="progress-textarea"
                  value={input}
                  onChange={(event) => onInputChange(event.target.value)}
                  placeholder={inputPlaceholder}
                />
                <button className="btn btn-secondary" onClick={onSend} disabled={sending || !selectedThreadId}>
                  {sending ? "Sending..." : "Send to VOIS"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state compact">
              <p>{unavailableMessage ? "VOIS is blocked until the live AI runtime is configured." : "Select a thread to inspect the persisted conversation."}</p>
            </div>
          )}
        </div>
      </div>
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
