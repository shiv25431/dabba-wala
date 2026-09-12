import { useState } from "react";

function Login() {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">🍱</div>

        <h1>{isRegister ? "Create Account" : "Welcome Back"}</h1>

        <p className="login-subtitle">
          {isRegister
            ? "Register to order fresh homemade tiffins"
            : "Login to order your daily tiffin"}
        </p>

        {isRegister && (
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
            />
          </div>
        )}

        <div className="input-group">
          <label>Mobile Number</label>
          <input
            type="tel"
            placeholder="Enter mobile number"
          />
        </div>

        {isRegister && (
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter email"
            />
          </div>
        )}

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
          />
        </div>

        <button className="login-button">
          {isRegister ? "Create Account" : "Login"}
        </button>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <button className="google-button">
          Continue with Google
        </button>

        <p className="switch-login">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? " Login" : " Register"}
          </button>
        </p>

        <p className="back-home">
          ← Back to Home
        </p>

      </div>
    </div>
  );
}

export default Login;