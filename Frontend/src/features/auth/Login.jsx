import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck, Eye, EyeOff } from "lucide-react";
import Logo from "../../Components/Logo";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(form);
      const from = location.state?.from;

      const target =
        from ||
        (data.user.role === "admin"
          ? "/admin"
          : data.user.role === "mechanic"
            ? "/mechanic"
            : "/customer");

      navigate(target, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Check your backend."
      );
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
      {/* Left section */}
      <div className="hidden items-center justify-center p-10 text-white lg:flex">
        <div className="max-w-lg">
          <Logo dark />

          <h1 className="mt-14 text-5xl font-black leading-tight">
            Help is closer than you think.
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-300">
            FIX MOTO brings trusted roadside help to your location, whenever
            you need it.
          </p>

          <div className="mt-8 flex gap-5 text-sm text-slate-300">
            <span>
              <ShieldCheck
                className="mr-2 inline text-green-400"
                size={18}
              />
              Verified
            </span>

            <span>24/7 Support</span>
          </div>
        </div>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center bg-slate-50 p-5 md:p-10">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl md:p-9"
        >
          <div className="lg:hidden">
            <Logo />
          </div>

          <h2 className="mt-7 text-3xl font-black">Welcome back</h2>

          <p className="mt-2 text-sm text-slate-500">
            Login to continue to FIX MOTO.
          </p>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="mt-7">
            <label htmlFor="email" className="label">
              Email
            </label>

            <input
              id="email"
              className="input"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          {/* Password with show/hide button */}
          <div className="mt-4">
            <label htmlFor="password" className="label">
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                className="input w-full pr-12"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent p-2 text-slate-500 outline-none hover:bg-transparent hover:text-red-600 focus:outline-none focus:ring-0 active:bg-transparent"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                title={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
            <LogIn size={18} />
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-bold text-red-600 hover:text-red-700"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}