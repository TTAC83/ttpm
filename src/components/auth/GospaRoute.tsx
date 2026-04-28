import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const GOSPA_ALLOWED_EMAILS = [
  "allan@thingtrax.com",
  "leanne@thingtrax.com",
  "paul@thingtrax.com",
  "agupta@thingtrax.com",
  "ishafqat@thingtrax.com",
];

export function isGospaAllowed(email?: string | null): boolean {
  if (!email) return false;
  return GOSPA_ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

interface Props { children: React.ReactNode }

export const GospaRoute: React.FC<Props> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const allowed = !!profile?.is_internal && isGospaAllowed(user?.email);

  React.useEffect(() => {
    if (loading) return;
    if (!allowed) {
      navigate("/app", { replace: true, state: { from: location.pathname } });
    }
  }, [loading, allowed, navigate, location.pathname]);

  if (loading) return null;
  if (!allowed) return null;

  return <>{children}</>;
};
