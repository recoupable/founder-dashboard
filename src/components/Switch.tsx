/**
 * Switch component: a custom toggle switch for boolean state.
 * @param checked - Whether the switch is on
 * @param onChange - Callback for toggling
 * @param className - Optional CSS classes
 * @param children - Optional children (e.g., knob)
 */
import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, className, children }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={className}
      onClick={() => onChange(!checked)}
    >
      {children}
    </button>
  );
};

export default Switch; 