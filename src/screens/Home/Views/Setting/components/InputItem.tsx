import { memo, useState, useEffect, useRef } from 'react'

import { StyleSheet, View, Keyboard } from 'react-native'
import type { InputType, InputProps } from '@/components/common/Input'
import Input from '@/components/common/Input'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'


export interface InputItemProps extends InputProps {
  value: string
  label: string
  onChanged: (text: string, callback: (vlaue: string) => void) => void
}

export default memo(({ value, label, onChanged, style, ...props }: InputItemProps) => {
  const [text, setText] = useState(value)
  const textRef = useRef(value)
  const isMountRef = useRef(false)
  const inputRef = useRef<InputType>(null)
  const theme = useTheme()
  const isLiquid = isLiquidGlass(theme)
  const saveValue = () => {
    onChanged?.(text, (value: string) => {
      if (!isMountRef.current) return
      const newValue = String(value)
      setText(newValue)
      textRef.current = newValue
    })
  }
  useEffect(() => {
    isMountRef.current = true
    return () => {
      isMountRef.current = false
    }
  }, [])
  useEffect(() => {
    const handleKeyboardDidHide = () => {
      if (!inputRef.current?.isFocused()) return
      onChanged?.(textRef.current, value => {
        if (!isMountRef.current) return
        const newValue = String(value)
        setText(newValue)
        textRef.current = newValue
      })
    }
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', handleKeyboardDidHide)

    return () => {
      keyboardDidHide.remove()
    }
  }, [onChanged])
  useEffect(() => {
    if (value != text) {
      const newValue = String(value)
      setText(newValue)
      textRef.current = newValue
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const handleSetSelectMode = (text: string) => {
    setText(text)
    textRef.current = text
  }
  return (
    <View style={isLiquid ? styles.tideContainer : styles.container}>
      <Text style={[styles.label, isLiquid && styles.tideLabel]} size={isLiquid ? TIDE_TYPE.body.size : 14} color={isLiquid ? TIDE_COLOR.t2 : theme['c-font']}>{label}</Text>
      <Input
        value={text}
        ref={inputRef}
        onChangeText={handleSetSelectMode}
        {...props}
        style={[styles.input, { backgroundColor: theme['c-primary-input-background'] }, isLiquid && styles.tideInput, style]}
        onBlur={saveValue}
       />
    </View>
  )
})

const styles = createThemedStyle(() => (StyleSheet.create({
  tideContainer: {
    marginVertical: TIDE_SPACE.row,
  },
  tideLabel: {
    ...TIDE_TYPE.body.style,
    marginBottom: TIDE_SPACE.row,
  },
  tideInput: {
    minHeight: 44,
    maxWidth: 420,
    paddingHorizontal: TIDE_SPACE.row * 2,
    borderRadius: TIDE_RADIUS.sm,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    backgroundColor: TIDE_COLOR.fillMid,
    color: TIDE_COLOR.t1,
  },
  container: {
    paddingLeft: 25,
    marginBottom: 15,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: 4,
    // paddingTop: 3,
    // paddingBottom: 3,
    maxWidth: 300,
  },
})))
