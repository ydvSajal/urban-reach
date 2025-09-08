import AuthForm from "@/components/AuthForm";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate("/dashboard");
  };

  return <AuthForm onSuccess={handleAuthSuccess} />;
};

export default Auth;