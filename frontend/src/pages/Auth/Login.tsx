import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { isAdminEmail } from "../../config/admin";
import api from "../../services/api";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
      });

      console.log(response.data);
      const loggedInUser = {
        ...response.data.user,
        isAdmin: Boolean(response.data.user?.isAdmin || isAdminEmail(response.data.user?.email)),
      };

      localStorage.setItem("footprints_token", response.data.token);
      localStorage.setItem("footprints_user", JSON.stringify(loggedInUser));
      setMessage("Welcome back. Your map is ready.");
      navigate(loggedInUser.isAdmin ? "/admin-dashboard" : "/dashboard");
    } catch (error) {
      console.error(error);
      const apiMessage =
        axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message
          ? error.response.data.message
          : "";
      setMessage(apiMessage || "Login failed. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        html,
        body,
        #root {
          width: 100%;
          max-width: none;
          overflow: hidden;
          border: 0;
        }

        .login-page {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100svh;
          overflow: hidden;
          box-sizing: border-box;
          color: #24332f;
          background:
            radial-gradient(circle at 16% 18%, rgba(80, 150, 126, 0.14), transparent 28%),
            linear-gradient(135deg, #f7f4ec 0%, #edf4ef 52%, #f9fbf7 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          text-align: left;
        }

        .login-shell {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(420px, 0.96fr);
          overflow: hidden;
          border: 0;
          border-radius: 0;
          background: rgba(255, 255, 255, 0.74);
          backdrop-filter: blur(18px);
        }

        .travel-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(24px, 3vw, 44px) clamp(32px, 5vw, 84px);
          overflow: hidden;
          background:
            linear-gradient(rgba(32, 69, 60, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(32, 69, 60, 0.08) 1px, transparent 1px),
            linear-gradient(160deg, #e9f1ea, #f7efe2);
          background-size: 42px 42px, 42px 42px, auto;
        }

        .travel-panel::after {
          content: "";
          position: absolute;
          inset: clamp(18px, 2.5vw, 38px);
          border: 1px solid rgba(36, 51, 47, 0.12);
          border-radius: 6px;
          pointer-events: none;
        }

        .brand-mark {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #213832;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0;
        }

        .brand-pin {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: #2f6f5e;
          box-shadow: 0 10px 22px rgba(47, 111, 94, 0.25);
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

        .route-art {
          position: relative;
          z-index: 1;
          width: min(390px, 64%);
          margin: auto;
        }

        .route-card {
          padding: 24px;
          border: 1px solid rgba(36, 51, 47, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.42);
        }

        .route-map {
          width: 100%;
          height: auto;
          display: block;
        }

        .memory-note {
          position: relative;
          z-index: 1;
          max-width: 360px;
          color: #52645f;
          font-size: 15px;
          line-height: 1.5;
        }

        .memory-note strong {
          display: block;
          margin-bottom: 6px;
          color: #24332f;
          font-size: 16px;
        }

        .form-panel {
          display: flex;
          align-items: center;
          padding: clamp(28px, 5vw, 72px);
          background: rgba(255, 255, 255, 0.86);
        }

        .login-form-wrap {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
        }

        .eyebrow {
          margin: 0 0 14px;
          color: #6a7b73;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .login-title {
          margin: 0;
          color: #1e2c28;
          font-size: clamp(34px, 5vw, 48px);
          line-height: 1;
          font-weight: 750;
          letter-spacing: 0;
        }

        .login-copy {
          margin: 16px 0 28px;
          max-width: 380px;
          color: #66766f;
          font-size: 16px;
          line-height: 1.55;
        }

        .login-form {
          display: grid;
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field label {
          color: #34443f;
          font-size: 14px;
          font-weight: 700;
        }

        .field input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9ded6;
          border-radius: 8px;
          padding: 13px 15px;
          color: #1f2d29;
          background: #fbfcfa;
          font: inherit;
          font-size: 16px;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .field input:focus {
          border-color: #2f6f5e;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(47, 111, 94, 0.12);
        }

        .login-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 2px;
        }

        .remember {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #62726c;
          font-size: 14px;
        }

        .remember input {
          width: 16px;
          height: 16px;
          accent-color: #2f6f5e;
        }

        .forgot-link {
          color: #2f6f5e;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .login-button {
          width: 100%;
          min-height: 50px;
          border: 0;
          border-radius: 8px;
          margin-top: 4px;
          color: #fff;
          background: #24332f;
          font: inherit;
          font-size: 16px;
          font-weight: 750;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .login-button:hover {
          background: #2f6f5e;
          box-shadow: 0 14px 28px rgba(47, 111, 94, 0.2);
          transform: translateY(-1px);
        }

        .login-button:disabled {
          cursor: wait;
          opacity: 0.72;
          transform: none;
          box-shadow: none;
        }

        .form-message {
          min-height: 22px;
          margin: 12px 0 0;
          color: #52645f;
          font-size: 14px;
          line-height: 1.5;
        }

        .signup-copy {
          margin: 20px 0 0;
          color: #6b7b75;
          font-size: 14px;
        }

        .signup-copy a {
          color: #2f6f5e;
          font-weight: 750;
          text-decoration: none;
        }

        .signup-copy a:hover {
          text-decoration: underline;
        }

        @media (max-width: 760px) {
          .login-page {
            position: fixed;
          }

          .login-shell {
            grid-template-columns: 1fr;
            grid-template-rows: 34svh 66svh;
          }

          .travel-panel {
            min-height: 0;
            padding: 22px 24px;
          }

          .route-art {
            width: min(210px, 54%);
          }

          .memory-note {
            display: none;
          }

          .form-panel {
            align-items: start;
            overflow: hidden;
            padding: 24px;
          }

          .eyebrow {
            margin-bottom: 10px;
            font-size: 11px;
          }

          .login-title {
            font-size: 34px;
          }

          .login-copy {
            margin: 12px 0 18px;
            font-size: 14px;
            line-height: 1.45;
          }

          .login-form {
            gap: 12px;
          }

          .field {
            gap: 6px;
          }

          .field input {
            padding: 11px 13px;
          }

          .login-actions {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .login-button {
            min-height: 46px;
          }

          .form-message {
            margin-top: 8px;
          }

          .signup-copy {
            margin-top: 10px;
          }
        }
      `}</style>

      <main className="login-shell" aria-label="Footprints login">
        <section className="travel-panel" aria-hidden="true">
          <div className="brand-mark">
            <span className="brand-pin" />
            Footprints
          </div>

          <div className="route-art">
            <div className="route-card">
              <svg
                className="route-map"
                viewBox="0 0 260 230"
                role="img"
                aria-label="A travel route connecting saved memories"
              >
                <path
                  d="M34 174C66 128 92 198 125 148C151 109 119 72 165 55C197 43 214 64 227 34"
                  fill="none"
                  stroke="#2f6f5e"
                  strokeDasharray="7 9"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                <circle cx="34" cy="174" fill="#f2b35d" r="12" />
                <circle cx="125" cy="148" fill="#ffffff" r="10" stroke="#2f6f5e" strokeWidth="4" />
                <circle cx="227" cy="34" fill="#2f6f5e" r="12" />
                <path
                  d="M68 76c0-20 16-36 36-36s36 16 36 36c0 28-36 68-36 68S68 104 68 76Z"
                  fill="#ffffff"
                  stroke="#24332f"
                  strokeWidth="5"
                />
                <circle cx="104" cy="76" fill="#f2b35d" r="12" />
                <path d="M28 200h204" stroke="#c9d4cc" strokeLinecap="round" strokeWidth="3" />
              </svg>
            </div>
          </div>

          <p className="memory-note">
            <strong>Your journeys, gathered quietly.</strong>
            Sign in to revisit places, notes, photos, and the small details that made each stop yours.
          </p>
        </section>

        <section className="form-panel">
          <div className="login-form-wrap">
            <p className="eyebrow">Travel memory tracker</p>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-copy">
              Continue building your personal map of remembered places and the stories attached to them.
            </p>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="login-actions">
                <label className="remember">
                  <input type="checkbox" />
                  Remember me
                </label>
                <a className="forgot-link" href="/forgot-password">
                  Forgot password?
                </a>
              </div>

              <button className="login-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Opening your map..." : "Log in"}
              </button>
            </form>

            <p className="form-message" role="status">
              {message}
            </p>

            <p className="signup-copy">
              New to Footprints? <a href="/signup">Create an account</a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Login;
