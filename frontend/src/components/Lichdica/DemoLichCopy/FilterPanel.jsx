import React, { useState, useMemo } from "react";
import { Select, Button } from 'antd';
import { useAuth } from "../../../hooks/useAuth";

export default function FilterPanel({
  filterCa,
  setFilterCa,
  filterDepartment,
  setFilterDepartment,
  staffsByCa,
  clearFilters
}) {
  const { isAdmin } = useAuth();

  return (
    <div
      className="filter-card"
      style={{
        marginBottom: '20px',
        padding: '16px',
        background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <h3 style={{ 
        margin: '0 0 16px 0', 
        color: '#1890ff', 
        fontSize: '18px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🔍 Bộ lọc dữ liệu
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        alignItems: 'end'
      }}>
        {/* Lọc theo ca */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600', 
            color: '#495057' 
          }}>
            Thời gian làm việc:
            {filterCa.length > 0 && (
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#52c41a' }}>
                ({filterCa.length} ca đã chọn)
              </span>
            )}
          </label>
          <Select
            mode="multiple"
            placeholder="Chọn ca để lọc (có thể chọn nhiều)"
            style={{ width: '100%' }}
            allowClear
            showSearch
            maxTagCount={3}
            maxTagTextLength={15}
            value={filterCa}
            onChange={setFilterCa}
            options={(() => {
              const caOptions = new Set();
              staffsByCa.forEach(staff => {
                if (staff.ca) {
                  caOptions.add(staff.ca);
                }
              });
              return Array.from(caOptions).map(ca => ({
                label: ca,
                value: ca
              }));
            })()}
          />
        </div>
        
        {/* Lọc theo bộ phận */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600', 
            color: '#495057' 
          }}>
            Bộ phận:
            {filterDepartment.length > 0 && (
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#52c41a' }}>
                ({filterDepartment.length} bộ phận đã chọn)
              </span>
            )}
          </label>
          <Select
            mode="multiple"
            placeholder="Chọn bộ phận để lọc (có thể chọn nhiều)"
            style={{ width: '100%' }}
            allowClear
            showSearch
            maxTagCount={3}
            maxTagTextLength={15}
            value={filterDepartment}
            onChange={setFilterDepartment}
            options={(() => {
              const deptOptions = new Set();
              staffsByCa.forEach(staff => {
                if (staff.department) {
                  deptOptions.add(staff.department);
                }
              });
              return Array.from(deptOptions).map(dept => ({
                label: dept,
                value: dept
              }));
            })()}
          />
        </div>
        
        {/* Nút xóa bộ lọc */}
        <div>
          <Button
            onClick={clearFilters}
            title="Xóa tất cả bộ lọc đang áp dụng"
            style={{ 
              width: '100%',
              height: '32px',
              background: '#ff4d4f',
              borderColor: '#ff4d4f',
              color: 'white'
            }}
            icon={<span>🗑️</span>}
          >
            Xóa bộ lọc
          </Button>
        </div>
      </div>
    </div>
  );
}
