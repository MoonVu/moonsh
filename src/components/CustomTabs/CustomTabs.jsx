import React, { useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import './CustomTabs.css';

const CustomTabs = ({ 
  tabs = [], 
  activeTab, 
  onTabChange, 
  onEditTab,
  showEditIcon = true,
  className = '',
  ...props 
}) => {
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabName, setEditingTabName] = useState('');

  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const handleEditClick = (e, tab) => {
    e.stopPropagation();
    if (onEditTab) {
      setEditingTabId(tab.id);
      setEditingTabName(tab.name);
    }
  };

  const handleEditSave = (tabId) => {
    if (onEditTab && editingTabName.trim()) {
      onEditTab(tabId, editingTabName.trim());
      setEditingTabId(null);
      setEditingTabName('');
    }
  };

  const handleEditCancel = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleEditKeyPress = (e, tabId) => {
    if (e.key === 'Enter') {
      handleEditSave(tabId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <div className={`custom-tabs ${className}`} {...props}>
      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={() => handleEditSave(tab.id)}
                onKeyDown={(e) => handleEditKeyPress(e, tab.id)}
                className="tab-edit-input"
                autoFocus
              />
            ) : (
              <>
                <span className="tab-name">{tab.name}</span>
                {showEditIcon && onEditTab && (
                  <EditOutlined
                    className="edit-icon"
                    onClick={(e) => handleEditClick(e, tab)}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
      
      {/* Tab content */}
      <div className="tab-content">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default CustomTabs;
