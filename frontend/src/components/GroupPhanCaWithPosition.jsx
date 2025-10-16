import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import { Card, Row, Col, Input, Button, Table, Typography, Modal } from "antd";
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { usePosition } from '../hooks/usePosition';

const GroupPhanCaWithPosition = memo(({ 
  group, 
  phanCa, 
  waiting, 
  users, 
  onAddBlock, 
  onEditLabel, 
  onEditTime, 
  onDeleteBlock, 
  onNoteChange, 
  onDragEnd,
  onAddToWaiting,
  onRemoveFromWaiting,
  onRemoveFromCa
}) => {
  const caArr = phanCa || [];
  
  // Sử dụng usePosition hook để lưu trạng thái
  const { 
    position, 
    saveComponentState, 
    saveFormData 
  } = usePosition();
  
  // State cho inline editing
  const [editing, setEditing] = useState({ type: '', group: '', caIdx: -1, value: '' });

  // Lưu trạng thái drag & drop vào UserPosition
  const handleDragEndWithPosition = useCallback(async (result) => {
    // Gọi onDragEnd gốc
    await onDragEnd(result);
    
    // Lưu trạng thái vào UserPosition
    try {
      await saveComponentState({
        dragState: {
          source: result.source,
          destination: result.destination,
          draggableId: result.draggableId,
          timestamp: new Date().toISOString()
        },
        group: group.value,
        phanCa: phanCa,
        waiting: waiting
      });
      console.log('✅ Đã lưu trạng thái drag & drop vào UserPosition');
    } catch (error) {
      console.error('❌ Lỗi lưu trạng thái drag & drop:', error);
    }
  }, [onDragEnd, saveComponentState, group.value, phanCa, waiting]);

  // Lưu note vào form data
  const handleNoteChangeWithPosition = useCallback(async (groupValue, caIdx, userIdx, note) => {
    // Gọi onNoteChange gốc
    onNoteChange(groupValue, caIdx, userIdx, note);
    
    // Lưu note vào UserPosition
    try {
      await saveFormData({
        notes: {
          [`${groupValue}-${caIdx}-${userIdx}`]: note
        }
      });
      console.log('✅ Đã lưu note vào UserPosition');
    } catch (error) {
      console.error('❌ Lỗi lưu note:', error);
    }
  }, [onNoteChange, saveFormData]);

  // Restore trạng thái từ UserPosition khi load
  useEffect(() => {
    if (position?.componentState?.group === group.value) {
      console.log('🔄 Restoring state from UserPosition:', position.componentState);
      // Có thể restore trạng thái nếu cần
    }
  }, [position, group.value]);

  // Tối ưu: Sử dụng useCallback cho các hàm render và memo cho columns
  const columns = useMemo(() => [
    {
      title: <span style={{ fontWeight: 700 }}>Thời gian</span>,
      dataIndex: "label",
      width: 180,
      render: (val, row, idx) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontWeight: 700, color: group.color, fontSize: 15 }}>
            {editing.type === 'label' && editing.group === group.value && editing.caIdx === idx ? (
              <Input
                value={editing.value}
                onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
                onPressEnter={() => {
                  onEditLabel(group.value, idx, editing.value);
                  setEditing({ type: '', group: '', caIdx: -1, value: '' });
                }}
                onBlur={() => {
                  onEditLabel(group.value, idx, editing.value);
                  setEditing({ type: '', group: '', caIdx: -1, value: '' });
                }}
                autoFocus
                size="small"
                style={{ fontSize: 15, fontWeight: 700, color: group.color }}
              />
            ) : (
              <span 
                style={{ cursor: 'pointer' }} 
                onClick={() => setEditing({ type: 'label', group: group.value, caIdx: idx, value: val })}
              >
                {val} <EditOutlined style={{ fontSize: 13, marginLeft: 4 }} />
              </span>
            )}
          </div>
          <div style={{ color: '#555', fontSize: 13, fontWeight: 500 }}>
            {editing.type === 'time' && editing.group === group.value && editing.caIdx === idx ? (
              <Input
                value={editing.value}
                onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
                onPressEnter={() => {
                  onEditTime(group.value, idx, editing.value);
                  setEditing({ type: '', group: '', caIdx: -1, value: '' });
                }}
                onBlur={() => {
                  onEditTime(group.value, idx, editing.value);
                  setEditing({ type: '', group: '', caIdx: -1, value: '' });
                }}
                autoFocus
                size="small"
                style={{ fontSize: 13, fontWeight: 500, color: '#555' }}
              />
            ) : (
              <span 
                style={{ cursor: 'pointer' }} 
                onClick={() => setEditing({ type: 'time', group: group.value, caIdx: idx, value: caArr[idx].time })}
              >
                {caArr[idx].time} <EditOutlined style={{ fontSize: 13, marginLeft: 4 }} />
              </span>
            )}
          </div>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            type="text"
            danger
            style={{ marginTop: 2, width: 24, height: 24, padding: 0, fontSize: 16 }}
            onClick={() => onDeleteBlock(group.value, idx)}
          />
        </div>
      )
    },
    {
      title: <span style={{ fontWeight: 700 }}>Nhân sự</span>,
      dataIndex: "users",
      width: 220,
      render: (val, row, caIdx) => (
        <Droppable droppableId={`ca-${group.value}-${caIdx}`} direction="vertical">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: 48,
                background: snapshot.isDraggingOver ? group.color+"10" : undefined,
                border: `1.5px dashed ${group.color}`,
                borderRadius: 8,
                padding: 4
              }}
            >
              {val && val.length > 0 ? val.map((u, idx) => {
                if (!u || typeof u !== 'object' || !u.userId) return null;
                const userId = typeof u.userId === 'string' ? u.userId : (u.userId && typeof u.userId === 'object' && u.userId._id ? u.userId._id : '');
                const user = users.find(us => String(us._id) === String(userId));
                if (!user) return null;
                const keyStr = (typeof userId === 'string' && userId) || `idx-${idx}`;
                const displayName = user?.username || String(userId);
                return (
                  <Draggable key={keyStr} draggableId={keyStr} index={idx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          background: snapshot.isDragging ? group.color : '#fff',
                          color: snapshot.isDragging ? '#fff' : group.color,
                          border: `1.5px solid ${group.color}`,
                          borderRadius: 6,
                          padding: '6px 14px',
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                          boxShadow: snapshot.isDragging ? '0 2px 8px #0002' : undefined,
                          display: 'flex', alignItems: 'center', gap: 8,
                          ...provided.draggableProps.style
                        }}
                      >
                        <span style={{ fontWeight: 700, marginRight: 6 }}>{idx + 1}.</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{user.username}</span>
                            </div>
                            <span style={{ 
                              fontSize: 11, 
                              color: '#666',
                              fontWeight: 500,
                              background: '#f0f0f0',
                              padding: '1px 4px',
                              borderRadius: 3
                            }}>
                              {user.group_name}
                            </span>
                          </div>
                          <DeleteOutlined
                            style={{ cursor: 'pointer', fontSize: 16, marginLeft: 8, color: '#cf1322' }}
                            onClick={() => onRemoveFromCa(group.value, caIdx, userId)}
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              }) : <span style={{ 
                color: '#bbb',
                display: 'block',
                textAlign: 'center',
                width: '100%' 
              }}>
                Chưa có nhân sự
              </span>}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )
    },
    {
      title: <span style={{ fontWeight: 700 }}>Ghi chú</span>,
      dataIndex: "users",
      width: 220,
      render: (val, row, caIdx) => (
        <div style={{ 
          minHeight: 48,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: 4,
          border: `1.5px dashed ${group.color}`,
          borderRadius: 8,
          background: '#fafafa'
        }}>
          {val && val.length > 0 ? val.map((u, idx) => {
            if (!u || typeof u !== 'object' || !('note' in u)) return null;
            const keyStr = (typeof u.userId === 'string' && u.userId) || (u.userId && typeof u.userId === 'object' && u.userId._id) || `idx-${idx}`;
            return (
              <div
                key={keyStr}
                style={{
                  background: '#fff',
                  color: group.color,
                  border: `1.5px solid ${group.color}`,
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 2,
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 32
                }}
              >
                <Input
                  value={u.note}
                  onChange={e => handleNoteChangeWithPosition(group.value, caIdx, idx, e.target.value)}
                  placeholder="Ghi chú..."
                  size="small"
                  style={{ 
                    border: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    fontWeight: 500,
                    padding: 0,
                    height: 'auto',
                    boxShadow: 'none'
                  }}
                />
              </div>
            );
          }) : <span style={{ 
            color: '#bbb', 
            display: 'block',
            textAlign: 'center',
            width: '100%',
            padding: '12px 0'
          }}>-</span>}
        </div>
      )
    }
  ], [caArr, group, users, editing, onEditLabel, onEditTime, onDeleteBlock, handleNoteChangeWithPosition, onRemoveFromCa]);

  const renderBangPhanCa = useCallback(() => {
    return (
      <Table
        size="small"
        pagination={false}
        bordered
        style={{ background: "#fff", borderRadius: 8, marginBottom: 8, minWidth: 650 }}
        columns={columns}
        dataSource={caArr}
        rowKey={(record) => record.label}
        locale={{ emptyText: <span style={{ color: '#bbb' }}>Chưa có ca</span> }}
        scroll={{ x: true }}
      />
    );
  }, [columns, caArr]);

  return (
    <DragDropContext onDragEnd={handleDragEndWithPosition}>
      <Row gutter={32} align="top" style={{ marginBottom: 40, flexWrap: 'nowrap' }}>
        <Col style={{ flex: 1, minWidth: 0 }}>
          <Card
            title={<span style={{ color: group.color, fontWeight: 700, fontSize: 18 }}>{group.label}</span>}
            variant="borderless"
            style={{
              background: group.color + '08',
              minHeight: 420,
              borderRadius: 12,
              marginBottom: 16,
              border: `2px solid ${group.color}55`
            }}
            styles={{ header: {
              background: group.color + '22',
              borderRadius: '12px 12px 0 0',
              borderBottom: `2.5px solid ${group.color}`
            }}}
            extra={<Button icon={<PlusOutlined />} size="small" type="primary" style={{ background: group.color, borderColor: group.color, color: '#fff', fontWeight: 700, boxShadow: `0 2px 8px ${group.color}33` }} onClick={() => onAddBlock(group.value)}>Thêm ca</Button>}
          >
            {renderBangPhanCa()}
          </Card>
        </Col>
        <Col style={{ flex: '0 0 320px', maxWidth: 340 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Typography.Title level={5} style={{ margin: 0, color: group.color, fontWeight: 700, fontSize: 18 }}>Hàng chờ nhân sự</Typography.Title>
            <Button 
              icon={<PlusOutlined />} 
              size="small" 
              style={{ background: group.color, borderColor: group.color, color: '#fff', fontWeight: 700, marginRight: 8 }}
              onClick={(e) => onAddToWaiting(group.value, e)}
            >
              Thêm
            </Button>
          </div>
          <Card
            variant="borderless"
            style={{ background: group.color + '08', borderRadius: 12, marginBottom: 8, border: `2px solid ${group.color}55` }}
            styles={{ header: {
              background: group.color + '22',
              borderRadius: '12px 12px 0 0',
              borderBottom: `2.5px solid ${group.color}`
            }}}
          >
            <Droppable droppableId={`waiting-${group.value}`} direction="vertical">
              {(provided, snapshot) => {
                const waitingArr = waiting || [];
                // Chỉ hiển thị users hợp lệ trong waiting list
                const items = waitingArr
                  .filter(userId => userId) // Lọc bỏ null/undefined
                  .map(userId => ({
                    userId: String(userId),
                    user: users.find(u => String(u._id) === String(userId))
                  }))
                  .filter(item => item.user); // Chỉ giữ lại items có user hợp lệ
                
                return (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ minHeight: 48, background: snapshot.isDraggingOver ? group.color+"10" : undefined, border: `1.5px dashed ${group.color}`, borderRadius: 8, padding: 4 }}
                  >
                    {items.length > 0 ? items.map((item, idx) => (
                      <Draggable key={item.userId} draggableId={item.userId} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              background: snapshot.isDragging ? group.color : '#fff',
                              color: snapshot.isDragging ? '#fff' : group.color,
                              border: `1.5px solid ${group.color}`,
                              borderRadius: 6,
                              padding: '6px 14px',
                              fontWeight: 600,
                              fontSize: 14,
                              marginBottom: 2,
                              boxShadow: snapshot.isDragging ? '0 2px 8px #0002' : undefined,
                              display: 'flex', alignItems: 'center', gap: 8,
                              ...provided.draggableProps.style
                            }}
                          >
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>{item.user.username}</span>
                              <span style={{ 
                                fontSize: 11, 
                                color: '#666',
                                fontWeight: 500,
                                background: '#f0f0f0',
                                padding: '1px 4px',
                                borderRadius: 3
                              }}>
                                {item.user.group_name}
                              </span>
                            </div>
                            <DeleteOutlined
                              style={{ cursor: 'pointer', fontSize: 16, marginLeft: 8, color: '#cf1322' }}
                              onClick={() => onRemoveFromWaiting(group.value, item.userId)}
                            />
                          </div>
                        )}
                      </Draggable>
                    )) : <div style={{ color: '#bbb', textAlign: 'center', padding: '16px 0' }}>Không còn nhân sự chờ</div>}
                    {provided.placeholder}
                  </div>
                );
              }}
            </Droppable>
          </Card>
        </Col>
      </Row>
    </DragDropContext>
  );
});

GroupPhanCaWithPosition.displayName = 'GroupPhanCaWithPosition';

export default GroupPhanCaWithPosition; 