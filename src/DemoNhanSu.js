import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Input, Button } from "antd";
import apiService from "./services/api";
import { DragDropContext } from "@hello-pangea/dnd";
import debounce from 'lodash.debounce';
import { useSchedule } from './contexts/ScheduleContext';
import GroupPhanCa from './GroupPhanCa';
import MonthDataCard from './MonthDataCard';

const GROUPS = [
  { label: "CSKH", value: "CSKH", subs: ["CSKH", "CSOL", "CSDL", "Truyền thông"], color: "#12B3D6" },
  { label: "FK", value: "FK", subs: ["FK", "FK-X"], color: "#f59e42" },
  { label: "XNK", value: "XNK", subs: ["XNK"], color: "#43A047" },
  { label: "Tổ trưởng", value: "TOTRUONG", subs: ["TT"], color: "#8B5CF6" }
];

const DEFAULT_BLOCKS = [
  { label: "Ca sáng", time: "7H20 ~ 18H20" },
  { label: "Ca chiều", time: "17H00 ~ 04H00" },
  { label: "Ca đêm", time: "21H00 ~ 8H00" }
];

export default function DemoNhanSu({ currentUser, tabId }) {
  console.log("🔄 DemoNhanSu component re-render");
  const { triggerRefresh } = useSchedule();
  const [users, setUsers] = useState([]);
  // Dữ liệu phân ca: { group: [{ label, time, users: [{ userId, note }] }] }
  const [phanCa, setPhanCa] = useState({});
  // Hàng chờ: { group: [userId, ...] }
  const [waiting, setWaiting] = useState({});

  // State cho tháng/năm hiện tại
  const [currentMonth, setCurrentMonth] = useState(7);
  const [currentYear, setCurrentYear] = useState(2025);
  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  
  // State cho popup thêm nhân sự
  const [showAddUserPopup, setShowAddUserPopup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  // Click outside để đóng popup
  useEffect(() => {
    function handleClickOutside(e) {
      if (showAddUserPopup && !e.target.closest('.add-user-popup')) {
        setShowAddUserPopup(false);
        setSelectedGroup(null);
        setAvailableUsers([]);
      }
    }
    
    if (showAddUserPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddUserPopup]);

  // Fix 1 (Most stable recommendation): Do not put `triggerRefresh` into the dependency list, instead call it via `ref`
  const triggerRef = useRef(triggerRefresh);
  
  useEffect(() => {
    triggerRef.current = triggerRefresh;
  }, [triggerRefresh]);

  // Sử dụng useRef để lưu trữ debounced functions
  const debouncedUpdateShiftsRef = useRef();
  const debouncedUpdateWaitingRef = useRef();
  
  // Batch update để tối ưu cho nhiều người
  const batchUpdateRef = useRef(new Map());
  const batchTimeoutRef = useRef(null);

  // Cleanup debounce functions
  useEffect(() => {
    return () => {
      if (debouncedUpdateShiftsRef.current) {
        debouncedUpdateShiftsRef.current.cancel();
      }
      if (debouncedUpdateWaitingRef.current) {
        debouncedUpdateWaitingRef.current.cancel();
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);



  // Tối ưu: Sử dụng useCallback cho handleMonthChange
  const handleMonthChange = useCallback((month, year) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  }, []);

  useEffect(() => {
    if (!initialized) {
      fetchUsers().then(() => setInitialized(true));
    }
  }, []);

  useEffect(() => {
    if (initialized && users.length > 0) {
      fetchSchedules();
    }
  }, [initialized, currentMonth, currentYear]);



  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiService.getUsers();
      setUsers(res);
      
      // Chỉ khởi tạo waiting/phanCa nếu chưa có dữ liệu schedule
      if (Object.keys(phanCa).length === 0) {
        const wait = {};
        const caInit = {};
        GROUPS.forEach(g => {
          wait[g.value] = res.filter(u => u.group_name && g.subs && g.subs.includes(u.group_name)).map(u => String(u._id));
          caInit[g.value] = DEFAULT_BLOCKS.map(b => ({ ...b, users: [] }));
        });
        setWaiting(wait);
        setPhanCa(caInit);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hàm tạo schedule mặc định cho group theo tháng
  const createDefaultSchedule = async (group) => {
    const defaultShifts = DEFAULT_BLOCKS.map(b => ({ ...b, users: [] }));
    const groupConfig = GROUPS.find(g => g.value === group);
    const defaultWaiting = users.filter(u => u.group_name && groupConfig && groupConfig.subs && groupConfig.subs.includes(u.group_name)).map(u => String(u._id));
    await apiService.saveScheduleByMonth(group, currentMonth, currentYear, defaultShifts, defaultWaiting);
  };

  // Lấy dữ liệu schedule từ API theo tháng
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSchedulesByMonth(currentMonth, currentYear);
      if (response.success && response.data) {
        const schedules = response.data;
        const scheduleData = {};
        const waitingData = {};
        for (const g of GROUPS) {
          let schedule = schedules.find(s => s.group === g.value);
          if (!schedule) {
            // Nếu chưa có schedule, tự động tạo
            await createDefaultSchedule(g.value);
            // Sau khi tạo, fetch lại schedule cho group này
            const res = await apiService.getScheduleByGroupAndMonth(g.value, currentMonth, currentYear);
            schedule = res.data;
          }
          
          // CHUẨN HÓA waiting: LUÔN LÀ STRING ID
          waitingData[g.value] = (schedule.waiting || []).map(item => {
            if (typeof item === 'object' && item._id) {
              return String(item._id);
            }
            return String(item);
          }).filter(id => id && id !== 'null' && id !== 'undefined');
          
          // CHUẨN HÓA shifts: userId LUÔN LÀ STRING
          scheduleData[g.value] = (schedule.shifts || []).map(ca => ({
            ...ca,
            users: (ca.users || []).map(u => {
              let userId;
              if (typeof u.userId === 'object' && u.userId._id) {
                userId = String(u.userId._id);
              } else if (u.userId) {
                userId = String(u.userId);
              } else {
                return null; // Bỏ qua user không hợp lệ
              }
              
              return {
              ...u,
                userId: userId,
              note: u.note || ""
              };
            }).filter(u => u && u.userId) // Lọc bỏ null users
          }));
        }
        setPhanCa(scheduleData);
        setWaiting(waitingData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sửa các thao tác cập nhật shifts/waiting để nếu lỗi 'Schedule không tồn tại' thì tự động tạo rồi thử lại
  const safeUpdateShifts = async (group, newShifts) => {
    try {
      const response = await apiService.updateShiftsByMonth(group, currentMonth, currentYear, newShifts);
      if (response.success) return response;
      if (response.error && (response.error.includes('Schedule không tồn tại') || response.error.includes('No matching document found'))) {
        await createDefaultSchedule(group);
        return await apiService.updateShiftsByMonth(group, currentMonth, currentYear, newShifts);
      }
      return response;
    } catch (err) {
      if (err.message && (err.message.includes('Schedule không tồn tại') || err.message.includes('No matching document found'))) {
        await createDefaultSchedule(group);
        return await apiService.updateShiftsByMonth(group, currentMonth, currentYear, newShifts);
      }
      throw err;
    }
  };
  const safeUpdateWaiting = async (group, newWaiting) => {
    try {
      const response = await apiService.updateWaitingByMonth(group, currentMonth, currentYear, newWaiting);
      if (response.success) return response;
      if (response.error && (response.error.includes('Schedule không tồn tại') || response.error.includes('No matching document found'))) {
        await createDefaultSchedule(group);
        return await apiService.updateWaitingByMonth(group, currentMonth, currentYear, newWaiting);
      }
      return response;
    } catch (err) {
      if (err.message && (err.message.includes('Schedule không tồn tại') || err.message.includes('No matching document found'))) {
        await createDefaultSchedule(group);
        return await apiService.updateWaitingByMonth(group, currentMonth, currentYear, newWaiting);
      }
      throw err;
    }
  };

  // Tối ưu: Sử dụng useCallback cho các hàm xử lý
  const handleAddBlock = useCallback(async (group) => {
    try {
      const newShifts = [
        ...phanCa[group],
        { label: "Ca mới", time: "", users: [] }
      ];
      
      if (debouncedUpdateShiftsRef.current) {
        await debouncedUpdateShiftsRef.current(group, newShifts);
      }
        setPhanCa(prev => ({
          ...prev,
          [group]: newShifts
        }));
    } catch (err) {
      setError(err.message);
    }
  }, [phanCa]);

  const handleEditLabel = useCallback(async (group, idx, value) => {
    try {
      const newShifts = [...phanCa[group]];
      newShifts[idx] = { ...newShifts[idx], label: value };
      
      if (debouncedUpdateShiftsRef.current) {
        await debouncedUpdateShiftsRef.current(group, newShifts);
      }
        setPhanCa(prev => ({
          ...prev,
          [group]: newShifts
        }));
    } catch (err) {
      setError(err.message);
    }
  }, [phanCa]);

  const handleEditTime = useCallback(async (group, idx, value) => {
    try {
      const newShifts = [...phanCa[group]];
      newShifts[idx] = { ...newShifts[idx], time: value };
      
      if (debouncedUpdateShiftsRef.current) {
        await debouncedUpdateShiftsRef.current(group, newShifts);
      }
        setPhanCa(prev => ({
          ...prev,
          [group]: newShifts
        }));
    } catch (err) {
      setError(err.message);
    }
  }, [phanCa]);

  const handleDeleteBlock = useCallback(async (group, idx) => {
    try {
      const newShifts = [...phanCa[group]];
      newShifts.splice(idx, 1);
      
      if (debouncedUpdateShiftsRef.current) {
        await debouncedUpdateShiftsRef.current(group, newShifts);
      }
        setPhanCa(prev => ({
          ...prev,
          [group]: newShifts
        }));
    } catch (err) {
      setError(err.message);
    }
  }, [phanCa]);

  const handleNoteChange = useCallback(async (group, caIdx, userIdx, value) => {
    try {
      const newShifts = [...phanCa[group]];
      const usersArr = [...newShifts[caIdx].users];
      usersArr[userIdx] = { ...usersArr[userIdx], note: value };
      newShifts[caIdx] = { ...newShifts[caIdx], users: usersArr };
      
      if (debouncedUpdateShiftsRef.current) {
        await debouncedUpdateShiftsRef.current(group, newShifts);
      }
        setPhanCa(prev => ({
          ...prev,
          [group]: newShifts
        }));
    } catch (err) {
      setError(err.message);
    }
  }, [phanCa]);

  const handleRemoveFromCa = useCallback(async (group, caIdx, userId) => {
    try {
      const newShifts = [...phanCa[group]];
      newShifts[caIdx].users = newShifts[caIdx].users.filter(u => String(u.userId) !== String(userId));
      const newWaiting = Array.from(new Set([...(waiting[group] || []), String(userId)]));
      
      setPhanCa(prev => ({ ...prev, [group]: newShifts }));
      setWaiting(prev => ({ ...prev, [group]: newWaiting }));
      
      if (debouncedUpdateShiftsRef.current) {
        await debouncedUpdateShiftsRef.current(group, newShifts);
      }
      if (debouncedUpdateWaitingRef.current) {
        await debouncedUpdateWaitingRef.current(group, newWaiting);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [phanCa, waiting]);

  const handleRemoveFromWaiting = useCallback(async (group, userId) => {
    try {
      const newWaiting = waiting[group].filter(id => String(id) !== String(userId));
      if (debouncedUpdateWaitingRef.current) {
        await debouncedUpdateWaitingRef.current(group, newWaiting.map(x => String(x)));
      }
      setWaiting(prev => ({ ...prev, [group]: newWaiting.map(x => String(x)) }));
    } catch (err) {
      setError(err.message);
    }
  }, [waiting]);

  const handleAddToWaiting = useCallback(async (group, event) => {
    try {
      // Lưu vị trí nút để hiển thị popup gần đó
      if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Tính toán vị trí tối ưu để popup không bị tràn ra ngoài
        let x = rect.left;
        let y = rect.bottom + 8;
        
        // Nếu popup sẽ tràn ra bên phải, đặt bên trái nút
        if (x + 320 > windowWidth) {
          x = rect.right - 320;
        }
        
        // Nếu popup sẽ tràn ra dưới, đặt phía trên nút
        if (y + 400 > windowHeight) {
          y = rect.top - 400;
        }
        
        // Đảm bảo không âm
        x = Math.max(10, x);
        y = Math.max(10, y);
        
        setPopupPosition({ x, y });
      }

      // Tìm tất cả users thuộc group này chưa có trong waiting và chưa được phân ca
      const groupConfig = GROUPS.find(g => g.value === group);
      if (!groupConfig) {
        setError("Không tìm thấy cấu hình nhóm: " + group);
        return;
      }

      // Lấy danh sách users thuộc group này
      const groupUsers = users.filter(u => 
        u.group_name && groupConfig.subs && groupConfig.subs.includes(u.group_name)
      );

      // Lấy danh sách users đã có trong waiting
      const currentWaiting = waiting[group] || [];
      
      // Lấy danh sách users đã được phân ca
      const assignedUsers = new Set();
      if (phanCa[group]) {
        phanCa[group].forEach(ca => {
          if (ca.users) {
            ca.users.forEach(u => {
              if (u.userId) assignedUsers.add(String(u.userId));
            });
          }
        });
      }

      // Tìm users chưa được phân ca và chưa trong waiting
      const availableUsers = groupUsers.filter(u => {
        const userId = String(u._id);
        return !currentWaiting.includes(userId) && !assignedUsers.has(userId);
      });

      // Hiển thị popup để chọn user (kể cả khi không có user nào)
      setSelectedGroup(group);
      setAvailableUsers(availableUsers);
      setSelectedUsers(new Set()); // Reset selected users
      setShowAddUserPopup(true);
    } catch (err) {
      setError("Lỗi khi thêm nhân sự vào hàng chờ: " + err.message);
    }
  }, [users, waiting, phanCa]);

  const handleSelectUserForWaiting = useCallback(async (userId) => {
    try {
      const group = selectedGroup;
      const currentWaiting = waiting[group] || [];
      const newWaiting = [...currentWaiting, String(userId)];
      
      setWaiting(prev => ({ ...prev, [group]: newWaiting }));
      setShowAddUserPopup(false);
      setSelectedGroup(null);
      setAvailableUsers([]);
      setSelectedUsers(new Set());
      
      if (debouncedUpdateWaitingRef.current) {
        await debouncedUpdateWaitingRef.current(group, newWaiting);
      }
      
      const user = users.find(u => String(u._id) === String(userId));
      const groupConfig = GROUPS.find(g => g.value === group);
      console.log(`✅ Đã thêm ${user?.username} vào hàng chờ ${groupConfig?.label}`);
    } catch (err) {
      setError("Lỗi khi thêm nhân sự vào hàng chờ: " + err.message);
    }
  }, [selectedGroup, waiting, users]);

  const handleSelectAllUsers = useCallback(async () => {
    try {
      const group = selectedGroup;
      const currentWaiting = waiting[group] || [];
      const newWaiting = [...currentWaiting, ...availableUsers.map(u => String(u._id))];
      
      setWaiting(prev => ({ ...prev, [group]: newWaiting }));
      setShowAddUserPopup(false);
      setSelectedGroup(null);
      setAvailableUsers([]);
      setSelectedUsers(new Set());
      
      if (debouncedUpdateWaitingRef.current) {
        await debouncedUpdateWaitingRef.current(group, newWaiting);
      }
      
      const groupConfig = GROUPS.find(g => g.value === group);
      console.log(`✅ Đã thêm ${availableUsers.length} nhân sự vào hàng chờ ${groupConfig?.label}`);
    } catch (err) {
      setError("Lỗi khi thêm nhân sự vào hàng chờ: " + err.message);
    }
  }, [selectedGroup, waiting, availableUsers]);

  const handleToggleUserSelection = useCallback((userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const handleAddSelectedUsers = useCallback(async () => {
    try {
      if (selectedUsers.size === 0) {
        setError("Vui lòng chọn ít nhất một nhân sự");
        return;
      }

      const group = selectedGroup;
      const currentWaiting = waiting[group] || [];
      const newWaiting = [...currentWaiting, ...Array.from(selectedUsers)];
      
      setWaiting(prev => ({ ...prev, [group]: newWaiting }));
      setShowAddUserPopup(false);
      setSelectedGroup(null);
      setAvailableUsers([]);
      setSelectedUsers(new Set());
      
      if (debouncedUpdateWaitingRef.current) {
        await debouncedUpdateWaitingRef.current(group, newWaiting);
      }
      
      const groupConfig = GROUPS.find(g => g.value === group);
      console.log(`✅ Đã thêm ${selectedUsers.size} nhân sự vào hàng chờ ${groupConfig?.label}`);
    } catch (err) {
      setError("Lỗi khi thêm nhân sự vào hàng chờ: " + err.message);
    }
  }, [selectedGroup, waiting, selectedUsers]);



  // Khởi tạo debounced functions sau khi safeUpdateShifts và safeUpdateWaiting đã được khai báo
  useEffect(() => {
    // Khởi tạo debouncedUpdateShifts - Delay phù hợp cho 60-70 người
    debouncedUpdateShiftsRef.current = debounce(async (group, shifts) => {
      const response = await safeUpdateShifts(group, shifts);
      if (response?.success) {
        console.log("DemoNhanSu: triggerRefresh called from debouncedUpdateShifts");
        triggerRef.current();
      }
      return response;
    }, 1000); // Delay 1000ms phù hợp cho 60-70 người

    // Khởi tạo debouncedUpdateWaiting - Delay phù hợp cho 60-70 người
    debouncedUpdateWaitingRef.current = debounce(async (group, waiting) => {
      const response = await safeUpdateWaiting(group, waiting);
      if (response?.success) {
        triggerRef.current();
      }
      return response;
    }, 1000); // Delay 1000ms phù hợp cho 60-70 người
  }, [safeUpdateShifts, safeUpdateWaiting]);



  // Tối ưu: Sử dụng useCallback cho onDragEnd
  const onDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const draggableIdStr = draggableId.toString();
    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    try {
      // Kéo từ hàng chờ vào ca
      if (sourceId.startsWith("waiting-") && destId.startsWith("ca-")) {
        const group = destId.split("-")[1];
        const caIdx = Number(destId.split("-")[2]);

        const newShifts = [...phanCa[group]];
        newShifts[caIdx].users = [...newShifts[caIdx].users, { userId: draggableIdStr, note: "" }];
        const newWaiting = (waiting[group] || []).filter(id => String(id) !== draggableIdStr);

        setPhanCa(prev => ({ ...prev, [group]: newShifts }));
        setWaiting(prev => ({ ...prev, [group]: newWaiting }));

        if (debouncedUpdateShiftsRef.current) {
          await debouncedUpdateShiftsRef.current(group, newShifts);
        }
        if (debouncedUpdateWaitingRef.current) {
          await debouncedUpdateWaitingRef.current(group, newWaiting);
        }
      }
      // Kéo giữa các ca (cùng group)
      else if (sourceId.startsWith("ca-") && destId.startsWith("ca-")) {
        const [groupSrc, caIdxSrc] = [sourceId.split("-")[1], Number(sourceId.split("-")[2])];
        const [groupDst, caIdxDst] = [destId.split("-")[1], Number(destId.split("-")[2])];
        if (groupSrc !== groupDst) return;

        const newShifts = [...phanCa[groupSrc]];
        const user = newShifts[caIdxSrc].users.find(u => String(u.userId) === draggableIdStr);
        if (!user || !user.userId) return;
        newShifts[caIdxSrc].users = newShifts[caIdxSrc].users.filter(u => String(u.userId) !== draggableIdStr);
        newShifts[caIdxDst].users = [
          ...newShifts[caIdxDst].users.slice(0, destination.index),
          user,
          ...newShifts[caIdxDst].users.slice(destination.index)
        ];

        setPhanCa(prev => ({ ...prev, [groupSrc]: newShifts }));
        if (debouncedUpdateShiftsRef.current) {
          await debouncedUpdateShiftsRef.current(groupSrc, newShifts);
        }
      }
      // Kéo từ ca → hàng chờ (để xóa khỏi ca)
      else if (sourceId.startsWith("ca-") && destId.startsWith("waiting-")) {
        const group = destId.split("-")[1];
        const caIdx = Number(sourceId.split("-")[2]);
        const newShifts = [...phanCa[group]];
        newShifts[caIdx].users = newShifts[caIdx].users.filter(u => String(u.userId) !== draggableIdStr);
        const newWaiting = Array.from(new Set([...(waiting[group] || []), draggableIdStr]));
        
        setPhanCa(prev => ({ ...prev, [group]: newShifts }));
        setWaiting(prev => ({ ...prev, [group]: newWaiting }));
        
        if (debouncedUpdateShiftsRef.current) {
          await debouncedUpdateShiftsRef.current(group, newShifts);
        }
        if (debouncedUpdateWaitingRef.current) {
          await debouncedUpdateWaitingRef.current(group, newWaiting);
        }
      }
    } catch (err) {
      console.error('Lỗi trong onDragEnd:', err);
      setError('Lỗi khi xử lý kéo thả: ' + err.message);
    }
  }, [phanCa, waiting]);



  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ padding: 16, maxWidth: 10000, margin: '0 auto' }}>
        {error ? (
          <div style={{ 
            background: '#fff2f0', 
            border: '1px solid #ffccc7', 
            borderRadius: 6, 
            padding: 12, 
            marginBottom: 16,
            color: '#cf1322'
          }}>
            ❌ {error}
          </div>
        ) : loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 20, 
            color: '#666',
            fontSize: 16
          }}>
            ⏳ Đang tải dữ liệu...
          </div>
        ) : (
          <>


            {/* Bảng nhỏ hiển thị dữ liệu theo tháng - Sử dụng component tối ưu */}
            <MonthDataCard
              currentMonth={currentMonth}
              currentYear={currentYear}
              handleMonthChange={handleMonthChange}
              GROUPS={GROUPS}
              phanCa={phanCa}
              waiting={waiting}
            />
            
            {/* Bảng phân ca chính - Sử dụng component tối ưu */}
            {GROUPS.map(group => (
              <GroupPhanCa
                key={group.value}
                group={group}
                phanCa={phanCa[group.value]}
                waiting={waiting[group.value]}
                users={users}
                onAddBlock={handleAddBlock}
                onEditLabel={handleEditLabel}
                onEditTime={handleEditTime}
                onDeleteBlock={handleDeleteBlock}
                onNoteChange={handleNoteChange}
                onDragEnd={onDragEnd}
                onAddToWaiting={handleAddToWaiting}
                onRemoveFromWaiting={handleRemoveFromWaiting}
                onRemoveFromCa={handleRemoveFromCa}
              />
            ))}
          </>
        )}

        {/* Popup chọn nhân sự để thêm vào hàng chờ */}
        {showAddUserPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 1000
          }}>
            <div 
              className="add-user-popup" 
                      style={{
                position: 'absolute',
                left: popupPosition.x,
                top: popupPosition.y,
                background: '#fff',
                        borderRadius: 8,
                padding: 16,
                minWidth: 280,
                maxWidth: 320,
                maxHeight: '70vh',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid #e8e8e8'
              }}
            >
                        <div style={{
                          display: 'flex',
                justifyContent: 'space-between', 
                          alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '1px solid #f0f0f0'
              }}>
                <h4 style={{ margin: 0, color: '#29547A', fontSize: 16, fontWeight: 600 }}>
                  Chọn nhân sự
                </h4>
                <Button 
                  size="small" 
                  type="text"
                  onClick={() => {
                    setShowAddUserPopup(false);
                    setSelectedGroup(null);
                    setAvailableUsers([]);
                    setSelectedUsers(new Set());
                  }}
                  style={{ padding: 4, minWidth: 24, height: 24 }}
                >
                  ✕
                </Button>
                        </div>
              
              {availableUsers.length === 0 ? (
                      <div style={{ 
                  textAlign: 'center', 
                  padding: 20, 
                  color: '#666',
                        fontSize: 14, 
                  background: '#f9f9f9',
                  borderRadius: 6,
                  border: '1px dashed #d9d9d9'
                      }}>
                  <div style={{ marginBottom: 8 }}>⚠️</div>
                  <div>Không còn ai để chọn đâu</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    Kiểm tra xem số lượng đủ chưa
                      </div>
                        </div>
              ) : (
                <>
                  {/* Nút chọn tất cả */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: '#f8f9fa',
                    borderRadius: 6,
                    border: '1px solid #e9ecef'
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#495057' }}>
                      {selectedUsers.size} / {availableUsers.length} đã chọn
                          </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button 
                        size="small"
                        onClick={handleSelectAllUsers}
                        style={{ 
                          background: '#28a745', 
                          borderColor: '#28a745',
                          fontSize: 12,
                          height: 28
                        }}
                      >
                        Chọn tất cả
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => setSelectedUsers(new Set())}
                        style={{ 
                          background: '#6c757d', 
                          borderColor: '#6c757d',
                          fontSize: 12,
                          height: 28
                        }}
                      >
                        Bỏ chọn
                      </Button>
                        </div>
                        </div>

                  {/* Danh sách users */}
                        <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    marginBottom: 12
                  }}>
                    {availableUsers.map(user => (
                      <div
                        key={user._id}
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${selectedUsers.has(user._id) ? '#1890ff' : '#e8e8e8'}`,
                          borderRadius: 6,
                          cursor: 'pointer',
                                display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: selectedUsers.has(user._id) ? '#e6f7ff' : '#fff',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          if (!selectedUsers.has(user._id)) {
                            e.target.style.background = '#f5f5f5';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!selectedUsers.has(user._id)) {
                            e.target.style.background = '#fff';
                          }
                        }}
                        onClick={() => handleToggleUserSelection(user._id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user._id)}
                          onChange={() => handleToggleUserSelection(user._id)}
                          style={{ margin: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: 600, 
                            color: '#29547A',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <span>{user.username}</span>
                                <span style={{ 
                              fontSize: 12, 
                              color: '#666',
                              fontWeight: 500,
                              background: '#f0f0f0',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}>
                              {user.group_name}
                                </span>
                              </div>
                        </div>
                      </div>
                    ))}
                    </div>

                  {/* Nút thêm */}
                  <div style={{ 
                    display: 'flex', 
                    gap: 8,
                    justifyContent: 'flex-end'
                  }}>
                    <Button 
                      size="small"
                      onClick={() => {
                        setShowAddUserPopup(false);
                        setSelectedGroup(null);
                        setAvailableUsers([]);
                        setSelectedUsers(new Set());
                      }}
                    >
                      Hủy
                    </Button>
                    <Button 
                      size="small"
                      type="primary"
                      disabled={selectedUsers.size === 0}
                      onClick={handleAddSelectedUsers}
                                  style={{
                        background: selectedUsers.size > 0 ? '#1890ff' : '#d9d9d9',
                        borderColor: selectedUsers.size > 0 ? '#1890ff' : '#d9d9d9'
                      }}
                    >
                      Thêm ({selectedUsers.size})
                    </Button>
                                </div>
                </>
                              )}
                        </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}

 
