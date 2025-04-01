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
  const [showSubmenu, setShowSubmenu] = useState(false);
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
        newMenuX = windowWidth - menuWidth - 50;
      }

      if (y + menuHeight > windowHeight - 20) {
        newMenuY = windowHeight - menuHeight - 20;
      }

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
              className={`${contextMenu['option']} ${contextMenu[item.id]} ${
                item.hasSubmenu ? contextMenu['hasSubmenu'] : ''
              }`}
              style={{
                ...item.style,
                position: 'relative',
              }}
              data-type={item.icon || ''}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              onMouseEnter={() => {
                if (item.hasSubmenu) setShowSubmenu(true);
              }}
              onMouseLeave={() => {
                if (item.hasSubmenu) setShowSubmenu(false);
              }}
            >
              {item.label}
              {item.hasSubmenu && showSubmenu && (
                <div className={contextMenu['options']}>
                  {item.submenuItems?.map((subItem, subIndex) => (
                    <div
                      key={subItem.id || subIndex}
                      className={contextMenu['option']}
                      onClick={() => {
                        subItem.onClick?.();
                        onClose();
                      }}
                    >
                      {subItem.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
