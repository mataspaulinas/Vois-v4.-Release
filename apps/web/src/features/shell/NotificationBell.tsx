import { useEffect, useState } from "react";
import { NotificationRecord, fetchNotifications, fetchUnreadCount, markNotificationRead } from "../../lib/api";

type NotificationBellProps = {
  formatTimestamp: (iso: string) => string;
  onNavigateToVenue?: (venueId: string) => void;
};

/** Map notification title keywords to a suggested venue view. */
function suggestView(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("task")) return "plan";
  if (t.includes("assessment")) return "assessment";
  if (t.includes("report")) return "report";
  if (t.includes("signal")) return "signals";
  if (t.includes("escalat")) return "console";
  if (t.includes("milestone") || t.includes("progress")) return "overview";
  if (t.includes("follow")) return "plan";
  return "overview";
}

export function NotificationBell({ formatTimestamp, onNavigateToVenue }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUnreadCount().then(setUnreadCount).catch(() => {});
    const interval = setInterval(() => {
      fetchUnreadCount().then(setUnreadCount).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  function handleToggle() {
    if (!open) {
      setLoading(true);
      fetchNotifications(15)
        .then((items) => { setNotifications(items); setOpen(true); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setOpen(false);
    }
  }

  async function handleClick(n: NotificationRecord) {
    // Mark as read
    if (!n.read_at) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    // Navigate to the relevant venue/surface
    if (n.entity_id && onNavigateToVenue) {
      onNavigateToVenue(n.entity_id);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="topbar-btn" onClick={handleToggle} style={{ position: "relative" }}>
        Notifications
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -6,
            background: "var(--color-danger, #dc2626)", color: "#fff",
            borderRadius: "50%", width: 18, height: 18,
            fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 4,
            width: 360, maxHeight: 420, overflowY: "auto",
            background: "var(--color-surface-elevated, #fff)", border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
            zIndex: 100,
          }}>
            <div style={{ padding: "var(--spacing-sm) var(--spacing-md)", borderBottom: "1px solid var(--color-border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "var(--text-body)" }}>Notifications</strong>
              {unreadCount > 0 && <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{unreadCount} unread</span>}
            </div>
            {loading ? (
              <div style={{ padding: "var(--spacing-lg)", opacity: 0.5, textAlign: "center" }}>Loading...</div>
            ) : notifications.length ? (
              <div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "var(--spacing-sm) var(--spacing-md)",
                      borderBottom: "1px solid var(--color-bg-muted)",
                      opacity: n.read_at ? 0.55 : 1,
                      cursor: "pointer",
                      transition: "background var(--motion-fast)",
                    }}
                    onClick={() => handleClick(n)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-bg-muted)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-small)", marginBottom: 2 }}>
                      <span style={{
                        fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px",
                        color: n.level === "warning" ? "var(--color-warning)" : n.level === "critical" ? "var(--color-danger)" : "var(--color-text-muted)",
                      }}>
                        {n.level}
                      </span>
                      <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{formatTimestamp(n.created_at)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "var(--text-body)", fontWeight: n.read_at ? 400 : 600, color: "var(--color-text-primary)" }}>{n.title}</p>
                    {n.body && <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{n.body}</p>}
                    {!n.read_at && (
                      <span style={{ fontSize: 10, color: "var(--color-accent)", marginTop: 2, display: "inline-block" }}>
                        Click to open {suggestView(n.title)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "var(--spacing-lg)", opacity: 0.5, textAlign: "center", fontSize: "var(--text-small)" }}>No notifications yet.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
