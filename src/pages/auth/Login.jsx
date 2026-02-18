import { Navigate, useSearchParams } from "react-router-dom";

export default function Login() {
  const [searchParams] = useSearchParams();
  const params = searchParams.toString();
  const target = params ? `/v2/auth/login?${params}` : "/v2/auth/login";
  return <Navigate to={target} replace />;
}
