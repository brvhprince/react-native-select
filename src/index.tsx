import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Input from './components/Input';
import CheckBox from './components/CheckBox';
import Dropdown from './components/Dropdown/Dropdown';
import DropdownFlatList from './components/Dropdown/DropdownFlatList';
import DropdownSectionList from './components/Dropdown/DropdownSectionList';
import CustomModal from './components/CustomModal';
import { colors } from './styles/colors';
import { DEFAULT_OPTION_LABEL, DEFAULT_OPTION_VALUE } from './constants';
import type {
  DropdownProps,
  TFlatList,
  TFlatListItem,
  TSectionList,
  TSectionListItem,
} from './types/index.types';
import {
  extractPropertyFromArray,
  getMaxLengthOfSectionListProperty,
} from './utils';

export const DropdownSelect: React.FC<DropdownProps> = ({
  placeholder,
  label,
  error,
  helperText,
  options,
  optionLabel,
  optionValue,
  onValueChange,
  selectedValue,
  isMultiple,
  isSearchable,
  dropdownIcon,
  labelStyle,
  placeholderStyle,
  dropdownStyle,
  dropdownIconStyle,
  dropdownContainerStyle,
  dropdownErrorStyle,
  dropdownErrorTextStyle,
  dropdownHelperTextStyle,
  selectedItemStyle,
  multipleSelectedItemStyle,
  modalBackgroundStyle,
  modalOptionsContainerStyle,
  searchInputStyle,
  primaryColor,
  disabled,
  checkboxSize, // kept for backwards compatibility
  checkboxStyle, // kept for backwards compatibility
  checkboxLabelStyle, // kept for backwards compatibility
  checkboxComponentStyles,
  checkboxComponent,
  listHeaderComponent,
  listFooterComponent,
  listComponentStyles,
  modalProps,
  hideModal = false,
  listControls,
  ...rest
}) => {
  const [newOptions, setNewOptions] = useState<TFlatList | TSectionList>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<any>(''); // for single selection
  const [selectedItems, setSelectedItems] = useState<any[]>([]); // for multiple selection
  const [searchValue, setSearchValue] = useState<string>('');
  const [listIndex, setListIndex] = useState<{
    sectionIndex?: number;
    itemIndex: number;
  }>({ itemIndex: 0 }); // for scrollToIndex in Sectionlist and Flatlist

  useEffect(() => {
    if (options) {
      setNewOptions(options);
    }
    return () => {};
  }, [options]);

  useEffect(() => {
    isMultiple
      ? setSelectedItems(Array.isArray(selectedValue) ? selectedValue : [])
      : setSelectedItem(selectedValue);

    return () => {};
  }, [selectedValue, isMultiple, onValueChange]);

  /*===========================================
   * List type
   *==========================================*/

  const isSectionList = newOptions.some(
    (item) => item.title && item.data && Array.isArray(item.data)
  );

  const ListTypeComponent = isSectionList
    ? DropdownSectionList
    : DropdownFlatList;
  const modifiedSectionData = extractPropertyFromArray(
    newOptions,
    'data'
  ).flat();
  const modifiedOptions = isSectionList ? modifiedSectionData : newOptions;

  const optLabel = optionLabel || DEFAULT_OPTION_LABEL;
  const optValue = optionValue || DEFAULT_OPTION_VALUE;
  const optionsCopy = JSON.parse(JSON.stringify(options)); //copy of the original options array

  /*===========================================
   * Selection handlers
   *==========================================*/
  const handleSingleSelection = (value: string | number) => {
    if (selectedItem === value) {
      setSelectedItem(null);
      onValueChange(null); //send value to parent
    } else {
      setSelectedItem(value);
      onValueChange(value); //send value to parent
      setOpen(false); //close modal upon selection
    }
  };

  const handleMultipleSelections = (value: string[] | number[]) => {
    setSelectedItems((prevVal) => {
      let selectedValues = [...prevVal];

      if (selectedValues?.includes(value)) {
        selectedValues = selectedValues.filter((item) => item !== value);
      } else {
        selectedValues.push(value);
      }
      onValueChange(selectedValues); //send value to parent
      return selectedValues;
    });
  };

  const handleSelectAll = () => {
    setSelectAll((prevVal) => {
      const selectedValues = [];

      //don't select disabled items
      const filteredOptions = modifiedOptions.filter(
        (item: TFlatListItem) => !item.disabled
      );

      if (!prevVal) {
        for (let i = 0; i < filteredOptions.length; i++) {
          selectedValues.push(filteredOptions[i][optValue]);
        }
      }

      setSelectedItems(selectedValues);
      onValueChange(selectedValues); //send value to parent
      return !prevVal;
    });

    if (
      typeof listControls?.selectAllCallback === 'function' &&
      !selectAll
    ) {
      listControls.selectAllCallback();
    }

    if (
      typeof listControls?.unselectAllCallback === 'function' &&
      selectAll
    ) {
      listControls.unselectAllCallback();
    }
  };

  /*===========================================
   * Handle side effects
   *==========================================*/
  const checkSelectAll = useCallback(
    (selectedValues: any[]) => {
      //if the list contains disabled values, those values will not be selected
      if (
        modifiedOptions.filter((item: TFlatListItem) => !item.disabled)
          .length === selectedValues.length
      ) {
        setSelectAll(true);
      } else {
        setSelectAll(false);
      }
    },
    [modifiedOptions]
  );

  // anytime the selected items change, check if it is time to set `selectAll` to true
  useEffect(() => {
    if (isMultiple) {
      checkSelectAll(selectedItems);
    }
    return () => {};
  }, [checkSelectAll, isMultiple, selectedItems]);

  /*===========================================
   * Get label handler
   *==========================================*/
  const getSelectedItemsLabel = () => {
    if (isMultiple && Array.isArray(selectedItems)) {
      let selectedLabels: Array<string> = [];

      selectedItems?.forEach((element: number | string) => {
        let selectedItemLabel = modifiedOptions?.find(
          (item: TFlatListItem) => item[optValue] === element
        )?.[optLabel];
        selectedLabels.push(selectedItemLabel);
      });
      return selectedLabels;
    }

    let selectedItemLabel = modifiedOptions?.find(
      (item: TFlatListItem) => item[optValue] === selectedItem
    );
    return selectedItemLabel?.[optLabel];
  };

  /*===========================================
   * Search
   *==========================================*/
  const onSearch = (value: string) => {
    setSearchValue(value);

    let searchText = value.toString().toLocaleLowerCase().trim();

    const regexFilter = new RegExp(searchText, 'i');

    //Because Search mutates the initial state, we have to search with a copy of the original array
    const searchResults = isSectionList
      ? searchSectionList(optionsCopy as TSectionList, regexFilter)
      : searchFlatList(optionsCopy as TFlatList, regexFilter);

    setNewOptions(searchResults);
  };

  const searchFlatList = (flatList: TFlatList, regexFilter: RegExp) => {
    const searchResults = flatList.filter((item: TFlatListItem) => {
      if (
        item[optLabel].toString().toLowerCase().search(regexFilter) !== -1 ||
        item[optValue].toString().toLowerCase().search(regexFilter) !== -1
      ) {
        return item;
      }
      return;
    });
    return searchResults;
  };

  const searchSectionList = (
    sectionList: TSectionList,
    regexFilter: RegExp
  ) => {
    const searchResults = sectionList.map((listItem: TSectionListItem) => {
      listItem.data = listItem.data.filter((item: TFlatListItem) => {
        if (
          item[optLabel].toString().toLowerCase().search(regexFilter) !== -1 ||
          item[optValue].toString().toLowerCase().search(regexFilter) !== -1
        ) {
          return listItem.data.push(item);
        }
        return;
      });

      return listItem;
    });

    return searchResults;
  };

  /*===========================================
   * Modal
   *==========================================*/
  const handleToggleModal = () => {
    setOpen(!open);
    setSearchValue('');
    setNewOptions(options);
    setListIndex({ itemIndex: 0, sectionIndex: 0 });
  };

  useEffect(() => {
    if (hideModal) {
      setOpen(false);
    }
    return () => {};
  }, [hideModal]);

  let primary = primaryColor || colors.gray;

  const sectionListMaxLength = getMaxLengthOfSectionListProperty(
    newOptions as TSectionList,
    'data'
  );

  const listIsEmpty = isSectionList
    ? sectionListMaxLength > 1
    : newOptions.length > 1;

  /*===========================================
   * setIndexOfSelectedItem - For ScrollToIndex
   *==========================================*/
  const setIndexOfSelectedItem = (selectedLabel: string) => {
    isSectionList
      ? optionsCopy.map((item: TSectionListItem, sectionIndex: number) => {
          item.data?.find((dataItem: TFlatListItem, itemIndex: number) => {
            if (dataItem[optLabel] === selectedLabel) {
              setListIndex({ sectionIndex, itemIndex });
            }
          });
        })
      : optionsCopy?.find((item: TFlatListItem, itemIndex: number) => {
          if (item[optLabel] === selectedLabel) {
            setListIndex({ itemIndex });
          }
        });
  };

  return (
    <>
      <Dropdown
        label={label}
        placeholder={placeholder}
        helperText={helperText}
        error={error}
        getSelectedItemsLabel={getSelectedItemsLabel}
        selectedItem={selectedItem}
        selectedItems={selectedItems}
        handleToggleModal={handleToggleModal}
        labelStyle={labelStyle}
        dropdownIcon={dropdownIcon}
        dropdownStyle={dropdownStyle}
        dropdownIconStyle={dropdownIconStyle}
        dropdownContainerStyle={dropdownContainerStyle}
        dropdownErrorStyle={dropdownErrorStyle}
        dropdownErrorTextStyle={dropdownErrorTextStyle}
        dropdownHelperTextStyle={dropdownHelperTextStyle}
        selectedItemStyle={selectedItemStyle}
        multipleSelectedItemStyle={multipleSelectedItemStyle}
        isMultiple={isMultiple}
        primaryColor={primary}
        disabled={disabled}
        placeholderStyle={placeholderStyle}
        setIndexOfSelectedItem={setIndexOfSelectedItem}
        {...rest}
      />
      <CustomModal
        open={open}
        handleToggleModal={handleToggleModal}
        modalBackgroundStyle={modalBackgroundStyle}
        modalOptionsContainerStyle={modalOptionsContainerStyle}
        onRequestClose={() => {}}
        modalProps={modalProps}
      >
        <ListTypeComponent
          ListHeaderComponent={
            <>
              {isSearchable && (
                <Input
                  value={searchValue}
                  onChangeText={(text: string) => onSearch(text)}
                  style={searchInputStyle}
                  primaryColor={primary}
                />
              )}
              {listHeaderComponent}
              {isMultiple && listIsEmpty && (
                <View style={styles.optionsContainerStyle}>
                  <TouchableOpacity onPress={() => {}}>
                    <CheckBox
                      value={selectAll}
                      label={
                        selectAll
                          ? listControls?.unselectAllText || 'Clear all'
                          : listControls?.selectAllText || 'Select all'
                      }
                      onChange={() => handleSelectAll()}
                      primaryColor={primary}
                      checkboxSize={checkboxSize}
                      checkboxStyle={checkboxStyle}
                      checkboxLabelStyle={checkboxLabelStyle}
                      checkboxComponentStyles={checkboxComponentStyles}
                      checkboxComponent={checkboxComponent}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          ListFooterComponent={listFooterComponent}
          listComponentStyles={listComponentStyles}
          options={newOptions}
          optionLabel={optLabel}
          optionValue={optValue}
          isMultiple={isMultiple}
          isSearchable={isSearchable}
          selectedItems={selectedItems}
          selectedItem={selectedItem}
          handleMultipleSelections={handleMultipleSelections}
          handleSingleSelection={handleSingleSelection}
          primaryColor={primary}
          checkboxSize={checkboxSize}
          checkboxStyle={checkboxStyle}
          checkboxLabelStyle={checkboxLabelStyle}
          checkboxComponentStyles={checkboxComponentStyles}
          checkboxComponent={checkboxComponent}
          listIndex={listIndex}
        />
      </CustomModal>
    </>
  );
};

const styles = StyleSheet.create({
  optionsContainerStyle: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
  },
});

export default DropdownSelect;
