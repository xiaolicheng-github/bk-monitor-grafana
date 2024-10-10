/* eslint-disable @grafana/no-border-radius-literal */
import { css } from '@emotion/css';
import React, { ReactElement, useState } from 'react';

import { GrafanaTheme2, VariableWithMultiSupport, VariableWithOptions } from '@grafana/data';
import { Button, Modal, useStyles2, Input } from '@grafana/ui';
import { OptionsPickerState, initialOptionPickerState } from 'app/features/variables/pickers/OptionsPicker/reducer';
import { getVariableWithName } from 'app/features/variables/state/selectors';

import { DashboardModel, PanelModel } from '../state';
import { QueryConfig, QueryData } from '../utils/transfrom-targets';

import MonitorVariablePicker from './monitor-variable';
export interface MonitorVariableState extends OptionsPickerState {
  showOption: boolean;
}
interface Props {
  panel?: PanelModel;
  dashboard?: DashboardModel;
  isOpen: boolean;
  monitorTarget: QueryData;
  onHideModal: () => void;
}
const MethodMap = {
  eq: '=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  neq: '!=',
  include: 'include',
  exclude: 'exclude',
  reg: 'regex',
  nreg: 'nregex',
} as any;

export const MonitorStrategy = ({ panel, dashboard, isOpen, onHideModal, monitorTarget }: Props) => {
  const styles = useStyles2(getStyles);
  const realTarget =
    monitorTarget?.mode === 'code'
      ? {
          source: monitorTarget?.source,
        }
      : {
          query_configs: monitorTarget?.query_configs
            .filter((item) => item.display !== false)
            .map((item) => ({
              ...item,
              alias: '',
            })),
          expressionList: monitorTarget?.expressionList
            ?.filter((item) => item.active !== false)
            .map((item) => ({
              ...item,
              alias: '',
            })),
        };
  console.info('MonitorStrategy', realTarget, '==================================');
  const targetStr = JSON.stringify(realTarget);
  const variablesSet = new Set<string>();
  const stateMap = {} as Record<string, MonitorVariableState>;
  if (targetStr?.length) {
    const variableRegex = /\$(\w+)|\[\[(\w+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::([^\}]+))?}/g;
    variableRegex.lastIndex = 0;
    // @ts-ignore
    targetStr.replace(variableRegex, (match, var1, var2, fmt2, var3) => {
      variablesSet.add(var1 || var2 || var3);
    });
    for (const variableName of variablesSet) {
      const variable = getVariableWithName(variableName) as VariableWithOptions | VariableWithMultiSupport;
      let state: MonitorVariableState = {
        ...initialOptionPickerState,
        showOption: false,
      };
      if (variable?.rootStateKey) {
        // @ts-ignore
        const selectedValue: OptionsPickerState['selectedValues'] = variable.current;
        state = {
          id: variable.id,
          selectedValues: Array.isArray(selectedValue) ? selectedValue : [selectedValue],
          queryValue: '',
          highlightIndex: -1,
          options: variable.options,
          multi: !!(variable as VariableWithMultiSupport).multi,
          showOption: false,
        };
      }
      stateMap[variableName] = state;
    }
  }
  const [variableStateMap, updateVariableStateMap] = useState<Record<string, MonitorVariableState>>(stateMap);
  const createCommonField = (label: string, value: string | ReactElement[]) => {
    return (
      <div className={styles.commonField}>
        <div className={styles.label}>{label}：</div>
        <div className={styles.value}>{value}</div>
      </div>
    );
  };
  const createTags = (tags: string[]) => {
    if (!tags?.length) {
      return '--';
    }
    return tags.map((tag, index) => {
      return (
        <div key={index} className={styles.tag}>
          {tag}
        </div>
      );
    });
  };
  const createConditions = (where: QueryConfig['where']) => {
    if (!where?.length) {
      return '--';
    }
    return where.map((item, index) => {
      return (
        <>
          {index > 0 && <span className={styles.condition}>{item.condition}</span>}
          <span className={styles.commonItem}>{item.key}</span>
          <span className={styles.method}>{MethodMap[item.method] || item.method}</span>
          {item.value?.map((v, i) => {
            return [
              i > 0 && '，',
              <span
                key={i}
                className={styles.valueItem}
                style={{
                  background: v?.startsWith('$') ? '#FFDEDE' : 'transparent',
                }}
              >
                {v === '' ? '-空-' : v}
              </span>,
            ];
          })}
        </>
      );
    });
  };
  const createFunctions = (functions: QueryConfig['functions']) => {
    if (!functions?.length) {
      return '--';
    }
    return functions.map((item, index) => {
      return (
        <div className={styles.functionWrap} key={index}>
          <span>{item.id}</span>
          {item.params?.length && <span>({item.params.map((v) => v.value).join(',')})</span>}
        </div>
      );
    });
  };
  const handleUpdateVariableStateMap = (name: string, state: MonitorVariableState) => {
    for (const [key, val] of Object.entries(variableStateMap)) {
      if (name !== key) {
        val.showOption = false;
      }
    }
    updateVariableStateMap({
      ...variableStateMap,
      [name]: state,
    });
  };
  const createVariableSelect = (name: string) => {
    const variableState = variableStateMap[name];
    const variable = getVariableWithName(name) as VariableWithOptions | VariableWithMultiSupport;
    if (!variable) {
      return (
        <Input
          placeholder="请输入变量值"
          onChange={(e) => {
            handleUpdateVariableStateMap(name, {
              ...variableState,
              queryValue: e.target?.value || '',
            });
          }}
        />
      );
    }
    return (
      <MonitorVariablePicker
        variable={variable}
        variableState={variableState}
        updateVariableState={(v) => handleUpdateVariableStateMap(name, v)}
      />
    );
  };
  const onAddStrategy = () => {
    onHideModal();
  };
  if (!panel || !dashboard) {
    return null;
  }
  if (!isOpen || !monitorTarget?.refId) {
    return undefined;
  }
  return (
    <Modal title="添加策略" isOpen={isOpen} onDismiss={() => onHideModal()}>
      <div className={styles.targetWrapper}>
        {monitorTarget.mode === 'code' ? (
          <>
            <div className={styles.target}>
              <span className={styles.targetRefId}>{monitorTarget.refId}</span>
              <div
                className={styles.targetContent}
                style={{
                  paddingRight: '12px',
                  paddingBottom: '12px',
                }}
              >
                {realTarget.source}
              </div>
            </div>
          </>
        ) : (
          <>
            {realTarget.query_configs?.map((target, index) => {
              return (
                <div className={styles.target} key={index}>
                  <span className={styles.targetRefId}>{target.refId}</span>
                  <div className={styles.targetContent}>
                    {createCommonField('指标', target.result_table_id + '.' + target.metric_field)}
                    {createCommonField('方法', target.method)}
                    {createCommonField(
                      '周期',
                      target.interval === 'auto' ? 'auto' : target.interval + ' ' + target.interval_unit
                    )}
                    {createCommonField('维度', createTags(target.group_by))}
                    {createCommonField('条件', createConditions(target.where))}
                    {createCommonField('函数', createFunctions(target.functions))}
                  </div>
                </div>
              );
            })}
          </>
        )}
        {Object.keys(variableStateMap).length > 0 && (
          <div className={styles.targetWrapper}>
            <div className={styles.variableTitle}>
              <span className={styles.variableTitleItem}>变量</span>
              <span className={styles.variableTitleItem}>变量值</span>
            </div>
            {Object.keys(variableStateMap).map((name) => {
              return (
                <div className={styles.variableRow} key={name}>
                  <span className={styles.variableRowLabel}>${name}</span>
                  <span className={styles.variableRowContent}>{createVariableSelect(name)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <Modal.ButtonRow>
          <Button variant="secondary" fill="outline" onClick={() => onHideModal()}>
            Cancel
          </Button>
          <Button onClick={() => onAddStrategy()}>Save</Button>
        </Modal.ButtonRow>
      </div>
    </Modal>
  );
};
const getStyles = (theme: GrafanaTheme2) => {
  return {
    targetWrapper: css({
      display: 'flex',
      flexDirection: 'column',
      color: '#63656E',
    }),
    target: css({
      display: 'flex',
      alignItems: 'center',
      height: 'fit-content',
      // eslint-disable-next-line @grafana/no-border-radius-literal
      borderRadius: '2px',
      minHeight: '44px',
      backgroundColor: '#E1ECFF',
      marginBottom: '8px',
    }),
    targetRefId: css({
      display: 'flex',
      justifyContent: 'center',
      height: '100%',
      flex: '0 0 20px',
      width: '20px',
      fontSize: '14px',
      color: '#3A84FF',
    }),
    targetContent: css({
      flex: '1 1 auto',
      display: 'flex',
      alignItems: 'center',
      padding: '12px 0 4px 12px',
      background: '#F5F7FA',
      flexWrap: 'wrap',
      wordBreak: 'break-all',
    }),
    commonField: css({
      display: 'flex',
      // minHeight: '30px',
      flexWrap: 'wrap',
      marginRight: '32px',
      marginBottom: '8px',
    }),
    label: css({
      display: 'flex',
      width: 'fit-content',
      lineHeight: '22px',
      height: '22px',
    }),
    value: css({
      display: 'flex',
      width: 'fit-content',
      color: '#313238',
      marginLeft: '8px',
      flexWrap: 'wrap',
      lineHeight: '22px',
      flex: 1,
    }),
    tag: css({
      display: 'flex',
      width: 'fit-content',
      padding: '0 8px',
      height: '22px',
      marginLeft: '10px',
      background: '#FAFBFD',
      border: '1px solid #DCDEE5',
      borderRadius: '2px',
    }),
    commonItem: css({
      display: 'flex',
      lineHeight: '22px',
      height: '22px',
    }),
    method: css({
      display: 'flex',
      lineHeight: '22px',
      height: '22px',
      justifyContent: 'center',
      color: '#3A84FF',
      margin: '0 6px',
      fontWeight: 'bold',
    }),
    valueItem: css({
      display: 'flex',
      lineHeight: '22px',
      height: '22px',
      justifyContent: 'center',
      marginRight: '2px',
      padding: '0 2px',
      borderRadius: '2px',
    }),
    condition: css({
      display: 'flex',
      lineHeight: '22px',
      height: '22px',
      justifyContent: 'center',
      color: '#FF9C01',
      marginRight: '6px',
      fontWeight: 'bold',
    }),
    variableTitle: css({
      display: 'flex',
      width: '100%',
      alignItems: 'center',
    }),
    variableTitleItem: css`
      display: flex;
      flex: 0 0 208px;
      margin: 16px 16px 6px 0px;
      &::after {
        content: '*';
        color: #ea3636;
        margin: 0px 4px;
      }
    `,
    variableRow: css`
      display: flex;
      width: 100%;
      align-items: center;
      margin-bottom: 8px;
    `,
    variableRowLabel: css`
      display: flex;
      width: 100%;
      align-items: center;
      width: 208px;
      height: 32px;
      background: #fafbfd;
      border: 1px solid #dcdee5;
      border-radius: 2px;
      padding-left: 8px;
      margin-right: 16px;
    `,
    variableRowContent: css`
      display: flex;
      width: 100%;
      align-items: center;
      width: 208px;
    `,
    footer: css`
      position: sticky;
      bottom: -24px;
      background: white;
      margin-bottom: -24px;
      z-index: 99;
    `,
    functionWrap: css`
      display: flex;
      align-items: center;
      margin-right: 8px;
    `,
  };
};
