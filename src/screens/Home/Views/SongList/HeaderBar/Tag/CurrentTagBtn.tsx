import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { useTheme } from '@/store/theme/hook'
import { TIDE_COLOR, TIDE_RADIUS } from '@/components/liquid/tide'


export interface CurrentTagBtnProps {
  onShowList: () => void
}

export interface CurrentTagBtnType {
  setCurrentTagInfo: (name: string) => void
}

export default forwardRef<CurrentTagBtnType, CurrentTagBtnProps>(({ onShowList }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const [name, setName] = useState('')

  useImperativeHandle(ref, () => ({
    setCurrentTagInfo(name) {
      if (!name) name = t('songlist_tag_default')
      setName(name)
    },
  }))

  return (
    <Button style={[styles.btn, theme.id === 'liquid_glass' && styles.tideButton]} onPress={onShowList}>
      <Text style={styles.sourceMenu}>{name}</Text>
    </Button>
  )
})


const styles = createStyle({
  tideButton: {
    borderRadius: TIDE_RADIUS.pill,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    backgroundColor: TIDE_COLOR.fillMid,
    marginVertical: 4,
    overflow: 'hidden',
  },
  btn: {
    paddingLeft: 15,
    paddingRight: 15,
    justifyContent: 'center',
  },
  sourceMenu: {
    // height: 38,
    // lineHeight: 38,
    textAlign: 'center',
    // minWidth: 70,
    // paddingTop: 10,
    // paddingBottom: 10,
  },
})
