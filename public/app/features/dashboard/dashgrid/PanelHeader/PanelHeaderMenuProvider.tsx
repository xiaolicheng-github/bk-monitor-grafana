import { ReactElement, useEffect, useState } from 'react';

import { LoadingState, PanelMenuItem } from '@grafana/data';
import { getPanelStateForModel } from 'app/features/panel/state/selectors';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';
import { useSelector } from 'app/types';

import { DashboardModel, PanelModel } from '../../state';
import { getPanelMenu } from '../../utils/getPanelMenu';

interface PanelHeaderMenuProviderApi {
  items: PanelMenuItem[];
}

interface Props {
  panel: PanelModel;
  dashboard: DashboardModel;
  loadingState?: LoadingState;
  children: (props: PanelHeaderMenuProviderApi) => ReactElement;
}

export function PanelHeaderMenuProvider({ panel, dashboard, loadingState, children }: Props) {
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
              ?.getRelateStrategy({
                dashboard_id: dashboard.uid,
                panel_id: panel.id,
              })
              .then(() => {
                item.type = 'submenu';
                item.subMenu = [
                  {
                    text: 'ddddd',
                    onClick: (event: React.MouseEvent<any>) => {
                      event.preventDefault();
                      console.info('ddddddddddd');
                    },
                  },
                  {
                    text: 'XXXX',
                    onClick: (event: React.MouseEvent<any>) => {
                      event.preventDefault();
                      console.info('XXXX');
                    },
                  },
                ];
                setItems([...items]);
              });
          }
        });
    }
    setItems(items);
  }, [dashboard, panel, angularComponent, loadingState, setItems]);
  return children({ items });
}
