import { useRef, useState } from 'react';

export default function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const notify = (message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), type === 'error' ? 5000 : 3200);
  };
  return { toast, notify };
}
