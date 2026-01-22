import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function RequireRole({ allow = [] }) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const role = profile?.role;
  if (!role) return <Navigate to="/auth/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
