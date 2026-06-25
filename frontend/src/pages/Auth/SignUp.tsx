import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";

function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setPasswordError("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/api/auth/signup", {
        name,
        email,
        password,
      });

      console.log(response.data);
      setMessage("Your Footprints account is ready.");
      navigate("/");
    } catch (error) {
      console.error(error);
      setMessage("Signup failed. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-page">
      <style>{`
        html,
        body,
        #root {
          width: 100%;
          max-width: none;
          overflow: hidden;
          border: 0;
        }

        .signup-page {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100svh;
          overflow: hidden;
          box-sizing: border-box;
          color: #24332f;
          background:
            radial-gradient(circle at 84% 18%, rgba(242, 179, 93, 0.18), transparent 28%),
            linear-gradient(135deg, #f9fbf7 0%, #edf4ef 48%, #f7f4ec 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          text-align: left;
        }

        .signup-shell {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: minmax(420px, 0.9fr) minmax(0, 1.1fr);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.76);
          backdrop-filter: blur(18px);
        }

        .form-panel {
          display: flex;
          align-items: center;
          padding: clamp(20px, 4vw, 54px);
          background: rgba(255, 255, 255, 0.88);
        }

        .signup-form-wrap {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #6a7b73;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .signup-title {
          margin: 0;
          color: #1e2c28;
          font-size: clamp(34px, 4.3vw, 44px);
          line-height: 1;
          font-weight: 750;
          letter-spacing: 0;
        }

        .signup-copy {
          margin: 12px 0 18px;
          max-width: 400px;
          color: #66766f;
          font-size: 16px;
          line-height: 1.45;
        }

        .signup-form {
          display: grid;
          gap: 11px;
        }

        .field {
          display: grid;
          gap: 5px;
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
          padding: 10px 14px;
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

        .terms {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: #62726c;
          font-size: 14px;
          line-height: 1.35;
        }

        .terms input {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          flex: 0 0 auto;
          accent-color: #2f6f5e;
        }

        .signup-button {
          width: 100%;
          min-height: 46px;
          border: 0;
          border-radius: 8px;
          color: #fff;
          background: #24332f;
          font: inherit;
          font-size: 16px;
          font-weight: 750;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .signup-button:hover {
          background: #2f6f5e;
          box-shadow: 0 14px 28px rgba(47, 111, 94, 0.2);
          transform: translateY(-1px);
        }

        .signup-button:disabled {
          cursor: wait;
          opacity: 0.72;
          transform: none;
          box-shadow: none;
        }

        .form-message {
          min-height: 22px;
          margin: 6px 0 0;
          color: #52645f;
          font-size: 14px;
          line-height: 1.5;
        }

        .login-copy-link {
          margin: 8px 0 0;
          color: #6b7b75;
          font-size: 14px;
        }

        .login-copy-link a {
          color: #2f6f5e;
          font-weight: 750;
          text-decoration: none;
        }

        .login-copy-link a:hover {
          text-decoration: underline;
        }

        .memory-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(20px, 3vw, 38px) clamp(32px, 5vw, 84px);
          overflow: hidden;
          background:
            linear-gradient(rgba(32, 69, 60, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(32, 69, 60, 0.08) 1px, transparent 1px),
            linear-gradient(160deg, #f7efe2, #e9f1ea);
          background-size: 42px 42px, 42px 42px, auto;
        }

        .memory-panel::after {
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

        .postcard-stack {
          position: relative;
          z-index: 1;
          width: min(380px, 58%);
          margin: auto;
          aspect-ratio: 1.18;
        }

        .postcard {
          position: absolute;
          inset: 8% 0 0 8%;
          border: 1px solid rgba(36, 51, 47, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.5);
          transform: rotate(4deg);
        }

        .postcard-main {
          position: absolute;
          inset: 0 8% 8% 0;
          display: grid;
          place-items: center;
          border: 1px solid rgba(36, 51, 47, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 20px 55px rgba(36, 51, 47, 0.1);
        }

        .memory-map {
          width: 82%;
          height: auto;
          display: block;
        }

        .memory-note {
          position: relative;
          z-index: 1;
          max-width: 380px;
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

        @media (max-height: 820px) and (min-width: 761px) {
          .form-panel {
            padding-block: 18px;
          }

          .eyebrow {
            margin-bottom: 8px;
            font-size: 11px;
          }

          .signup-title {
            font-size: 36px;
          }

          .signup-copy {
            margin: 10px 0 14px;
            font-size: 14px;
            line-height: 1.35;
          }

          .signup-form {
            gap: 8px;
          }

          .field {
            gap: 4px;
          }

          .field label,
          .terms,
          .form-message,
          .login-copy-link {
            font-size: 13px;
          }

          .field input {
            padding: 8px 12px;
          }

          .signup-button {
            min-height: 42px;
          }

          .form-message {
            margin-top: 4px;
            min-height: 18px;
          }

          .login-copy-link {
            margin-top: 4px;
          }

          .postcard-stack {
            width: min(320px, 48%);
          }

          .memory-note {
            font-size: 14px;
            line-height: 1.35;
          }
        }

        @media (max-width: 760px) {
          .signup-shell {
            grid-template-columns: 1fr;
            grid-template-rows: 66svh 34svh;
          }

          .form-panel {
            align-items: start;
            overflow: hidden;
            padding: 22px 24px;
          }

          .eyebrow {
            margin-bottom: 10px;
            font-size: 11px;
          }

          .signup-title {
            font-size: 34px;
          }

          .signup-copy {
            margin: 12px 0 16px;
            font-size: 14px;
            line-height: 1.45;
          }

          .signup-form {
            gap: 10px;
          }

          .field {
            gap: 5px;
          }

          .field label,
          .terms,
          .form-message,
          .login-copy-link {
            font-size: 13px;
          }

          .field input {
            padding: 10px 13px;
          }

          .signup-button {
            min-height: 44px;
          }

          .form-message {
            margin-top: 6px;
          }

          .login-copy-link {
            margin-top: 8px;
          }

          .memory-panel {
            min-height: 0;
            padding: 22px 24px;
          }

          .postcard-stack {
            width: min(210px, 54%);
          }

          .memory-note {
            display: none;
          }
          
          .field-error {
            margin: 4px 0 0;
            color: #d32f2f;
            font-size: 13px;
            font-weight: 600;
          }
        }
      `}</style>

      <main className="signup-shell" aria-label="Footprints signup">
        <section className="form-panel">
          <div className="signup-form-wrap">
            <p className="eyebrow">Start your travel archive</p>
            <h1 className="signup-title">Create account</h1>
            <p className="signup-copy">
              Save the places you have been, the notes you want to keep, and the moments worth finding again.
            </p>

            <form className="signup-form" onSubmit={handleSignUp}>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>

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
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfirmPassword(value);

                    if (password && value && password !== value) {
                      setPasswordError("Passwords do not match.");
                    } else {
                      setPasswordError("");
                    }
                  }}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                {passwordError && (
                  <p className="field-error">{passwordError}</p>
                )}
              </div>

              <label className="terms">
                <input type="checkbox" required />
                I want to build a private map of my travel memories.
              </label>

              <button className="signup-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="form-message" role="status">
              {message}
            </p>

            <p className="login-copy-link">
              Already have an account? <Link to="/">Log in</Link>
            </p>
          </div>
        </section>

        <section className="memory-panel" aria-hidden="true">
          <div className="brand-mark">
            <span className="brand-pin" />
            Footprints
          </div>

          <div className="postcard-stack">
            <div className="postcard" />
            <div className="postcard-main">
              <svg className="memory-map" viewBox="0 0 280 230" role="img" aria-label="A new travel memory map">
                <path
                  d="M42 168C76 132 94 183 123 145C154 104 126 74 168 54C202 38 226 60 239 31"
                  fill="none"
                  stroke="#2f6f5e"
                  strokeDasharray="7 9"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                <path
                  d="M80 74c0-20 16-36 36-36s36 16 36 36c0 28-36 68-36 68S80 102 80 74Z"
                  fill="#ffffff"
                  stroke="#24332f"
                  strokeWidth="5"
                />
                <circle cx="116" cy="74" fill="#f2b35d" r="12" />
                <circle cx="42" cy="168" fill="#f2b35d" r="12" />
                <circle cx="184" cy="118" fill="#ffffff" r="10" stroke="#2f6f5e" strokeWidth="4" />
                <circle cx="239" cy="31" fill="#2f6f5e" r="12" />
                <path d="M36 198h208" stroke="#c9d4cc" strokeLinecap="round" strokeWidth="3" />
              </svg>
            </div>
          </div>

          <p className="memory-note">
            <strong>Begin with one place.</strong>
            Add a pin, attach a memory, and let your personal travel map grow one story at a time.
          </p>
        </section>
      </main>
    </div>
  );
}

export default SignUp;
