import { useEffect } from "react";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { login } = useAuth();

  useEffect(() => {
    login();
  }, [login]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  );
}
