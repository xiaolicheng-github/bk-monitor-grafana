import { css, cx } from '@emotion/css';
import React, { ReactElement, useEffect, useState } from 'react';

import { LoadingState, PanelMenuItem } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { getPanelStateForModel } from 'app/features/panel/state/selectors';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';
import { useSelector } from 'app/types';

import { DashboardModel, PanelModel } from '../../state';
import { getPanelMenu } from '../../utils/getPanelMenu';
const isEnLang = !!document.cookie?.includes('blueking_language=en');
interface PanelHeaderMenuProviderApi {
  items: PanelMenuItem[];
}

interface IRelateStrategyItem {
  strategy_id: number;
  strategy_name: string;
}
interface Props {
  panel: PanelModel;
  dashboard: DashboardModel;
  loadingState?: LoadingState;
  children: (props: PanelHeaderMenuProviderApi) => ReactElement;
}

export function PanelHeaderMenuProvider({ panel, dashboard, loadingState, children }: Props) {
  const styles = useStyles2(getStyles);
  const [items, setItems] = useState<PanelMenuItem[]>([]);
  const angularComponent = useSelector((state) => getPanelStateForModel(state, panel)?.angularComponent);

  useEffect(() => {
    const items = getPanelMenu(dashboard, panel, angularComponent);
    const index = items?.findIndex((item) => item.type === 'loading');
    if (index !== -1) {
      const item = items[index];
      getDatasourceSrv()
        .get(panel.datasource)
        .then((datasource: any) => {
          if (datasource?.getRelateStrategy) {
            datasource
              .getRelateStrategy({
                dashboard_uid: dashboard.uid,
                panel_id: panel.id,
              })
              .then((data: IRelateStrategyItem[]) => {
                const count = data.length || 0;
                item.type = 'submenu';
                item.text = (!isEnLang ? '关联策略' : 'Relate Rule') + `(${count})`;
                item.subMenu = data.map((strategyItem) => ({
                  // text: strategyItem.strategy_name,
                  onClick: (event: React.MouseEvent<any>) => {
                    event.preventDefault();
                    localStorage.setItem('grafana-related-strategy', JSON.stringify(strategyItem));
                    const monitorUrl = `${location.href.split('/grafana')[0]}/?bizId=${
                      (window.grafanaBootData as any).user.orgName
                    }#/strategy-config/edit/${strategyItem.strategy_id}?grafana_related_strategy=true`;
                    window.open(monitorUrl);
                  },
                  customRender: () => (
                    <span className={cx(styles.strategyItem)}>
                      <span>{strategyItem.strategy_name}</span>
                      <svg
                        viewBox="0 0 1024 1024"
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        p-id="14668"
                        width={14}
                        height={14}
                        className={cx(styles.strategyLink)}
                      >
                        <path
                          fill="#3A84FF"
                          d="M981.333333 1024H42.666667a42.666667 42.666667 0 0 1-42.666667-42.666667V42.666667a42.666667 42.666667 0 0 1 42.666667-42.666667h341.333333a42.666667 42.666667 0 0 1 0 85.333333H85.333333v853.333334h853.333334V618.666667a42.666667 42.666667 0 0 1 85.333333 0v362.666666a42.666667 42.666667 0 0 1-42.666667 42.666667z m0-576a42.666667 42.666667 0 0 1-42.666666-42.666667V152.746667L315.306667 796.8a48 48 0 0 1-67.2 0 47.36 47.36 0 0 1 0-66.133333L871.893333 85.333333H640a42.666667 42.666667 0 0 1 0-85.333333h341.333333a42.666667 42.666667 0 0 1 42.666667 42.666667v362.666666a42.666667 42.666667 0 0 1-42.666667 42.666667z"
                          p-id="14669"
                        ></path>
                      </svg>
                    </span>
                  ),
                }));
                // item.subMenu = [
                //   {
                //     text: '【Monitor】logComponent…MemoryHighLoad',
                //     onClick: (event: React.MouseEvent<any>) => {
                //       event.preventDefault();
                //       console.info('ddddddddddd');
                //     },
                //   },
                //   {
                //     text: '【Monitor】logComponentCPUHighLoad',
                //     onClick: (event: React.MouseEvent<any>) => {
                //       event.preventDefault();
                //       console.info('XXXX');
                //     },
                //   },
                // ];
                setItems([...items]);
              });
          }
        });
    }
    setItems(items);
  }, [dashboard, panel, angularComponent, loadingState, setItems]);
  return children({ items });
}

const getStyles = () => {
  return {
    strategyItem: css`
      max-width: 368px;
      width: 398px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `,
    strategyLink: css`
      color: #3a84ff;
    `,
  };
};
