import { SignUp } from "@clerk/clerk-react";

export const SignUpPage = () => {
  return (
    <div className="auth-page-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      width: '100%'
    }}>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
    </div>
  );
};
