import React, { PureComponent } from 'react';

import { LoadingState, VariableOption, VariableWithMultiSupport, VariableWithOptions } from '@grafana/data';
import { ClickOutsideWrapper } from '@grafana/ui';
import { applyStateChanges } from 'app/core/utils/applyStateChanges';

import { ALL_VARIABLE_VALUE, VARIABLE_PREFIX } from '../../variables/constants';
import {
  selectAllOptions,
  updateAllSelection,
  updateDefaultSelection,
  updateOptions,
} from '../../variables/pickers/OptionsPicker/reducer';
import { VariableInput } from '../../variables/pickers/shared/VariableInput';
import { VariableLink } from '../../variables/pickers/shared/VariableLink';
import VariableOptions from '../../variables/pickers/shared/VariableOptions';

import { MonitorVariableState } from './monitor-strategy';
type Props = {
  variable: VariableWithOptions | VariableWithMultiSupport;
  variableState: MonitorVariableState;
  updateVariableState: (picker: MonitorVariableState) => void;
};
type State = {
  inputRect: DOMRect | undefined;
};
export default class MonitorVariablePicker extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      inputRect: undefined,
    };
  }

  onShowOptions = () => {
    this.props.updateVariableState({
      ...this.props.variableState,
      showOption: true,
    });
  };

  onHideOptions = () => {
    this.props.updateVariableState({
      ...this.props.variableState,
      showOption: false,
    });
  };
  onToggleOption = (option: VariableOption, clearOthers: boolean) => {
    const { variableState, updateVariableState } = this.props;
    if (option) {
      const selected = !variableState.selectedValues.find((o) => o.value === option.value && o.text === option.text);
      if (option.value === ALL_VARIABLE_VALUE || !variableState.multi || clearOthers) {
        if (selected) {
          variableState.selectedValues = [{ ...option, selected: true }];
        } else {
          variableState.selectedValues = [];
        }
        updateVariableState({
          ...applyStateChanges(variableState, updateDefaultSelection, updateAllSelection, updateOptions),
          showOption: !!variableState.multi,
        });
        return;
      }
      if (selected) {
        variableState.selectedValues.push({ ...option, selected: true });
        updateVariableState({
          ...applyStateChanges(variableState, updateDefaultSelection, updateAllSelection, updateOptions),
          showOption: !!variableState.multi,
        });
        return;
      }
      variableState.selectedValues = variableState.selectedValues.filter(
        (o) => o.value !== option.value && o.text !== option.text
      );
    } else {
      variableState.selectedValues = [];
    }
    updateVariableState({
      ...applyStateChanges(variableState, updateDefaultSelection, updateAllSelection, updateOptions),
      showOption: !!variableState.multi,
    });
  };

  onToggleAllOptions = () => {
    debugger;
    // Check if 'All' option is configured by the user and if it's selected in the dropdown
    const { variableState, updateVariableState } = this.props;
    const isAllSelected = variableState.selectedValues.find((option) => option.value === ALL_VARIABLE_VALUE);
    const allOptionConfigured = variableState.options.find((option) => option.value === ALL_VARIABLE_VALUE);

    // If 'All' option is not selected from the dropdown, but some options are, clear all options and select 'All'
    if (variableState.selectedValues.length > 0 && !!allOptionConfigured && !isAllSelected) {
      variableState.selectedValues = [];

      variableState.selectedValues.push({
        text: allOptionConfigured.text ?? 'All',
        value: allOptionConfigured.value,
        selected: true,
      });
      updateVariableState({
        ...applyStateChanges(variableState, updateOptions),
        showOption: !!variableState.multi,
      });
      return;
    }

    // If 'All' option is the only one selected in the dropdown, unselect "All" and select each one of the other options.
    if (isAllSelected && variableState.selectedValues.length === 1) {
      variableState.selectedValues = selectAllOptions(variableState.options);
      updateVariableState({
        ...applyStateChanges(variableState, updateOptions),
        showOption: !!variableState.multi,
      });
      return;
    }

    // If some options are selected, but 'All' is not configured by the user, clear the selection and let the
    // current behavior when "All" does not exist and user clear the selected items.
    if (variableState.selectedValues.length > 0 && !allOptionConfigured) {
      variableState.selectedValues = [];
      updateVariableState({
        ...applyStateChanges(variableState, updateOptions),
        showOption: !!variableState.multi,
      });
      return;
    }

    // If no options are selected and 'All' is not selected, select all options
    variableState.selectedValues = selectAllOptions(variableState.options);
    updateVariableState({
      ...applyStateChanges(variableState, updateOptions),
      showOption: !!variableState.multi,
    });
    return;
  };

  onFilterOrSearchOptions = (filter: string) => {
    this.props.updateVariableState({
      ...this.props.variableState,
      queryValue: filter,
    });
  };
  handleRectChange = (rect: DOMRect) => {
    this.setState({ inputRect: rect });
  };
  render() {
    return (
      <div className="variable-link-wrapper">
        {this.props.variableState.showOption ? this.renderOptions() : this.renderLink()}
      </div>
    );
  }

  renderLink() {
    const { current, state } = this.props.variable;
    const loading = state === LoadingState.Loading;
    let text = '';
    if (this.props.variableState.selectedValues?.length > 0) {
      text = this.props.variableState.selectedValues?.map((item) => item.text).join('+');
    } else {
      text = typeof current.text === 'string' ? current.text : current.text.join('+');
    }
    return (
      <VariableLink
        id={VARIABLE_PREFIX + this.props.variable.id}
        text={text}
        onClick={this.onShowOptions}
        loading={loading}
        disabled={false}
      />
    );
  }

  renderOptions() {
    const { id } = this.props.variable;
    return (
      <ClickOutsideWrapper onClick={this.onHideOptions}>
        <VariableInput
          onRectChange={this.handleRectChange}
          id={VARIABLE_PREFIX + id}
          value={this.props.variableState.queryValue}
          onChange={this.onFilterOrSearchOptions}
          aria-expanded={true}
          aria-controls={`options-${id}`}
        />
        <VariableOptions
          fixedPosition={this.state.inputRect}
          values={this.props.variableState.options.filter(
            (option) =>
              option.text.toString().toLowerCase().includes(this.props.variableState.queryValue.toLowerCase()) ||
              option.value.toString().toLowerCase().includes(this.props.variableState.queryValue.toLowerCase())
          )}
          onToggle={this.onToggleOption}
          onToggleAll={this.onToggleAllOptions}
          highlightIndex={this.props.variableState.highlightIndex}
          multi={this.props.variableState.multi}
          selectedValues={this.props.variableState.selectedValues}
          id={`options-${id}`}
        />
      </ClickOutsideWrapper>
    );
  }
}
