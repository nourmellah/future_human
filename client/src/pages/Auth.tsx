import React, { useState } from "react";
import LoadingOverlay from "../components/LoadingOverlay";
import LogoMark from "../components/LogoMark";
import Field from "../components/Form/Field";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

// === Types for submitting ===
export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
};

export type AuthHandlers = {
	onLogin?: (p: LoginPayload) => Promise<void> | void;
	onRegister?: (p: RegisterPayload) => Promise<void> | void;
};

export type FormProps<Payload> = {
	onSwitch: () => void;
	onSubmit?: (payload: Payload) => Promise<void> | void;
	error?: string;
};

// === Static config (assets + accent) ===
const FACE_SRC = "src/assets/face2.png";
const LOGO_SRC = "src/assets/logo.png";
const LOADER_GIF = "src/assets/loader.gif";
const ACCENT = "#E7E31B";

function SubmitButton({ children, disabled }: React.PropsWithChildren<{ disabled?: boolean }>) {
	return (
		<button
			type="submit"
			disabled={disabled}
			className={`w-full rounded-full font-semibold text-black transition-transform active:scale-[0.98] ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
			style={{ backgroundColor: ACCENT, padding: "12px 18px" }}
		>
			{children}
		</button>
	);
}

function DividerOr() {
	return (
		<div className="flex items-center gap-4 my-6">
			<div className="h-px flex-1 bg-[#262626]" />
			<span className="text-xs text-gray-400">OR</span>
			<div className="h-px flex-1 bg-[#262626]" />
		</div>
	);
}

function LoginForm({ onSwitch, onSubmit, error }: FormProps<LoginPayload>) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		try {
			await onSubmit?.({ email, password });
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			<LoadingOverlay open={loading} gifSrc={LOADER_GIF} size={300} />
			<form
				onSubmit={handleSubmit}
				className="max-w-md w-full"
				aria-label="Login form"
			>
				<h1 className="text-3xl font-extrabold text-white mb-8">Login to your Account</h1>
				{error && (
					<p className="text-xs text-red-400 -mt-3 mb-3">
						{error}
					</p>
				)}
				<Field
					label="Email"
					type="email"
					name="email"
					placeholder="Enter Your Email"
					autoComplete="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<Field
					label="Password"
					type="password"
					name="password"
					placeholder="Enter Your Password"
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				<SubmitButton disabled={loading}>{loading ? "Logging in..." : "Login"}</SubmitButton>

				<DividerOr />

				<p className="text-sm text-gray-400">
					Don't have an account?{" "}
					<button
						type="button"
						className="font-semibold underline"
						style={{ color: ACCENT }}
						onClick={onSwitch}
					>
						Register now!
					</button>
				</p>

				<p className="text-[11px] text-gray-500 mt-10">© DESIGNED BY FUTURE HUMAN</p>
			</form>
		</>
	);
}



function RegisterForm({ onSwitch, onSubmit }: FormProps<RegisterPayload>) {
	const pwdRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [pwd, setPwd] = useState("");
	const [confirm, setConfirm] = useState("");
	const [touchedPwd, setTouchedPwd] = useState(false);
	const [touchedConfirm, setTouchedConfirm] = useState(false);
	const [loading, setLoading] = useState(false);

	const isPwdValid = pwdRegex.test(pwd);
	const isMatch = confirm.length > 0 && pwd === confirm;
	const canSubmit = isPwdValid && isMatch;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setTouchedPwd(true);
		setTouchedConfirm(true);
		if (!canSubmit) return;
		setLoading(true);
		try {
			await onSubmit?.({ firstName, lastName, email, password: pwd });
		} finally {
			setLoading(false);
		}
	}
	return (
		<>
			<LoadingOverlay open={loading} gifSrc={LOADER_GIF} size={300} />
			<form onSubmit={handleSubmit} className="max-w-md w-full" aria-label="Register form">
				<h1 className="text-3xl font-extrabold text-white mb-8">Create your Account</h1>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Field label="First Name" name="firstName" placeholder="Enter your first name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
					<Field label="Last Name" name="lastName" placeholder="Enter your last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
				</div>

				<div className="mt-2">
					<Field label="Email" type="email" name="email" placeholder="Enter Your Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
				</div>

				<div>
					<Field
						label="Password"
						type="password"
						name="password"
						placeholder="Create a password"
						autoComplete="new-password"
						value={pwd}
						onChange={(e) => setPwd(e.target.value)}
						onBlur={() => setTouchedPwd(true)}
						aria-invalid={touchedPwd && !isPwdValid}
						required />
					{touchedPwd && !isPwdValid && (
						<p className="text-xs text-red-400 -mt-3 mb-3">
							Must be at least 8 characters and include an uppercase letter and a number.
						</p>
					)}
				</div>

				<div>
					<Field
						label="Confirm Password"
						type="password"
						name="confirm"
						placeholder="Re-enter password"
						autoComplete="new-password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						onBlur={() => setTouchedConfirm(true)}
						aria-invalid={touchedConfirm && !isMatch}
						required />
					{touchedConfirm && !isMatch && (
						<p className="text-xs text-red-400 -mt-3 mb-3">Passwords do not match.</p>
					)}
				</div>

				<div className="mt-6">
					<SubmitButton disabled={!canSubmit || loading}>{loading ? "Loading…" : "Sign up"}</SubmitButton>
				</div>

				<DividerOr />

				<p className="text-sm text-gray-400">
					Already have an account?{" "}
					<button type="button" className="font-semibold underline" style={{ color: ACCENT }} onClick={onSwitch}>
						Login
					</button>
				</p>

				<p className="text-[11px] text-gray-500 mt-10">© DESIGNED BY FUTURE HUMAN</p>
			</form>
		</>
	);
}

export default function AuthScreens({ defaultMode = "login", onLogin, onRegister }: { defaultMode?: "login" | "register" } & AuthHandlers) {
	const [mode, setMode] = useState(defaultMode);
	const [imgFailed, setImgFailed] = React.useState(!FACE_SRC);
	const [imgLoading, setImgLoading] = useState(!!FACE_SRC && !imgFailed);
	const [loginError, setLoginError] = useState("");

	const isLogin = mode === "login";

	const { login, register } = useAuth()
	const navigate = useNavigate();

	// Login submit handler
	const loginHandler = async (values: { email: string; password: string }) => {
		try {
			await login(values.email.trim(), values.password);
			// Success: AuthProvider sets user/token; your route guards/effects can redirect.
			if (onLogin) await onLogin({ email: values.email, password: values.password });
			navigate("/create"); // Redirect after login
		} catch (err: any) {
			console.error('Login failed:', err?.response?.data ?? err);
			// surface in your UI if you have a toast/state here
			// e.g., toast.error(err?.response?.data?.message ?? 'Invalid credentials')
			setLoginError(err?.response?.data?.error ?? 'Invalid credentials');
		}
	};

	// Register submit handler
	const registerHandler = async (values: { name?: string; email: string; password: string }) => {
		try {
			await register({
				name: values.name?.trim() || undefined,
				email: values.email.trim(),
				password: values.password,
			});
			// Success: user is set by AuthProvider.
			// if (onRegister) await onRegister({ firstName: values.name?.trim(), email: values.email, password: values.password });
			navigate("/account"); // Redirect after login
		} catch (err: any) {
			console.error('Registration failed:', err?.response?.data ?? err);
			// surface in your UI if you have a toast/state here
			// e.g., toast.error(err?.response?.data?.message ?? 'Could not create account')
		}
	};


	return (
		<div className="min-h-screen w-full bg-black text-white">
			{/* Global overlay while hero image loads */}
			<LoadingOverlay open={imgLoading} gifSrc={LOADER_GIF} size={300} />

			{/* Content wrapper */}
			<div className="mx-auto max-w-[1400px] min-h-screen grid grid-cols-1 lg:grid-cols-2">
				{/* Left visual area */}
				<div className="relative hidden lg:block">
					{/* Hero image OR fallback brand */}
					{!imgFailed ? (
						<>
							<img
								src={FACE_SRC}
								alt="Futuristic human face"
								className="absolute inset-0 w-full h-full object-cover opacity-90"
								onLoad={() => setImgLoading(false)}
								onError={() => { setImgFailed(true); setImgLoading(false); }} />
							<div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
						</>
					) : (
						<div className="absolute inset-0 flex items-center justify-center p-8">
							<div className="max-w-xl">
								<div className="text-6xl font-black tracking-tight leading-[0.9]">
									<span className="text-white">FUTURE</span>
									<br />
									<span style={{ color: ACCENT }}>HUMAN</span>
								</div>
								<p className="mt-4 text-gray-300">AI HUMANS BUILDER</p>
							</div>
						</div>
					)}
				</div>

				{/* Right form panel */}
				<div className="relative flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-black">
					{/* Minimal top brand for small screens */}
					<div className="absolute top-6 left-6 lg:hidden">
						<LogoMark src={LOGO_SRC} />
					</div>

					<div className="w-full max-w-[520px]">
						{/* Icon circle above the title */}
						<div className="mb-8">
							<div
								className="w-16 h-16 rounded-full grid place-items-center"
								style={{ backgroundColor: ACCENT }}
							>
								{/* If you have a logo svg, you can replace this letter */}
								<LogoMark type="logo" src={LOGO_SRC} />
							</div>
						</div>

						{isLogin ? (
							<LoginForm onSwitch={() => setMode("register")} onSubmit={loginHandler} error={loginError} />
						) : (
							<RegisterForm onSwitch={() => setMode("login")} onSubmit={registerHandler} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}