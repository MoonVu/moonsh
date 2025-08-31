import React, { useEffect, useState } from "react";
import { Spin, message, Button, Popconfirm } from "antd";
import apiService from "./services/api";
import DemoNhanSu from "./DemoNhanSu";
import { DemoLichDiCa } from "./components";
import DemoLichCopy from "./components/Lichdica/DemoLichCopy";
import { DeleteOutlined } from '@ant-design/icons';
import { useAuth } from "./hooks/useAuth";
import CustomTabs from "./components/CustomTabs";

export default function LichDiCaTabs({ currentUser }) {
  const { isAdmin } = useAuth();
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState();
  const [creatingDemo, setCreatingDemo] = useState(false);

  useEffect(() => {
    fetchTabs();
    // eslint-disable-next-line
  }, []);

  // Expose refresh function và event listener để xử lý chuyển tab
  useEffect(() => {
    window.refreshTabs = () => {
      console.log("🔄 Triggering tabs refresh from window.refreshTabs");
      fetchTabs();
    };

    // Event listener để xử lý chuyển tab sau khi xóa bản sao
    const handleSwitchTab = (event) => {
      const { tabType } = event.detail;
      console.log("🔄 Received switchTab event:", tabType);
      
      if (tabType === 'demo') {
        // Chuyển về tab demo gốc
        const demoTab = tabs.find(tab => tab.type === 'demo');
        if (demoTab) {
          setActiveKey(demoTab._id);
          console.log("✅ Switched to demo tab:", demoTab._id);
        }
      }
    };

    window.addEventListener('switchTab', handleSwitchTab);
    
    return () => {
      delete window.refreshTabs;
      window.removeEventListener('switchTab', handleSwitchTab);
    };
  }, [tabs]);

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
      return;
    }
    try {
      // 1) Cập nhật tên tab
      await apiService.request(`/schedule-tabs/${tabId}`, {
        method: "PUT",
        body: JSON.stringify({ name: value })
      });
      // 2) Nếu là tab copy, cập nhật luôn tên bản sao trong schedulecopies
      const targetTab = tabs.find(t => t._id === tabId);
      if (targetTab?.data?.copyId) {
        try {
          await apiService.updateScheduleCopy(targetTab.data.copyId, { name: value });
        } catch (e) {
          console.warn("⚠️ Không thể cập nhật tên schedule copy:", e);
        }
      }
      // 3) Cập nhật UI state
      setTabs(prev => prev.map(t => t._id === tabId ? { ...t, name: value, data: { ...t.data, name: value } } : t));
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
      
      // Xóa tab khỏi danh sách local ngay lập tức
      setTabs(prev => prev.filter(tab => tab._id !== tabId));
      
      // Chuyển về tab demo gốc nếu tab bị xóa là tab đang active
      if (activeKey === tabId) {
        const demoTab = tabs.find(tab => tab.type === 'demo');
        if (demoTab) {
          setActiveKey(demoTab._id);
        }
      }
      
      // Refresh lại danh sách tab từ backend
      fetchTabs();
    } catch (err) {
      console.error("❌ Lỗi khi xóa bản sao:", err);
      alert("❌ Lỗi khi xóa bản sao: " + err.message);
    }
  };

  if (loading || creatingDemo) return <Spin style={{ margin: 40 }} />;

  // ADMIN thấy tất cả tab, nhân viên chỉ thấy tab copy (không thấy demo gốc và demo_nhansu)
  const visibleTabs = isAdmin() ? tabs : tabs.filter(tab => 
    tab.type !== "demo_nhansu" && // Ẩn tab demo nhân sự khỏi nhân viên
    tab.type !== "demo" && // Ẩn tab demo gốc khỏi nhân viên
    tab.data?.copyId // Chỉ hiển thị tab copy cho nhân viên
  );

  // Chuyển đổi dữ liệu tabs để phù hợp với CustomTabs
  const customTabsData = visibleTabs.map(tab => ({
    id: tab._id,
    name: tab.name,
    content: (
      <div>
        {tab.type === "demo_nhansu" ? (
          <DemoNhanSu tabId={tab._id} />
        ) : tab.data?.copyId ? (
          <DemoLichCopy 
            tabId={tab._id} 
            copyData={tab.data}
          />
        ) : (
          <DemoLichDiCa tabId={tab._id} />
        )}
        
        {/* Hiển thị nút xóa bản sao ở dưới content nếu cần */}
        {tab.data?.copyId && isAdmin() && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Popconfirm
              title="Xóa bản sao"
              description="Bạn có chắc chắn muốn xóa bản sao này không? Hành động này không thể hoàn tác."
              onConfirm={() => handleDeleteCopy(tab._id, tab.data.copyId)}
              okText="Xóa"
              cancelText="Hủy"
              okType="danger"
            >
              
            </Popconfirm>
          </div>
        )}
      </div>
    )
  }));

  return (
    <div className="lich-di-ca-tabs" style={{ marginTop: 20 }}>
      <CustomTabs
        tabs={customTabsData}
        activeTab={activeKey}
        onTabChange={setActiveKey}
        onEditTab={isAdmin() ? handleSaveTabName : undefined}
        showEditIcon={isAdmin()}
      />
    </div>
  );
} 