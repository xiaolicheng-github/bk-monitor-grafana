/* eslint-disable @grafana/no-border-radius-literal */
import { css, cx } from '@emotion/css';
import React, { ReactElement, useMemo, useState } from 'react';

import { GrafanaTheme2, VariableWithMultiSupport, VariableWithOptions } from '@grafana/data';
import { Button, Modal, useStyles2, Input, Tooltip } from '@grafana/ui';
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
  const [realTarget, updateRealTarget] = useState(
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
        }
  );
  console.info('MonitorStrategy', realTarget, '==================================');
  const targetStr = JSON.stringify(
    monitorTarget?.mode === 'code'
      ? realTarget
      : {
          query_configs: realTarget.query_configs?.map((item) => ({
            where: item.where,
          })),
        }
  );
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
        stateMap[variableName] = state;
      }
    }
  }
  const [variableStateMap, updateVariableStateMap] = useState<Record<string, MonitorVariableState>>(stateMap);
  const needDisabled = useMemo(() => {
    // if (variablesSet.size && !Object.values(variableStateMap || {}).length) {
    //   return true;
    // }
    let disabled = false;
    for (const variable of Object.values(variableStateMap)) {
      if (variable.options.length && !variable.selectedValues.length) {
        disabled = true;
      } else if (!variable.options.length && !variable.queryValue) {
        disabled = true;
      }
    }
    console.info('needDisabled', disabled, variableStateMap);
    return disabled;
  }, [variableStateMap]);
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
                  background: Object.values(variableStateMap).find(
                    (item) => item.id && item.id.toString() === v.toString().slice(1)
                  )
                    ? '#FFDEDE'
                    : 'transparent',
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
          {item.params?.length ? <span>({item.params.map((v) => v.value).join(',')})</span> : undefined}
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
              // @ts-ignore
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
  const deleteExpression = (index: number) => {
    realTarget.expressionList?.splice(index, 1);
    updateRealTarget({
      ...realTarget,
      expressionList: realTarget.expressionList,
    } as any);
  };
  const onDeleteVariable = (name: string) => {
    delete variableStateMap[name];
    updateVariableStateMap({
      ...variableStateMap,
    });
  };
  if (!panel || !dashboard) {
    return null;
  }
  if (!isOpen || !monitorTarget?.refId) {
    return undefined;
  }
  return (
    <Modal title="添加策略" isOpen={isOpen} onDismiss={() => onHideModal()} closeOnEscape>
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
        {realTarget.expressionList?.map((target, index) => (
          <div className={styles.target} key={index}>
            <span className={styles.targetRefId}>
              <svg width="20" height="20" className={styles.svgIcon} viewBox="0 0 1024 1024">
                <path d="M128 64v512a128 128 0 0 0 118.442667 127.658667L256 704h448v-128L1024 768l-320 192v-128H256A256 256 0 0 1 0.341333 588.8L0 576v-512h128z"></path>
              </svg>
            </span>
            <div className={styles.expressionContent}>
              {createCommonField('表达式', target.expression)}
              {createCommonField('函数', createFunctions(target.functions))}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={cx(styles.svgIcon, styles.deleteIcon)}
                onClick={() => deleteExpression(index)}
                overflow="hidden"
                width="20"
                height="20"
                viewBox="0 0 1024 1024"
              >
                <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zM670.4 625.1l-45.3 45.3L512 557.3 398.9 670.4l-45.3-45.3L466.7 512 353.6 398.9l45.3-45.3L512 466.7l113.1-113.1 45.3 45.3L557.3 512 670.4 625.1z"></path>
              </svg>
            </div>
          </div>
        ))}
        {realTarget.expressionList?.length && realTarget.expressionList.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '20px',
              color: '#EA3636',
              fontSize: '12px',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1024 1024"
              className={styles.svgIcon}
              width="20"
              height="20"
              style={{
                marginRight: '4px',
              }}
            >
              <path d="M512 64C264 64 64 264 64 512s200 448 448 448 448-200 448-448S760 64 512 64zM512 768c-27.2 0-48-20.8-48-48s20.8-48 48-48c27.2 0 48 20.8 48 48S539.2 768 512 768zM560 308.8L544 608c0 17.6-14.4 32-32 32-17.6 0-32-14.4-32-32l-16-299.2c0-1.6 0-3.2 0-4.8 0-27.2 20.8-48 48-48 27.2 0 48 20.8 48 48C560 305.6 560 307.2 560 308.8z"></path>
            </svg>
            配置告警策略仅支持单表达式
          </div>
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
                  <Tooltip placement="top" content={'去掉该变量后，对应的条件不生效'} theme="error">
                    <svg
                      className={cx(styles.svgIcon, styles.deleteVariableIcon)}
                      viewBox="0 0 1024 1024"
                      width={14}
                      height={14}
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      onClick={() => onDeleteVariable(name)}
                    >
                      <path d="M512 64C264 64 64 264 64 512s200 448 448 448 448-200 448-448S760 64 512 64z m224 480H288v-64h448v64z"></path>
                    </svg>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <Modal.ButtonRow>
          <Button onClick={() => onAddStrategy()} disabled={needDisabled}>
            确定
          </Button>
          <Button variant="secondary" fill="outline" onClick={() => onHideModal()}>
            取消
          </Button>
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
      width: fit-content;
      .monitor-variable-container {
        max-width: 408px;
      }
      .monitor-variable-text {
        min-width: 174px;
        text-align: left;
      }
      .gf-form-input {
        min-width: 208px;
      }
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
    svgIcon: css`
      width: 1em;
      height: 1em;
      margin: 0px 4px;
      overflow: hidden;
      vertical-align: middle;
      fill: currentcolor;
    `,
    expressionContent: css`
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      padding: 12px 0 4px 12px;
      background: #f5f7fa;
      flex-wrap: wrap;
      word-break: break-all;
      position: relative;
      :hover {
        background: #f0f1f5;
        cursor: pointer;
      }
      :hover svg {
        display: flex;
      }
    `,
    deleteIcon: css`
      color: #c4c6cc;
      font-size: 16px;
      margin-left: auto;
      margin-right: 12px;
      margin-top: -4px;
      display: none;
    `,
    deleteVariableIcon: css`
      color: #c4c6cc;
      font-size: 16px;
      margin-left: 12px;
      :hover {
        cursor: pointer;
        color: #ea3636;
      }
    `,
  };
};
