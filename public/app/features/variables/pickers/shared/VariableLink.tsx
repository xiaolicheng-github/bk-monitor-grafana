import { css, cx } from '@emotion/css';
import React, { MouseEvent, useCallback } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Icon, useStyles2 } from '@grafana/ui';
import { LoadingIndicator } from '@grafana/ui/src/components/PanelChrome/LoadingIndicator';
import { t } from 'app/core/internationalization';

import { ALL_VARIABLE_TEXT } from '../../constants';

interface Props {
  onClick: () => void;
  text: string;
  loading: boolean;
  onCancel?: () => void;
  disabled?: boolean;
  /**
   *  htmlFor, needed for the label
   */
  id: string;
}

export const VariableLink = ({ loading, disabled, onClick: propsOnClick, text, onCancel, id }: Props) => {
  const styles = useStyles2(getStyles);
  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      propsOnClick();
    },
    [propsOnClick]
  );

  if (loading) {
    return (
      <div
        className={cx(styles.container, 'monitor-variable-container')}
        data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${text}`)}
        title={text}
        id={id}
      >
        <VariableLinkText text={text} />
        <LoadingIndicator loading onCancel={onCancel!} />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cx(styles.container, 'monitor-variable-container')}
      data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${text}`)}
      aria-expanded={false}
      aria-controls={`options-${id}`}
      id={id}
      title={text}
      disabled={disabled}
    >
      <VariableLinkText text={text} />
      <Icon aria-hidden name="angle-down" size="sm" />
    </button>
  );
};

interface VariableLinkTextProps {
  text: string;
}

const VariableLinkText = ({ text }: VariableLinkTextProps) => {
  const styles = useStyles2(getStyles);
  return (
    <span className={cx(styles.textAndTags, 'monitor-variable-text')}>
      {text === ALL_VARIABLE_TEXT ? t('variable.picker.link-all', 'All') : text}
    </span>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    max-width: 480px;
    padding-right: 10px;
    padding: 0 ${theme.spacing(1)};
    background-color: ${theme.components.input.background};
    border: 1px solid ${theme.components.input.borderColor};
    border-radius: ${theme.shape.radius.default};
    display: flex;
    align-items: center;
    color: ${theme.colors.text};
    height: ${theme.spacing(theme.components.height.md)};

    .label-tag {
      margin: 0 5px;
    }

    &:disabled {
      background-color: ${theme.colors.action.disabledBackground};
      color: ${theme.colors.action.disabledText};
      border: 1px solid ${theme.colors.action.disabledBackground};
    }
  `,
  textAndTags: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: ${theme.spacing(0.25)};
    user-select: none;
  `,
});
