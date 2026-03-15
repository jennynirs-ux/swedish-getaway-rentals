import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, getUserProfile, isApprovedHost } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireHost?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAuth = true, requireHost = false, requireAdmin = false }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        setAuthenticated(true);

        if (requireHost) {
          const hostApproved = await isApprovedHost(user.id);
          setAuthorized(hostApproved);
        } else if (requireAdmin) {
          const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
          setAuthorized(!!data);
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        setAuthenticated(false);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [requireHost, requireAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (requireAuth && !authenticated) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if ((requireHost || requireAdmin) && !authorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
