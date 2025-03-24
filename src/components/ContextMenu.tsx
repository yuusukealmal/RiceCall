import React, { useEffect, useRef, useState } from 'react';

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

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  // Ref
  const menuRef = useRef<HTMLDivElement>(null);

  // State
  const [subMenu, setSubMenu] = useState<React.ReactNode>(null);
  const [menuWidth, setMenuWidth] = useState(0);
  const [menuX, setMenuX] = useState(x);
  const [menuY, setMenuY] = useState(y);

  // Effect
  useEffect(() => {
    if (menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth;
      const menuHeight = menuRef.current.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newMenuX = x;
      let newMenuY = y;

      if (x + menuWidth > windowWidth - 20) {
        newMenuX = windowWidth - menuWidth - 20;
      }

      if (y + menuHeight > windowHeight - 20) {
        newMenuY = windowHeight - menuHeight - 20;
      }

      setMenuWidth(menuWidth);
      setMenuX(newMenuX);
      setMenuY(newMenuY);
    }
  }, [x, y, menuRef]);

  return (
    <div
      ref={menuRef}
      className={`${contextMenu['contextMenu']}`}
      style={{ top: menuY, left: menuX }}
    >
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
              onMouseEnter={(e) => {
                if (!item.hasSubmenu) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setSubMenu(
                  <ContextMenu
                    x={rect.left + menuWidth - 3}
                    y={rect.top}
                    items={item.submenuItems || []}
                    onClose={onClose}
                  />,
                );
              }}
            >
              {item.label}
              {item.hasSubmenu && subMenu}
            </div>
          );
        })}
    </div>
  );
};

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
