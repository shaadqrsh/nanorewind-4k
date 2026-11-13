import React, { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: number; // timestamp
  className?: string;
}

// "4 h 12 min" until the target. Updates every 15 seconds, which is enough for
// a minute-level display.
export const formatTimeLeft = (targetDate: number, now = Date.now()) => {
  const ms = targetDate - now;
  if (ms <= 0) return 'a moment';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return totalMin <= 1 ? 'under a minute' : `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export const Countdown: React.FC<CountdownProps> = ({ targetDate, className = '' }) => {
  const [label, setLabel] = useState(() => formatTimeLeft(targetDate));

  useEffect(() => {
    setLabel(formatTimeLeft(targetDate));
    const timer = setInterval(() => setLabel(formatTimeLeft(targetDate)), 15000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className={`tabular-nums ${className}`}>{label}</span>;
};
