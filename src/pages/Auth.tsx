import AuthForm from "@/components/AuthForm";

interface AuthProps {
  userType: 'admin' | 'citizen' | 'worker';
  onSuccess: () => void;
}

const Auth = ({ userType, onSuccess }: AuthProps) => {
  return <AuthForm userType={userType} onSuccess={onSuccess} />;
};

export default Auth;