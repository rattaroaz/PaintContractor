import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/", { replace: true });
    window.location.reload();
  }, [navigate]);

  return null;
}
