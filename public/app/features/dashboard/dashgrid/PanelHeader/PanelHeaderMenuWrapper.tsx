import React from 'react';

import { LoadingState } from '@grafana/data';

import { DashboardModel, PanelModel } from '../../state';
import { QueryData } from '../../utils/transfrom-targets';

import { PanelHeaderMenu } from './PanelHeaderMenu';
import { PanelHeaderMenuProvider } from './PanelHeaderMenuProvider';

interface Props {
  panel: PanelModel;
  dashboard: DashboardModel;
  loadingState?: LoadingState;
  style?: React.CSSProperties;
  menuItemsClassName?: string;
  menuWrapperClassName?: string;
  onClickAddStrategy: (payload: QueryData) => void;
}

export function PanelHeaderMenuWrapper({ style, panel, dashboard, loadingState, onClickAddStrategy }: Props) {
  return (
    <PanelHeaderMenuProvider panel={panel} dashboard={dashboard} loadingState={loadingState}>
      {({ items }) => <PanelHeaderMenu style={style} items={items} onClickAddStrategy={onClickAddStrategy} />}
    </PanelHeaderMenuProvider>
  );
}
