export interface User {
  id: number;
  username: string;
  avatar: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "destructive";
}

export interface LoginFormData {
  email: string;
  password: string;
}

export type SocialProvider = "google" | "discord" | "apple";
