import React from 'react';

import { PanelMenuItem } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Menu, Spinner } from '@grafana/ui';

import { QueryData } from '../../utils/transfrom-targets';
export interface Props {
  items: PanelMenuItem[];
  style?: React.CSSProperties;
  itemsClassName?: string;
  className?: string;
  onClickAddStrategy: (payload: QueryData) => void;
}

export function PanelHeaderMenu({ items, onClickAddStrategy }: Props) {
  const handleItemClick = (item: PanelMenuItem, event: React.MouseEvent<HTMLElement>, payload?: unknown) => {
    const data = item.onClick?.(event);
    if (data) {
      onClickAddStrategy(data);
    }
  };
  const renderItems = (items: PanelMenuItem[]) => {
    return items.map((item) => {
      switch (item.type) {
        case 'divider':
          return <Menu.Divider key={item.text} />;
        case 'group':
          return (
            <Menu.Group key={item.text} label={item.text}>
              {item.subMenu ? renderItems(item.subMenu) : undefined}
            </Menu.Group>
          );
        case 'loading':
          return (
            <Menu.Item
              key={item.text}
              label={item.text}
              icon={item.iconClassName}
              childItems={item.subMenu ? renderItems(item.subMenu) : undefined}
              url={item.href}
              onClick={(e, payload) => handleItemClick(item, e, payload)}
              shortcut={item.shortcut}
              testId={selectors.components.Panels.Panel.menuItems(item.text)}
            >
              {
                <Spinner
                  style={{
                    display: 'inline-flex',
                    position: 'absolute',
                    top: '6px',
                    right: '15px',
                    color: '#3a84ff',
                  }}
                />
              }
            </Menu.Item>
          );
        default:
          return (
            <Menu.Item
              key={item.text}
              label={item.text}
              icon={item.iconClassName}
              childItems={item.subMenu ? renderItems(item.subMenu) : undefined}
              url={item.href}
              onClick={(e, payload) => handleItemClick(item, e, payload)}
              shortcut={item.shortcut}
              testId={selectors.components.Panels.Panel.menuItems(item.text)}
            >
              {item.customRender ? item.customRender() : undefined}
            </Menu.Item>
          );
      }
    });
  };

  return (
    <>
      <Menu>{renderItems(items)}</Menu>
    </>
  );
}
