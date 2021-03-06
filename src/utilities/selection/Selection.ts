import { IObjectWithKey, ISelection, SELECTION_CHANGE } from './interfaces';
import { EventGroup } from '../eventGroup/EventGroup';

export interface ISelectionOptions {
  onSelectionChanged?: () => void;
  getKey?: (item: IObjectWithKey, index?: number) => string;
  canSelectItem?: (item: IObjectWithKey) => boolean;
}

export class Selection implements ISelection {
  public count: number;
  public getKey: (item: IObjectWithKey, index?: number) => string;
  public canSelectItem: (item: IObjectWithKey) => boolean;

  private _changeEventSuppressionCount: number;
  private _items: IObjectWithKey[];
  private _selectedItems: IObjectWithKey[];
  private _isAllSelected: boolean;
  private _exemptedIndices: { [index: string]: boolean };
  private _exemptedCount: number;
  private _keyToIndexMap: { [key: string]: number };
  private _anchoredIndex: number;
  private _onSelectionChanged: () => void;
  private _hasChanged: boolean;
  private _unselectableIndices: { [index: string]: boolean };
  private _unselectableCount: number;

  constructor(options: ISelectionOptions = {}) {
    let {
      onSelectionChanged,
      getKey,
      canSelectItem = (item: IObjectWithKey) => { return true; }
    } = options;
    this.getKey = getKey || ((item: IObjectWithKey, index?: number) => (item ? item.key : String(index)));

    this._changeEventSuppressionCount = 0;
    this._exemptedCount = 0;
    this._anchoredIndex = 0;
    this._unselectableCount = 0;
    this.setItems([], true);

    this._onSelectionChanged = onSelectionChanged;
    this.canSelectItem = canSelectItem;
  }

  public setChangeEvents(isEnabled: boolean, suppressChange?: boolean) {
    this._changeEventSuppressionCount += isEnabled ? -1 : 1;

    if (this._changeEventSuppressionCount === 0 && this._hasChanged) {
      this._hasChanged = false;

      if (!suppressChange) {
        this._change();
      }
    }
  }

  /**
   * Selection needs the items, call this method to set them. If the set
   * of items is the same, this will re-evaluate selection and index maps.
   * Otherwise, shouldClear should be set to true, so that selection is
   * cleared.
   */
  public setItems(items: IObjectWithKey[], shouldClear = true) {
    let newKeyToIndexMap: { [key: string]: number } = {};
    let newUnselectableIndices: { [key: string]: boolean } = {};

    // Build lookup table for quick selection evaluation.
    for (let i = 0; i < items.length; i++) {
      let item = items[i];

      if (item) {
        newKeyToIndexMap[this.getKey(item, i)] = i;
      }

      newUnselectableIndices[i] = item && !this.canSelectItem(item);
      if (newUnselectableIndices[i]) {
        this._unselectableCount++;
      }
    }

    if (shouldClear) {
      this.setAllSelected(false);
    }

    // Check the exemption list for discrepencies.
    let newExemptedIndicies: { [key: string]: boolean } = {};

    for (let index in this._exemptedIndices) {
      if (this._exemptedIndices.hasOwnProperty(index)) {
        let item = this._items[index];
        let exemptKey = item ? this.getKey(item, Number(index)) : undefined;
        let newIndex = exemptKey ? newKeyToIndexMap[exemptKey] : index;

        if (newIndex === undefined) {
          // We don't know the index of the item any more so it's either moved or removed.
          // In this case we reset the entire selection.
          newExemptedIndicies = {};
          this._isAllSelected = false;
          this._exemptedCount = 0;
          break;
        } else {
          // We know the new index of the item. update the existing exemption table.
          newExemptedIndicies[newIndex] = true;
        }
      }
    }

    this._exemptedIndices = newExemptedIndicies;
    this._keyToIndexMap = newKeyToIndexMap;
    this._unselectableIndices = newUnselectableIndices;
    this._items = items || [];

    this._change();
  }

  public getItems(): IObjectWithKey[] {
    return this._items;
  }

  public getSelection(): IObjectWithKey[] {
    if (!this._selectedItems) {
      this._selectedItems = [];

      for (let i = 0; i < this._items.length; i++) {
        if (this.isIndexSelected(i)) {
          this._selectedItems.push(this._items[i]);
        }
      }
    }

    return this._selectedItems;
  }

  public getSelectedCount(): number {
    return this._isAllSelected ? (this._items.length - this._exemptedCount - this._unselectableCount) : (this._exemptedCount);
  }

  public isAllSelected(): boolean {
    return (
      (this.count > 0) &&
      (this._isAllSelected && this._exemptedCount === 0) ||
      (!this._isAllSelected && (this._exemptedCount === this._items.length - this._unselectableCount) && this._items.length > 0));
  }

  public isKeySelected(key: string): boolean {
    let index = this._keyToIndexMap[key];

    return this.isIndexSelected(index);
  }

  public isIndexSelected(index: number): boolean {
    return !!(
      (this.count > 0) &&
      (this._isAllSelected && !this._exemptedIndices[index] && !this._unselectableIndices[index]) ||
      (!this._isAllSelected && this._exemptedIndices[index]));
  }

  public setAllSelected(isAllSelected: boolean) {
    this._exemptedIndices = {};
    this._exemptedCount = 0;
    this._isAllSelected = isAllSelected;
    this._updateCount();
  }

  public setKeySelected(key: string, isSelected: boolean, shouldAnchor: boolean) {
    let index = this._keyToIndexMap[key];

    if (index >= 0) {
      this.setIndexSelected(index, isSelected, shouldAnchor);
    }
  }

  public setIndexSelected(index: number, isSelected: boolean, shouldAnchor: boolean) {
    // Clamp the index.
    index = Math.min(Math.max(0, index), this._items.length - 1);

    let isExempt = this._exemptedIndices[index];
    let hasChanged = false;
    let canSelect = !this._unselectableIndices[index];

    if (canSelect) {
      // Determine if we need to remove the exemption.
      if (isExempt && (
        (isSelected && this._isAllSelected) ||
        (!isSelected && !this._isAllSelected)
      )) {
        hasChanged = true;
        delete this._exemptedIndices[index];
        this._exemptedCount--;
      }

      // Determine if we need to add the exemption.
      if (!isExempt && (
        (isSelected && !this._isAllSelected) ||
        (!isSelected && this._isAllSelected)
      )) {
        hasChanged = true;
        this._exemptedIndices[index] = true;
        this._exemptedCount++;
      }

      if (shouldAnchor) {
        this._anchoredIndex = index;
      }
    }

    if (hasChanged) {
      this._updateCount();
    }
  }

  public selectToKey(key: string) {
    this.selectToIndex(this._keyToIndexMap[key]);
  }

  public selectToIndex(index: number) {
    let anchorIndex = this._anchoredIndex || 0;
    let startIndex = Math.min(index, anchorIndex);
    let endIndex = Math.max(index, anchorIndex);

    this.setChangeEvents(false);

    for (; startIndex <= endIndex; startIndex++) {
      this.setIndexSelected(startIndex, true, false);
    }

    this.setChangeEvents(true);
  }

  public toggleAllSelected() {
    this.setAllSelected(!this.isAllSelected());
  }

  public toggleKeySelected(key: string) {
    this.setKeySelected(key, !this.isKeySelected(key), true);
  }

  public toggleIndexSelected(index: number) {
    this.setIndexSelected(index, !this.isIndexSelected(index), true);
  }

  private _updateCount() {
    this.count = this.getSelectedCount();
    this._change();
  }

  private _change() {
    if (this._changeEventSuppressionCount === 0) {
      this._selectedItems = null;

      EventGroup.raise(this, SELECTION_CHANGE);

      if (this._onSelectionChanged) {
        this._onSelectionChanged();
      }
    } else {
      this._hasChanged = true;
    }
  }

}
