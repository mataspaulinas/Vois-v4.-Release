import { useEffect, useState } from "react";
import { NotificationRecord, fetchNotifications, fetchUnreadCount, markNotificationRead } from "../../lib/api";

type NotificationBellProps = {
  formatTimestamp: (iso: string) => string;
  authRole?: string | null;
  onNavigateToVenue?: (venueId: string) => void;
};

function actionLabelForRole(authRole: string | null | undefined): string {
  if (authRole === "barista") return "Open My Shift";
  if (authRole === "manager") return "Open venue workspace";
  return "Open venue";
}

const levelDotColor: Record<string, string> = {
  info: "var(--color-info)",
  warning: "var(--color-warning)",
  critical: "var(--color-danger)",
};

export function NotificationBell({ formatTimestamp, authRole, onNavigateToVenue }: NotificationBellProps) {
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
      <button
        className="topbar-btn"
        onClick={handleToggle}
        style={{
          position: "relative",
          minWidth: 44,
          minHeight: 44,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Notifications
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            right: -4,
            background: "var(--color-danger)",
            color: "var(--color-surface)",
            borderRadius: "var(--radius-full)",
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            fontSize: "var(--text-eyebrow)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            boxShadow: "0 0 0 2px var(--color-surface)",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 380,
            maxHeight: 440,
            overflowY: "auto",
            background: "var(--color-surface)",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.04)",
            zIndex: 100,
          }}>
            {/* Header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <strong style={{ fontSize: "var(--text-body)", color: "var(--color-text-primary)" }}>Notifications</strong>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: "var(--text-small)",
                  color: "var(--color-accent)",
                  fontWeight: 600,
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* Body */}
            {loading ? (
              <div style={{
                padding: "32px 16px",
                textAlign: "center",
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted)",
              }}>
                Loading...
              </div>
            ) : notifications.length ? (
              <div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(0,0,0,0.04)",
                      opacity: n.read_at ? 0.55 : 1,
                      cursor: "pointer",
                      transition: "background 180ms ease",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                    onClick={() => handleClick(n)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-accent-soft)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {/* Status dot */}
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: levelDotColor[n.level] ?? "var(--color-text-muted)",
                      flexShrink: 0,
                      marginTop: 6,
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 2,
                      }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: "var(--text-eyebrow)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: levelDotColor[n.level] ?? "var(--color-text-muted)",
                        }}>
                          {n.level}
                        </span>
                        <span style={{
                          fontSize: "var(--text-eyebrow)",
                          color: "var(--color-text-muted)",
                          flexShrink: 0,
                          marginLeft: 8,
                        }}>
                          {formatTimestamp(n.created_at)}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: "var(--text-body)",
                        fontWeight: n.read_at ? 400 : 600,
                        color: "var(--color-text-primary)",
                        lineHeight: 1.4,
                      }}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p style={{
                          margin: "3px 0 0 0",
                          fontSize: "var(--text-small)",
                          color: "var(--color-text-muted)",
                          lineHeight: 1.4,
                        }}>
                          {n.body}
                        </p>
                      )}
                      {!n.read_at && n.entity_id ? (
                        <span style={{
                          fontSize: "var(--text-eyebrow)",
                          color: "var(--color-accent)",
                          marginTop: 4,
                          display: "inline-block",
                          fontWeight: 500,
                        }}>
                          {actionLabelForRole(authRole)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: "32px 16px",
                textAlign: "center",
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted)",
              }}>
                No notifications yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
