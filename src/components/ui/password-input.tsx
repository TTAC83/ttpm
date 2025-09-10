import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePasswordValidation, type PasswordValidation } from '@/hooks/usePasswordValidation';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValidation?: boolean;
  validation?: PasswordValidation;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, showValidation = false, validation, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const internalValidation = usePasswordValidation(props.value as string || '');
    const activeValidation = validation || internalValidation;

    const ValidationIndicator = ({ isValid, text }: { isValid: boolean; text: string }) => (
      <div className="flex items-center gap-2">
        {isValid ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <X className="h-3 w-3 text-red-500" />
        )}
        <span className={isValid ? "text-green-600" : "text-red-500"}>
          {text}
        </span>
      </div>
    );

    return (
      <div className="space-y-2">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        
        {/* Password Requirements */}
        {showValidation && props.value && (
          <div className="text-sm space-y-1 mt-2">
            <ValidationIndicator 
              isValid={activeValidation.length} 
              text="At least 6 characters" 
            />
            <ValidationIndicator 
              isValid={activeValidation.hasLetter} 
              text="Contains at least one letter" 
            />
            <ValidationIndicator 
              isValid={activeValidation.hasNumber} 
              text="Contains at least one number" 
            />
            <ValidationIndicator 
              isValid={activeValidation.noSpaces} 
              text="No spaces allowed" 
            />
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

interface PasswordConfirmInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  passwordMatches?: boolean;
  showMatchValidation?: boolean;
}

export const PasswordConfirmInput = React.forwardRef<HTMLInputElement, PasswordConfirmInputProps>(
  ({ label, passwordMatches, showMatchValidation = true, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="space-y-2">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        
        {/* Password Match Indicator */}
        {showMatchValidation && props.value && (
          <div className="flex items-center gap-2 text-sm">
            {passwordMatches ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <X className="h-3 w-3 text-red-500" />
            )}
            <span className={passwordMatches ? "text-green-600" : "text-red-500"}>
              {passwordMatches ? "Passwords match" : "Passwords don't match"}
            </span>
          </div>
        )}
      </div>
    );
  }
);

PasswordConfirmInput.displayName = "PasswordConfirmInput";