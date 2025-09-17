import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props { children: React.ReactNode }

export const InternalRoute: React.FC<Props> = ({ children }) => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (loading) return;
    if (!profile?.is_internal) {
      navigate("/app", { replace: true, state: { from: location.pathname } });
    }
  }, [loading, profile, navigate, location.pathname]);

  if (loading) return null;
  if (!profile?.is_internal) return null;

  return <>{children}</>;
};