import React, { ChangeEvent, FocusEvent } from 'react';

// CSS
import styles from '@/styles/inputField.module.css';

interface InputFieldProps {
  type?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  showFunctionButton?: string;
  style?: React.CSSProperties;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = React.memo(
  ({ type, name, value, placeholder, style, onChange, onBlur }) => {
    // const [showPassword, setShowPassword] = useState(false);
    return (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={styles['input']}
        style={{ ...style }}
      />
    );
  },
);

InputField.displayName = 'InputField';

export default InputField;
