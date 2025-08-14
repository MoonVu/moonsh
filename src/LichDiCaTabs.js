import React, { useEffect, useState } from "react";
import { Tabs, Spin, message, Input, Button, Popconfirm } from "antd";
import apiService from "./services/api";
import DemoNhanSu from "./DemoNhanSu";
import EditOutlined from '@ant-design/icons/EditOutlined';
import DemoLichDiCa from "./DemoLichDiCa";
import { DeleteOutlined } from '@ant-design/icons';

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

  // Expose refresh function để DemoLichDiCa có thể gọi
  useEffect(() => {
    window.refreshTabs = () => {
      console.log("🔄 Triggering tabs refresh from window.refreshTabs");
      fetchTabs();
    };
    
    return () => {
      delete window.refreshTabs;
    };
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

  const handleDeleteCopy = async (tabId, copyId) => {
    try {
      // Xóa bản sao khỏi backend
      const deleteCopyResponse = await apiService.deleteScheduleCopy(copyId);
      if (!deleteCopyResponse || !deleteCopyResponse.success) {
        alert(`❌ Lỗi khi xóa bản sao: ${deleteCopyResponse?.error || "Không xác định"}`);
        return;
      }

      // Xóa tab khỏi backend
      const deleteTabResponse = await apiService.deleteScheduleTab(tabId);
      if (!deleteTabResponse || !deleteTabResponse.success) {
        alert(`❌ Lỗi khi xóa tab: ${deleteTabResponse?.error || "Không xác định"}`);
        return;
      }

      alert("✅ Đã xóa bản sao thành công!");
      
      // Refresh lại danh sách tab
      fetchTabs();
    } catch (err) {
      console.error("❌ Lỗi khi xóa bản sao:", err);
      alert("❌ Lỗi khi xóa bản sao: " + err.message);
    }
  };

  if (loading || creatingDemo) return <Spin style={{ margin: 40 }} />;

  // Tất cả tab đều hiển thị cho mọi user
  const visibleTabs = tabs;

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
                  <EditOutlined
                    style={{ fontSize: 15, color: '#888', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTabId(tabId);
                      setEditingTabName(tab.name);
                    }}
                  />
                </span>
              )
          }
        };
      }}
    </DefaultTabBar>
  );

  return (
    <div className="lich-di-ca-tabs">
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={visibleTabs.map(tab => ({
          key: tab._id,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>{tab.name}</span>
              {tab.data?.copyId && (
                <Popconfirm
                  title="Xóa bản sao"
                  description="Bạn có chắc chắn muốn xóa bản sao này không? Hành động này không thể hoàn tác."
                  onConfirm={() => handleDeleteCopy(tab._id, tab.data.copyId)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okType="danger"
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    style={{ marginLeft: 8 }}
                    title="Xóa bản sao"
                  />
                </Popconfirm>
              )}
            </div>
          ),
          children: tab.type === "demo_nhansu" ? (
            <DemoNhanSu tabId={tab._id} />
          ) : tab.data?.copyId ? (
            <DemoLichDiCa 
              tabId={tab._id} 
              isCopyTab={true}
              copyData={tab.data}
            />
          ) : (
            <DemoLichDiCa tabId={tab._id} />
          )
        }))}
        renderTabBar={renderTabBar}
        style={{ marginTop: 20 }}
      />
    </div>
  );
} 