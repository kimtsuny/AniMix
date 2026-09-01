// Components
export { UserMenu, UserAvatar, UserDropdown } from "./components";
export { LoginButton } from "./components";
export { RegisterButton } from "./components";
export { AuthLayout, AuthHero, AuthBackground, AuthLogo } from "./components";
export { FeatureCards, SocialLoginButtons, LoginForm, LoginCard } from "./components";
export { ForgotPassword } from "./components";

// Hooks
export { useAuth } from "./hooks/useAuth";
export { useUserMenu } from "./hooks/useUserMenu";

// Types
export type { User, AuthState, MenuItem, LoginFormData, SocialProvider } from "./types/auth";

// API
export { login } from "./api/login";
export { register } from "./api/register";
export { logout } from "./api/logout";
export { me } from "./api/me";
export { socialLogin } from "./api/social-login";

// Providers
export { AuthProvider, useAuthContext } from "./AuthProvider";
