import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AuthPage from "../pages/Auth";

const TOKEN_KEY = "accessToken";

export default function AuthWrapper() {
  const navigate = useNavigate();

  const handlers = useMemo(
    () => ({
      onSignIn: async () => {
        localStorage.setItem(TOKEN_KEY, "demo-token");
        navigate("/dashboard");
      },
      onSignUp: async () => {
        localStorage.setItem(TOKEN_KEY, "demo-token");
        navigate("/dashboard");
      },
      onGithubAuth: async () => {
        localStorage.setItem(TOKEN_KEY, "demo-token");
        navigate("/dashboard");
      },
    }),
    [navigate]
  );

  return <AuthPage {...handlers} />;
}
