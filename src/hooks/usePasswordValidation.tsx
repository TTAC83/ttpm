import { useMemo } from 'react';

export interface PasswordValidation {
  length: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  noSpaces: boolean;
  isValid: boolean;
}

export interface PasswordMatchValidation extends PasswordValidation {
  matches: boolean;
  confirmPasswordValid: boolean;
}

export const usePasswordValidation = (password: string): PasswordValidation => {
  return useMemo(() => {
    const checks = {
      length: password.length >= 6,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
      noSpaces: !password.includes(' ') && password.trim() === password,
    };

    return {
      ...checks,
      isValid: Object.values(checks).every(Boolean),
    };
  }, [password]);
};

export const usePasswordMatchValidation = (
  password: string,
  confirmPassword: string
): PasswordMatchValidation => {
  const passwordValidation = usePasswordValidation(password);
  
  return useMemo(() => {
    const matches = password === confirmPassword && password.length > 0 && confirmPassword.length > 0;
    const confirmPasswordValid = matches && passwordValidation.isValid;

    return {
      ...passwordValidation,
      matches,
      confirmPasswordValid,
    };
  }, [password, confirmPassword, passwordValidation]);
};

export const validatePasswordOnSubmit = (
  password: string,
  confirmPassword?: string
): { isValid: boolean; errorMessage?: string } => {
  if (password.length < 6) {
    return {
      isValid: false,
      errorMessage: "Password must be at least 6 characters long",
    };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      errorMessage: "Password must contain at least one letter",
    };
  }

  if (!/\d/.test(password)) {
    return {
      isValid: false,
      errorMessage: "Password must contain at least one number",
    };
  }

  if (password.includes(' ') || password.trim() !== password) {
    return {
      isValid: false,
      errorMessage: "Password cannot contain spaces",
    };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return {
      isValid: false,
      errorMessage: "Please make sure both passwords match",
    };
  }

  return { isValid: true };
};