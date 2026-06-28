import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./components/Auth/LoginPage";
import { RegisterPage } from "./components/Auth/RegisterPage";
import { MainLayout } from "./components/Layout/MainLayout";
import { useThemeStore } from "./store/themeStore";

export default function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  useThemeStore(); // initialize theme

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === "login" ? (
      <LoginPage onSwitch={() => setAuthView("register")} />
    ) : (
      <RegisterPage onSwitch={() => setAuthView("login")} />
    );
  }

  return <MainLayout />;
}
