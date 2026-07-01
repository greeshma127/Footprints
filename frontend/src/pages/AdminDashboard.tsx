import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { isAdminEmail } from "../config/admin";
import api from "../services/api";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  savedPlaces: number;
  lastActivityAt: string | null;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
};

function formatDate(date: string | null) {
  if (!date) {
    return "No activity yet";
  }

  const dateValue = new Date(date);

  if (Number.isNaN(dateValue.getTime())) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateValue);
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const currentUser = useMemo<CurrentUser | null>(() => {
    const storedUser = localStorage.getItem("footprints_user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as CurrentUser;
    } catch {
      return null;
    }
  }, []);

  const stats = useMemo(() => {
    const totalSavedPlaces = users.reduce((total, user) => total + Number(user.savedPlaces || 0), 0);
    const activeUsers = users.filter((user) => Number(user.savedPlaces || 0) > 0).length;

    return {
      totalUsers: users.length,
      activeUsers,
      totalSavedPlaces,
    };
  }, [users]);

  useEffect(() => {
    const loadUsers = async () => {
      const token = localStorage.getItem("footprints_token");

      if (!token) {
        navigate("/");
        return;
      }

      if (!currentUser?.isAdmin && !isAdminEmail(currentUser?.email)) {
        navigate("/dashboard");
        return;
      }

      setIsLoading(true);
      setMessage("");

      try {
        const response = await api.get<{ users: AdminUser[] }>("/api/admin/users");
        setUsers(response.data.users);
      } catch (error) {
        console.error(error);
        const status = axios.isAxiosError<{ message?: string }>(error) ? error.response?.status : undefined;
        const apiMessage =
          axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message
            ? error.response.data.message
            : "";
        const endpointMessage =
          status === 404
            ? "Admin users endpoint was not found. Restart or redeploy the backend with the latest admin routes."
            : "";
        const accessMessage =
          status === 401 || status === 403
            ? "Admin access was rejected. Log out, log in again as admin@footprints.com, and confirm ADMIN_EMAIL is set on the backend."
            : "";

        setMessage(apiMessage || endpointMessage || accessMessage || "Could not load users. Check the backend connection.");
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [currentUser, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("footprints_token");
    localStorage.removeItem("footprints_user");
    navigate("/");
  };

  return (
    <div className="admin-dashboard-page">
      <style>{`
        html,
        body,
        #root {
          width: 100%;
          max-width: none;
          min-height: 100%;
          border: 0;
        }

        .admin-dashboard-page {
          min-height: 100svh;
          color: #24332f;
          background: #f5f7f3;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          text-align: left;
        }

        .admin-nav {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 clamp(20px, 4vw, 56px);
          border-bottom: 1px solid rgba(36, 51, 47, 0.1);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(18px);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #213832;
          font-size: 18px;
          font-weight: 750;
        }

        .brand-pin {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: #2f6f5e;
          box-shadow: 0 10px 22px rgba(47, 111, 94, 0.22);
        }

        .brand-pin::before {
          content: "";
          width: 12px;
          height: 12px;
          background:
            linear-gradient(#fff, #fff) center / 2px 12px no-repeat,
            linear-gradient(#fff, #fff) center / 12px 2px no-repeat;
          transform: rotate(45deg);
        }

        .admin-user {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #52645f;
          font-size: 13px;
        }

        .admin-user strong {
          display: block;
          color: #22312d;
          font-size: 14px;
        }

        .admin-button {
          min-height: 40px;
          border: 1px solid #cfd8d1;
          border-radius: 8px;
          padding: 0 14px;
          color: #24332f;
          background: #fff;
          font: inherit;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition: border-color 160ms ease, color 160ms ease, transform 160ms ease;
        }

        .admin-button:hover {
          border-color: #2f6f5e;
          color: #2f6f5e;
          transform: translateY(-1px);
        }

        .admin-main {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 36px 0 56px;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: end;
          margin-bottom: 24px;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #6a7b73;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .admin-title {
          margin: 0;
          color: #1e2c28;
          font-size: clamp(32px, 4vw, 46px);
          line-height: 1;
          font-weight: 800;
        }

        .admin-copy {
          margin: 12px 0 0;
          max-width: 620px;
          color: #62726c;
          font-size: 16px;
          line-height: 1.55;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat-card,
        .users-panel {
          border: 1px solid rgba(36, 51, 47, 0.1);
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 18px 44px rgba(33, 56, 50, 0.08);
        }

        .stat-card {
          padding: 20px;
        }

        .stat-card span {
          display: block;
          color: #6a7b73;
          font-size: 13px;
          font-weight: 750;
        }

        .stat-card strong {
          display: block;
          margin-top: 8px;
          color: #1f2d29;
          font-size: 32px;
          line-height: 1;
        }

        .users-panel {
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(36, 51, 47, 0.1);
        }

        .panel-header h2 {
          margin: 0;
          color: #22312d;
          font-size: 18px;
        }

        .panel-status {
          color: #6a7b73;
          font-size: 14px;
        }

        .users-table-wrap {
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        .users-table th,
        .users-table td {
          padding: 15px 20px;
          border-bottom: 1px solid rgba(36, 51, 47, 0.08);
          text-align: left;
          vertical-align: middle;
        }

        .users-table th {
          color: #66766f;
          background: #fbfcfa;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .users-table td {
          color: #2c3b36;
          font-size: 14px;
        }

        .user-name {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 750;
        }

        .user-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: #24332f;
          font-size: 13px;
          font-weight: 800;
        }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          border-radius: 999px;
          padding: 0 10px;
          color: #855214;
          background: #fff1d8;
          font-size: 12px;
          font-weight: 800;
        }

        .empty-state {
          padding: 34px 20px;
          color: #62726c;
          text-align: center;
        }

        @media (max-width: 760px) {
          .admin-nav {
            height: auto;
            align-items: flex-start;
            flex-direction: column;
            padding: 18px 20px;
          }

          .admin-user {
            width: 100%;
            justify-content: space-between;
          }

          .admin-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <nav className="admin-nav" aria-label="Admin navigation">
        <div className="brand-mark">
          <span className="brand-pin" />
          Footprints Admin
        </div>

        <div className="admin-user">
          <div>
            <strong>{currentUser?.name || "Admin"}</strong>
            <span>{currentUser?.email || "Admin dashboard"}</span>
          </div>
          <button className="admin-button" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Account overview</p>
            <h1 className="admin-title">Users</h1>
            <p className="admin-copy">
              View every Footprints account and see how many saved places each traveler has added.
            </p>
          </div>
        </header>

        <section className="stats-grid" aria-label="User statistics">
          <div className="stat-card">
            <span>Total users</span>
            <strong>{stats.totalUsers}</strong>
          </div>
          <div className="stat-card">
            <span>Users with places</span>
            <strong>{stats.activeUsers}</strong>
          </div>
          <div className="stat-card">
            <span>Saved places</span>
            <strong>{stats.totalSavedPlaces}</strong>
          </div>
        </section>

        <section className="users-panel" aria-label="Registered users">
          <div className="panel-header">
            <h2>Registered accounts</h2>
            <span className="panel-status">{isLoading ? "Loading..." : `${users.length} users`}</span>
          </div>

          {message ? <div className="empty-state">{message}</div> : null}

          {!message && users.length > 0 ? (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Saved places</th>
                    <th>Last activity</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const initials = user.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={user.id}>
                        <td>
                          <span className="user-name">
                            <span className="user-avatar">{initials || "U"}</span>
                            {user.name}
                          </span>
                        </td>
                        <td>{user.email}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>{user.savedPlaces}</td>
                        <td>{formatDate(user.lastActivityAt)}</td>
                        <td>{user.email === currentUser?.email ? <span className="admin-badge">Admin</span> : "User"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {!message && !isLoading && users.length === 0 ? (
            <div className="empty-state">No registered users found.</div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
