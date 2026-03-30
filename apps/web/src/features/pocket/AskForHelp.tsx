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

const TONE_COLORS: Record<HelpCard["tone"], { border: string; icon: string; bg: string }> = {
  friendly: { border: "#6366F1", icon: "?", bg: "#EEF2FF" },
  tip: { border: "#10B981", icon: "i", bg: "#ECFDF5" },
  "heads-up": { border: "#F59E0B", icon: "!", bg: "#FFFBEB" },
};

const sectionPadding: React.CSSProperties = { padding: 20 };

const sectionHeading: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#1a1a2e",
  marginBottom: 4,
};

const sectionDesc: React.CSSProperties = {
  fontSize: 14,
  color: "#666",
  marginBottom: 16,
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid #e0e0e0",
  padding: "0 16px",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #e0e0e0",
  padding: 16,
  fontSize: 16,
  outline: "none",
  resize: "vertical",
  minHeight: 100,
  lineHeight: 1.5,
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 8,
  border: "none",
  background: "#6C5CE7",
  color: "#fff",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  height: 48,
  borderRadius: 8,
  border: "1px solid #e0e0e0",
  background: "#fff",
  color: "#1a1a2e",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  padding: "0 16px",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
      {/* ---- Request support form ---- */}
      <div style={sectionPadding}>
        <div style={sectionHeading}>Request support</div>
        <div style={sectionDesc}>
          Create a real help request, then continue the linked thread with grounded context.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={inputStyle}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What do you need help with?"
          />
          <textarea
            style={textareaStyle}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what is confusing, blocked, or risky on this shift..."
          />
          <button
            style={{
              ...primaryBtnStyle,
              opacity: submitting || !title.trim() || !prompt.trim() ? 0.5 : 1,
              cursor: submitting || !title.trim() || !prompt.trim() ? "not-allowed" : "pointer",
            }}
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !prompt.trim()}
          >
            {submitting ? "Sending..." : "Create help request"}
          </button>
        </div>
      </div>

      {/* ---- Open and recent help ---- */}
      <div style={sectionPadding}>
        <div style={sectionHeading}>Open and recent help</div>
        <div style={sectionDesc}>
          Help is now its own operational lane. Open the linked thread to continue the conversation.
        </div>

        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 16 }}>
            Loading help requests...
          </div>
        ) : (
          <div>
            {[...openRequests, ...recentRequests.slice(0, 4)].map((request) => (
              <div key={request.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>{request.title}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: request.status === "closed" ? "#ECFDF5" : "#EEF2FF",
                    color: request.status === "closed" ? "#10B981" : "#6366F1",
                    textTransform: "uppercase",
                  }}>
                    {request.status}
                  </span>
                </div>
                <p style={{ fontSize: 16, color: "#555", lineHeight: 1.4, marginBottom: 10 }}>
                  {request.prompt}
                </p>
                <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#888", marginBottom: 12 }}>
                  <span>{new Date(request.created_at).toLocaleString()}</span>
                  {request.channel ? <span>{request.channel}</span> : null}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {request.linked_thread_id ? (
                    <button style={secondaryBtnStyle} onClick={() => onOpenThread(request.linked_thread_id!)}>
                      Open linked thread
                    </button>
                  ) : null}
                  {request.status !== "closed" ? (
                    <button
                      style={{ ...secondaryBtnStyle, opacity: submitting ? 0.5 : 1 }}
                      onClick={() => onCloseHelpRequest(request.id)}
                      disabled={submitting}
                    >
                      Mark closed
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {!helpRequests.length ? (
              <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 16 }}>
                No help requests yet. Use this when you need clarification, not just when something breaks.
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ---- Shift guidance tips ---- */}
      <div style={sectionPadding}>
        <div style={sectionHeading}>Shift guidance</div>
        <div style={sectionDesc}>
          Passive coaching stays here, but it no longer replaces a real support request.
        </div>

        {cards.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 16 }}>
            No tasks loaded yet, so there is nothing specific to coach right now.
          </div>
        ) : (
          <div>
            {cards.map((card, index) => {
              const tone = TONE_COLORS[card.tone];
              return (
                <div
                  key={`${card.title}-${index}`}
                  style={{
                    padding: 20,
                    borderLeft: `4px solid ${tone.border}`,
                    marginBottom: 12,
                    borderRadius: 16,
                    background: tone.bg,
                    cursor: "pointer",
                    minHeight: 48,
                  }}
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: 18,
                      color: tone.border,
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: "#fff",
                      flexShrink: 0,
                    }}>
                      {tone.icon}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 16, color: "#1a1a2e" }}>{card.title}</span>
                  </div>
                  {expandedIndex === index ? (
                    <div style={{
                      marginTop: 12,
                      paddingLeft: 40,
                      color: "#555",
                      lineHeight: 1.5,
                      fontSize: 16,
                    }}>
                      {card.body}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
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
