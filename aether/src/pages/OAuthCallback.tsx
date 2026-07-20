import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const userId = params.get("userId");
    const error = params.get("error");

    const source=params.get("source")

    if(source==='onboarding'){
       navigate(`/onboarding?success=true`)
       return;
    }


    if (error || !token || !userId) {
      navigate(`/auth${error ? `?error=${error}` : ""}`);
      return;
    }

    localStorage.setItem("userId", userId);
    localStorage.setItem("token", token);

    navigate("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0B0D] text-[#F4F3EF]">
      Signing you in…
    </div>
  );
}