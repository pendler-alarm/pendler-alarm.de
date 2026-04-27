export type LINK = {
    href: string;
    text?: string;
    noLink?: boolean;
    target?: string;
    rel?: string;
}
export type ItemProps = {
    inline: boolean;
    bold: boolean;
    show: boolean;
    label?: string | null;
    labelStyle?: StyledItemProps | null;
    labelProps?: Record<string, unknown> | null;
    value?: string | null;
    css?: string | null;
    text?: string | null;
    link?: LINK | null;
    seperator?: string;
    type?: string;
    emoji?: string;
}

export type StyledItemProps = {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
};
