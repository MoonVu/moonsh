import React, { useEffect, useState } from "react";
import "./ClockGMT7.css";

export default function ClockGMT7({ inline }) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Chuyển sang GMT+7
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const gmt7 = new Date(utc + 7 * 3600000);
      const h = gmt7.getHours().toString().padStart(2, '0');
      const m = gmt7.getMinutes().toString().padStart(2, '0');
      const s = gmt7.getSeconds().toString().padStart(2, '0');
      setClock(`${h}:${m}:${s}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  if (inline) {
    return (
      <span className="clock-gmt7-inline">{clock} <span className="clock-gmt7-tz">(GMT+7)</span></span>
    );
  }

  return (
    <div className="clock-gmt7-fixed">
      {clock} <span className="clock-gmt7-tz">(GMT+7)</span>
    </div>
  );
} 