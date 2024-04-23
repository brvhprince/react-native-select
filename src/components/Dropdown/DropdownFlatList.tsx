/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import DropdownListItem from './DropdownListItem';
import { ItemSeparatorComponent, ListEmptyComponent } from '../Others';
import { TFlatList } from 'src/types/index.types';
const ITEM_HEIGHT = 45;

const DropdownFlatList = ({
  options,
  optionLabel,
  optionValue,
  isMultiple,
  isSearchable,
  selectedItems,
  selectedItem,
  handleMultipleSelections,
  handleSingleSelection,
  primaryColor,
  checkboxSize, // kept for backwards compatibility to be removed in future release
  checkboxStyle, // kept for backwards compatibility to be removed in future release
  checkboxLabelStyle, // kept for backwards compatibility to be removed  in future release
  checkboxComponentStyles,
  checkboxComponent,
  listComponentStyles,
  listIndex,
  emptyListMessage,
  ...rest
}: any) => {
  const flatlistRef = useRef<FlatList<TFlatList>>(null);

  const scrollToItem = useCallback(
    (index: number) => {
      // check if options is populated before calling scrollToIndex
      if (!options || options.length === 0) {
        return;
      }

      // check if index is within bounds of options
      if (index < 0 || index > options.length - 1) {
        return;
      }

      try {
        setTimeout(() => {
          flatlistRef.current?.scrollToIndex({
            index,
            animated: true,
          });
        }, 500);
      } catch (e) {
        // console.log('scrollToItem error', e);
      }
    },
    [options]
  );
  useEffect(() => {
    if (listIndex.itemIndex >= 0) {
      scrollToItem(listIndex.itemIndex);
    }
  }, [listIndex, scrollToItem]);

  return (
    <FlatList
      data={options}
      extraData={isMultiple ? selectedItems : selectedItem}
      initialNumToRender={5}
      ListEmptyComponent={
        <ListEmptyComponent
          listEmptyComponentStyle={listComponentStyles?.listEmptyComponentStyle}
          emptyListMessage={emptyListMessage}
        />
      }
      contentContainerStyle={[
        isSearchable ? { paddingTop: 0 } : styles.contentContainerStyle,
      ]}
      ItemSeparatorComponent={() => (
        <ItemSeparatorComponent
          itemSeparatorStyle={listComponentStyles?.itemSeparatorStyle}
        />
      )}
      renderItem={(item) =>
        _renderItem(item, {
          optionLabel,
          optionValue,
          isMultiple,
          selectedOption: isMultiple ? selectedItems : selectedItem,
          onChange: isMultiple
            ? handleMultipleSelections
            : handleSingleSelection,
          scrollToItem,
          primaryColor,
          checkboxSize, // kept for backwards compatibility
          checkboxStyle, // kept for backwards compatibility
          checkboxLabelStyle, // kept for backwards compatibility
          checkboxComponentStyles,
          checkboxComponent,
        })
      }
      keyExtractor={(_item, index) => `Options${index}`}
      ref={flatlistRef}
      getItemLayout={(_data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      // onScrollToIndexFailed={({ index }) => {
      //   //  stale closure that's referring to the old state causing app to crash without try catch in scrollToItem
      //   setTimeout(() => {
      //     scrollToItem(index);
      //   }, 500);
      // }}
      {...rest}
    />
  );
};

const _renderItem = ({ item }: any, props: any) => {
  return (
    <DropdownListItem
      item={item}
      optionLabel={props.optionLabel}
      optionValue={props.optionValue}
      isMultiple={props.isMultiple}
      selectedOption={props.selectedOption}
      onChange={props.onChange}
      primaryColor={props.primaryColor}
      checkboxSize={props.checkboxSize}
      checkboxStyle={props.checkboxStyle}
      checkboxLabelStyle={props.checkboxLabelStyle}
      scrollToItem={props.scrollToItem}
      checkboxComponentStyles={props.checkboxComponentStyles}
      checkboxComponent={props.checkboxComponent}
    />
  );
};

const styles = StyleSheet.create({
  contentContainerStyle: { paddingTop: 20 },
});

export default DropdownFlatList;
