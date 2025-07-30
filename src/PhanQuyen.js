import React, { useState, useEffect } from "react";
import "./PhanQuyen.css";

const LOCAL_KEY = "phanquyen_config";

// Hàm kiểm tra quyền quản lý toàn hệ thống
const isFullManager = (groupValue) => {
  return ['CQ', 'PCQ', 'TT'].includes(groupValue);
};

const MENU_ITEMS = [];
const GROUPS = [];

export default function PhanQuyen() {
  const [selectedGroup, setSelectedGroup] = useState("CQ");
  const [config, setConfig] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) setConfig(JSON.parse(saved));
    else {
      // Các tài khoản quản lý nhìn thấy toàn bộ, các nhóm khác chỉ thấy mục của mình
      const all = {};
      // Tất cả các nhóm quản lý đều có toàn quyền
      ['CQ', 'PCQ', 'TT'].forEach(group => {
        all[group] = MENU_ITEMS.flatMap(mg => mg.items);
      });
      all["XNK"] = MENU_ITEMS.filter(mg => mg.group === "QUẢN TRỊ" || mg.group === "XNK").flatMap(mg => mg.items);
      all["CSKH"] = MENU_ITEMS.filter(mg => mg.group === "QUẢN TRỊ" || mg.group === "CSKH").flatMap(mg => mg.items);
      setConfig(all);
    }
  }, []);

  const handleToggle = (item) => {
    setConfig(prev => {
      const groupItems = prev[selectedGroup] || [];
      const exists = groupItems.includes(item);
      const newItems = exists ? groupItems.filter(i => i !== item) : [...groupItems, item];
      const newConfig = { ...prev, [selectedGroup]: newItems };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newConfig));
      return newConfig;
    });
  };

  return (
    <div className="phanquyen-root">
      <h2>Phân quyền menu cho nhóm quyền</h2>
      <div className="phanquyen-group-select">
        {GROUPS.map(g => (
          <button
            key={g}
            className={`phanquyen-group-btn${selectedGroup === g ? " active" : ""}`}
            onClick={() => setSelectedGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="phanquyen-menu-list">
        {MENU_ITEMS.map(mg => (
          <div key={mg.group} className="phanquyen-menu-group">
            <div className="phanquyen-menu-group-title">{mg.group}</div>
            {mg.items.map(item => (
              <label key={item} className="phanquyen-menu-item">
                <input
                  type="checkbox"
                  checked={config[selectedGroup]?.includes(item) || false}
                  onChange={() => handleToggle(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 