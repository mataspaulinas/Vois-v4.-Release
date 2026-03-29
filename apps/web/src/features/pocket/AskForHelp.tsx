import { useMemo, useState } from "react";

import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import {
  HelpRequestRecord,
  MyShiftResponse,
  StandardItem,
} from "../../lib/api";

type AskForHelpProps = {
  shift: MyShiftResponse | null;
  standards: StandardItem[];
  venueName: string;
  helpRequests: HelpRequestRecord[];
  loading: boolean;
  submitting: boolean;
  onCreateHelpRequest: (title: string, prompt: string) => Promise<void>;
  onCloseHelpRequest: (helpRequestId: string) => Promise<void>;
  onOpenThread: (threadId: string) => void;
};

type HelpCard = {
  title: string;
  body: string;
  tone: "friendly" | "tip" | "heads-up";
};

const TONE_STYLES: Record<HelpCard["tone"], { border: string; icon: string }> = {
  friendly: { border: "var(--sky)", icon: "?" },
  tip: { border: "var(--leaf)", icon: "i" },
  "heads-up": { border: "var(--gold)", icon: "!" },
};

export function AskForHelp({
  shift,
  standards,
  venueName,
  helpRequests,
  loading,
  submitting,
  onCreateHelpRequest,
  onCloseHelpRequest,
  onOpenThread,
}: AskForHelpProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const cards = useMemo(() => generateEmployeeHelp({ shift, standards, venueName }), [shift, standards, venueName]);
  const openRequests = helpRequests.filter((item) => item.status !== "closed");
  const recentRequests = helpRequests.filter((item) => item.status === "closed");

  async function handleSubmit() {
    if (!title.trim() || !prompt.trim()) {
      return;
    }
    await onCreateHelpRequest(title.trim(), prompt.trim());
    setTitle("");
    setPrompt("");
  }

  return (
    <div className="pocket-view">
      <SectionCard
        eyebrow="Help"
        title="Request support"
        description="Create a real help request, then continue the linked thread with grounded context."
      >
        <div className="progress-form">
          <input
            className="progress-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What do you need help with?"
          />
          <textarea
            className="progress-textarea"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what is confusing, blocked, or risky on this shift..."
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !title.trim() || !prompt.trim()}>
            {submitting ? "Sending..." : "Create help request"}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Requests"
        title="Open and recent help"
        description="Help is now its own operational lane. Open the linked thread to continue the conversation."
      >
        {loading ? (
          <div className="empty-state">
            <p>Loading help requests...</p>
          </div>
        ) : (
          <div className="thread-list">
            {[...openRequests, ...recentRequests.slice(0, 4)].map((request) => (
              <div className="history-card" key={request.id}>
                <div className="thread-row">
                  <strong>{request.title}</strong>
                  <em>{request.status}</em>
                </div>
                <p className="history-note">{request.prompt}</p>
                <div className="dependency-list">
                  <span>{new Date(request.created_at).toLocaleString()}</span>
                  {request.channel ? <span>{request.channel}</span> : null}
                </div>
                <div className="sample-actions">
                  {request.linked_thread_id ? (
                    <button className="btn btn-secondary" onClick={() => onOpenThread(request.linked_thread_id!)}>
                      Open linked thread
                    </button>
                  ) : null}
                  {request.status !== "closed" ? (
                    <button className="btn btn-secondary" onClick={() => onCloseHelpRequest(request.id)} disabled={submitting}>
                      Mark closed
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {!helpRequests.length ? (
              <div className="empty-state">
                <p>No help requests yet. Use this when you need clarification, not just when something breaks.</p>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Tips"
        title="Shift guidance"
        description="Passive coaching stays here, but it no longer replaces a real support request."
      >
        {cards.length === 0 ? (
          <div className="empty-state">
            <p>No tasks loaded yet, so there is nothing specific to coach right now.</p>
          </div>
        ) : (
          <div>
            {cards.map((card, index) => {
              const style = TONE_STYLES[card.tone];
              return (
                <div
                  key={`${card.title}-${index}`}
                  style={{
                    padding: "var(--spacing-md)",
                    borderLeft: `3px solid ${style.border}`,
                    marginBottom: "var(--spacing-sm)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-raised)",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: style.border, width: 20, textAlign: "center" }}>
                      {style.icon}
                    </span>
                    <span style={{ fontWeight: 500 }}>{card.title}</span>
                  </div>
                  {expandedIndex === index ? (
                    <div
                      style={{
                        marginTop: "var(--spacing-sm)",
                        paddingLeft: 28,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        fontSize: "0.9rem",
                      }}
                    >
                      {card.body}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function generateEmployeeHelp(ctx: {
  shift: MyShiftResponse | null;
  standards: StandardItem[];
  venueName: string;
}): HelpCard[] {
  const cards: HelpCard[] = [];
  const { shift, standards, venueName } = ctx;

  if (!shift || shift.tasks.length === 0) {
    return cards;
  }

  const inProgressTasks = shift.tasks.filter((task) => task.status === "in_progress");
  const blockedTasks = shift.tasks.filter((task) => task.status === "blocked");

  cards.push({
    title: `You have ${shift.tasks.length} task${shift.tasks.length !== 1 ? "s" : ""} at ${venueName}`,
    body: "Work one task at a time. If you are unsure what good looks like, open standards or create a help request instead of guessing.",
    tone: "friendly",
  });

  if (inProgressTasks.length > 0) {
    const task = inProgressTasks[0];
    const completedSteps = task.sub_actions.filter((step) => step.completed).length;
    const totalSteps = task.sub_actions.length;
    cards.push({
      title: `Working on: ${task.title}`,
      body:
        totalSteps > 0
          ? `You have completed ${completedSteps} of ${totalSteps} sub-actions. Keep moving in sequence and log help early if the next step is unclear.`
          : "This task has no saved sub-actions. Follow the standard, then ask for help if something does not match reality.",
      tone: "tip",
    });
  }

  if (blockedTasks.length > 0) {
    cards.push({
      title: `${blockedTasks.length} task${blockedTasks.length > 1 ? "s are" : " is"} blocked`,
      body: "Do not improvise around a blocker. Create a help request or report the friction so the blockage is visible and grounded.",
      tone: "heads-up",
    });
  }

  if (shift.overdue_follow_ups > 0) {
    cards.push({
      title: `${shift.overdue_follow_ups} overdue follow-up${shift.overdue_follow_ups > 1 ? "s" : ""}`,
      body: "These need explicit attention. If you do not know the next move, ask for help before the delay spreads.",
      tone: "heads-up",
    });
  }

  if (standards.length > 0) {
    cards.push({
      title: "Standards are available",
      body: `There are ${standards.length} saved standards linked to your venue tasks. Use them for procedure; use Help when the procedure still does not fit the reality on shift.`,
      tone: "tip",
    });
  }

  return cards;
}
