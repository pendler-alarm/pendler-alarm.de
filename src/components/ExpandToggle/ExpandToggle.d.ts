export type ExpandToggleProps = {
  expanded?: boolean;
  initialExpanded?: boolean;
  targetId: string;
  groupId?: string | null;
  groupMode?: 'independent' | 'accordion';
  collapsedLabelKey?: string | null;
  expandedLabelKey?: string | null;
  collapsedIcon?: string;
  expandedIcon?: string;
  ariaLabelKey?: string | null;
  interactive?: boolean;
  labelMode?: 'emoji' | 'text+emoji';
  surfaceMode?: 'button' | 'plain';
  dimension?: number | string;
};

export type ExpandGroupMode = NonNullable<ExpandToggleProps['groupMode']>;

export type ExpandController = {
  groupId: string | null;
  groupMode: ExpandGroupMode;
  rootElement: Ref<HTMLElement | null>;
  setExpandedState: (expanded: boolean) => void;
  targetId: string;
};