export type ItemProps = {
    show: boolean;
    label?: string | null;
    labelStyle?: StyledItemProps | null;
    value?: string | null;
    seperator?: string;
    type?: string;
}

export type StyledItemProps = {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
};
