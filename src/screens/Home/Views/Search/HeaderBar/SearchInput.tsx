import { useCallback, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { StyleSheet, View } from 'react-native'
// import { StyleSheet } from 'react-native'
import Input, { type InputType, type InputProps } from '@/components/common/Input'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { TIDE_COLOR, TIDE_RADIUS, createThemedStyle } from '@/components/liquid/tide'
import { useI18n } from '@/lang'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

export interface SearchInputProps {
  onChangeText: (text: string) => void
  onSubmit: (text: string) => void
  onBlur: () => void
  onTouchStart: () => void
}

export interface SearchInputType {
  setText: (text: string) => void
  // getText: () => string
  focus: () => void
  blur: () => void
}

export default forwardRef<SearchInputType, SearchInputProps>(({ onChangeText, onSubmit, onBlur, onTouchStart }, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)

  useImperativeHandle(ref, () => ({
    // getText() {
    //   return text.trim()
    // },
    setText(text) {
      setText(text)
    },
    focus() {
      inputRef.current?.focus()
    },
    blur() {
      inputRef.current?.blur()
    },
  }))

  const handleChangeText = (text: string) => {
    setText(text)
    onChangeText(text.trim())
  }

  const handleClearText = useCallback(() => {
    setText('')
    onChangeText('')
    onSubmit('')
  }, [onChangeText, onSubmit])

  const handleSubmit = useCallback<NonNullable<InputProps['onSubmitEditing']>>(({ nativeEvent: { text } }) => {
    onSubmit(text)
  }, [onSubmit])

  return (
    <View style={[styles.wrap, styles.row, { backgroundColor: theme['c-primary-input-background'] }, isLiquidGlass(theme) && styles.tideInput]}>
      <Icon name="search-2" size={15} color={isLiquidGlass(theme) ? TIDE_COLOR.t3 : theme['c-font-label']} style={styles.icon} />
      <Input
        ref={inputRef}
        placeholder={t('search_input_placeholder')}
        value={text}
        onChangeText={handleChangeText}
        placeholderTextColor={isLiquidGlass(theme) ? TIDE_COLOR.t3 : theme['c-font-label']}
        onBlur={onBlur}
        onSubmitEditing={handleSubmit}
        onClearText={handleClearText}
        onTouchStart={onTouchStart}
        clearBtn
      />
    </View>
  )
})

const styles = createThemedStyle(() => (StyleSheet.create({
  tideInput: {
    borderRadius: TIDE_RADIUS.pill,
    backgroundColor: TIDE_COLOR.fillMid,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
  },
  wrap: {
    flexGrow: 1,
    flexShrink: 1,
    height: 36,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
  },
  icon: {
    marginRight: 6,
  },
})))
