import React from 'react';

// CSS
import contextMenu from '@/styles/contextMenu.module.css';

// Types
import { ContextMenuItem } from '@/types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const createContextMenu = (
    items: ContextMenuItem[],
    styles?: React.CSSProperties,
  ) => {
    return (
      <div className={contextMenu['contextMenu']} style={styles}>
        {items
          .filter((item) => item?.show ?? true)
          .map((item, index) => {
            if (item.id === 'separator') {
              return <div className={contextMenu['separator']} key={index} />;
            }
            return (
              <div
                key={item.id || index}
                className={`${contextMenu['option']} ${
                  item.hasSubmenu ? contextMenu['hasSubmenu'] : ''
                } ${item.className}`}
                style={item.style}
                data-type={item.icon || ''}
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
              >
                {item.label}
                {item.hasSubmenu && createContextMenu(item.submenuItems || [])}
              </div>
            );
          })}
      </div>
    );
  };

  return createContextMenu(items, { top: y, left: x, display: 'flex' });
  // <div className={contextMenu['contextMenu']} style={{ top: y, left: x }}>
  //   {items
  //     .filter((item) => item?.show ?? true)
  //     .map((item, index) => (
  //       <div
  //         key={item.id || index}
  //         data-icon={item.icon}
  //         onClick={() => {
  //           item.onClick?.();
  //           onClose();
  //         }}
  //         // disabled={item.disabled}
  //         className={`${contextMenu['option']} ${
  //           item.hasSubmenu ? contextMenu['hasSubmenu'] : ''
  //         } ${item.className}`}
  //         style={item.style}
  //       >
  //         {item.label}
  //         {item.hasSubmenu && (
  //           <div
  //             className={`${contextMenu['contextMenu']} ${contextMenu['hidden']}`}
  //           >
  //             <ContextMenu
  //               x={x}
  //               y={y}
  //               items={item.submenuItems || []}
  //               onClose={onClose}
  //             />
  //           </div>
  //         )}
  //       </div>
  //     ))}
  // </div>
};

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
