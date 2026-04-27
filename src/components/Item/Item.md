# documentation of item component

## properties
* text - the text to display
* label - the label to display
* labelStyle - the style of the label (e.g. { bold: true, italic: true, underline: true })
* separator - the separator to display between the text and the label
* link - the link to display (object with href and text properties)
* emoji - the emoji to display before the text
* css - the css class to apply to the item


## usage

* label-value: `<Item text="someText" label="someLabel" />`
* text only: `<Item text="someText" />`
* label from type: `<Item label="someLabel" type="connection" />`
* label with i18n: `<Item label="some.label" type="connection" i18n />`

```vue
<Item text="someText" label="someLabel" labelStyle="{ bold: true }" separator=" - " link="{ href: 'https://example.com', text: 'example' }" emoji="🚗" css="foobar" />
```

with variables
```vue
<Item :text="someText" :label="someLabel" :labelStyle="{ bold: true }" separator=" - " :link="{ href: 'https://example.com', text: 'example' }" emoji="🚗" css="foobar" />
```