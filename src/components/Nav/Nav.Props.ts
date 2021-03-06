import * as React from 'react';

export interface INavProps {
  /**
   * A collection of link groups to display in the navigation bar
   */
  groups: INavLinkGroup[];

  /**
   * Used to customize how content inside the link tag is rendered
   * @defaultvalue Default link rendering
   */
  onRenderLink?: Function;

  /**
   * Function callback invoked when a link in the navigation is clicked
   */
  onLinkClick?: (ev?: React.MouseEvent) => void;

  /**
   * Indicates whether the navigation component renders on top of other content in the UI
   */
  isOnTop?: boolean;
}

export interface INavLinkGroup {
  /**
   * Text to render as the header of a group
   */
  name?: string;

  /**
   * Links to render within this group
   */
  links: INavLink[];

  /**
   *  (Optional) The name to use for functional automation tests
   **/
  automationId?: string;
}

export interface INavLink {
  /**
   * Text to render for this link
   */
  name: string;

  /**
   * URL to navigate to for this link
   */
  url: string;

  /**
   * Child links to this link, if any
   */
  links?: INavLink[];

  /** (Optional) icon */
  iconClassName?: string;

  /**
   * (Optional) The name of the item to be used in logging engagement data
   */
  engagementName?: string;

  /**
  * (Optional) The alt text for the item
  **/
  altText?: string;

  /**
   *  (Optional) The name to use for functional automation tests
   **/
  automationId?: string;

  /** (Optional) Whether or not the link is in an expanded state */
  isExpanded?: boolean;

  /**
   * (Optional) Aria label for nav link
   */
  ariaLabel?: string;

  /**
   * (Optional) Meta info for the link, does not involving rendering.
   */
  key?: string;

  /**
   * (Optional) title for tooltip or description
   */
  title?: string;

  /**
   * (Optional) Link <a> target.
   */
  target?: string;

  /**
   * Any additional properties to apply to the rendered links.
   */
  [propertyName: string]: any;
}
