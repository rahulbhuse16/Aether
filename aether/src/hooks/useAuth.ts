import { useMemo } from "react";

const TOKEN_KEY = "accessToken";

const useAuth = () => {
  const isAuthenticated = useMemo(() => {
    return !!localStorage.getItem(TOKEN_KEY);
  }, []);

  return {
    isAuthenticated,
  };
};

export default useAuth;