import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./components/Auth/LoginPage";
import { RegisterPage } from "./components/Auth/RegisterPage";
import { MainLayout } from "./components/Layout/MainLayout";

export default function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [authView, setAuthView] = useState<"login" | "register">("login");

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📋</div>
          <p className="text-gray-500">Loading...</p>
        </div>
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
