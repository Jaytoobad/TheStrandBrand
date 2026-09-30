import { useState } from 'react';

// Password field with a Show/Hide toggle. Accepts the same props as <input>.
export default function PasswordInput({ id, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <input id={id} {...inputProps} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-controls={id}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
