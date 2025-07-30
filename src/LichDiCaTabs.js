import React, { useEffect, useState } from "react";
import { Tabs, Spin, message, Input } from "antd";
import apiService from "./services/api";
import DemoNhanSu from "./DemoNhanSu";
import EditOutlined from '@ant-design/icons/EditOutlined';
import DemoLichDiCa from "./DemoLichDiCa";

// Hàm kiểm tra quyền quản lý toàn hệ thống
const isFullManager = (groupValue) => {
  return ['CQ', 'PCQ', 'TT'].includes(groupValue);
};

export default function LichDiCaTabs({ currentUser }) {
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState();
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabName, setEditingTabName] = useState("");

  useEffect(() => {
    fetchTabs();
    // eslint-disable-next-line
  }, []);

  const fetchTabs = async () => {
    setLoading(true);
    try {
      const res = await apiService.request("/schedule-tabs");
      setTabs(res);
      // Giữ active tab nếu còn tồn tại, nếu không thì chọn tab đầu tiên
      const stillExist = res.find(tab => tab._id === activeKey);
      if (!stillExist && res.length > 0) {
        setActiveKey(res[0]._id);
      }
    } catch (err) {
      message.error("Không lấy được danh sách tab lịch đi ca!");
    }
    setLoading(false);
  };

  // Cập nhật tên tab, chỉ gọi API khi thực sự đổi tên và không rỗng
  const handleSaveTabName = async (tabId, value) => {
    if (!value || value.trim() === "") return; // Không cho tên trống
    if (value === tabs.find(t => t._id === tabId)?.name) {
      setEditingTabId(null);
      setEditingTabName("");
      return;
    }
    try {
      await apiService.request(`/schedule-tabs/${tabId}`, {
        method: "PUT",
        body: JSON.stringify({ name: value })
      });
      setTabs(prev => prev.map(t => t._id === tabId ? { ...t, name: value } : t));
      setEditingTabId(null);
      setEditingTabName("");
      message.success("Đã cập nhật tên tab!");
    } catch (err) {
      message.error("Không cập nhật được tên tab!");
    }
  };

  if (loading || creatingDemo) return <Spin style={{ margin: 40 }} />;

  // Chỉ các tài khoản quản lý mới thấy tab DEMO
  const visibleTabs = tabs.filter(tab => {
    if (tab.type === "demo" || tab.type === "demo_nhansu") {
      return isFullManager(currentUser?.group_name);
    }
    return true;
  });

  const renderTabBar = (props, DefaultTabBar) => (
    <DefaultTabBar {...props}>
      {(node) => {
        const tabId = node.key;
        const tab = tabs.find(t => t._id === tabId);
        if (!tab) return node;
        return {
          ...node,
          props: {
            ...node.props,
            children:
              editingTabId === tabId ? (
                <Input
                  value={editingTabName}
                  size="small"
                  style={{ width: 140 }}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => handleSaveTabName(tabId, editingTabName)}
                  onPressEnter={() => handleSaveTabName(tabId, editingTabName)}
                />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1 }}>{tab.name}</span>
                  {isFullManager(currentUser?.group_name) && (
                    <EditOutlined
                      style={{ fontSize: 15, color: '#888', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTabId(tabId);
                        setEditingTabName(tab.name);
                      }}
                    />
                  )}
                </span>
              )
          }
        };
      }}
    </DefaultTabBar>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 24, minHeight: 400 }}>
      <Tabs
        type="card"
        activeKey={activeKey}
        onChange={setActiveKey}
        renderTabBar={renderTabBar}
        items={visibleTabs.map(tab => ({
          key: tab._id,
          label: (
            editingTabId === tab._id ? (
              <Input
                value={editingTabName}
                size="small"
                style={{ width: 140 }}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={() => handleSaveTabName(tab._id, editingTabName)}
                onPressEnter={() => handleSaveTabName(tab._id, editingTabName)}
              />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flex: 1 }}>{tab.name}</span>
                {isFullManager(currentUser?.group_name) && (
                  <EditOutlined
                    style={{ fontSize: 15, color: '#888', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTabId(tab._id);
                      setEditingTabName(tab.name);
                    }}
                  />
                )}
              </span>
            )
          ),
          children: (
            tab.type === "demo_nhansu" ? (
              <DemoNhanSu currentUser={currentUser} tabId={tab._id} />
            ) : tab.type === "demo" ? (
              <DemoLichDiCa currentUser={currentUser} tabId={tab._id} />
            ) : (
              <div>Đây là nội dung tab <b>{tab.name}</b> (sẽ bổ sung bảng lịch sau)</div>
            )
          )
        }))}
      />
    </div>
  );
} 