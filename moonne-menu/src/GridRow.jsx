import React from "react";

const GridRow = React.memo(function GridRow({ row, rowIdx, handleDragOver, handleDrop, handleDragStart, handleRemoveFromGrid, hoverRow, setHoverRow }) {
  return (
    <div
      className="grid-row"
      style={{ display: "flex" }}
      onMouseEnter={() => setHoverRow(rowIdx)}
      onMouseLeave={() => setHoverRow(null)}
    >
      {row.map((cell, colIdx) => {
        if (cell && cell.type === "walkway-vertical") {
          return (
            <div
              className="walkway-col"
              key={colIdx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#e0e6ed",
                minWidth: 40,
              }}
            >
              <span
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#29547A",
                  letterSpacing: 1,
                }}
              >
                Đường đi
              </span>
            </div>
          );
        }

        return (
          <div
            className="grid-cell"
            key={colIdx}
            onDragOver={(e) => handleDragOver(e, rowIdx, colIdx)}
            onDrop={() => handleDrop(rowIdx, colIdx)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {cell ? (
              <div
                className="employee-block"
                data-group={cell.group}
                draggable
                onDragStart={() => handleDragStart(rowIdx, colIdx)}
                style={{
                  width: "100%",
                  minHeight: 44,
                  justifyContent: "center",
                  position: "relative",
                  textAlign: "center",
                  wordBreak: "break-word",
                  whiteSpace: "pre-line",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div className="block-content">
                  <div className="block-name">{cell.name || cell.username}</div>
                  <div className="block-group">{cell.group || cell.group_name}</div>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveFromGrid(rowIdx, colIdx)}
                  title="Xóa khỏi lưới"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="employee-block empty">trống</div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default GridRow; 