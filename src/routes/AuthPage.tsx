import { SignIn } from "@clerk/clerk-react";

export const AuthPage = () => {
  return (
    <div className="auth-page-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      width: '100%'
    }}>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-in" />
    </div>
  );
};
