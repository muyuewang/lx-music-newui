import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'

// import { useGetter, useDispatch } from '@/store'
// import Tag from './Tag'
// import OpenList from './OpenList'
import { createStyle } from '@/utils/tools'
// import { BorderWidths } from '@/theme'
import SourceSelector, {
  type SourceSelectorType,
} from './SourceSelector'
import { useTheme } from '@/store/theme/hook'
// import { BorderWidths } from '@/theme'
import ActiveListName, { type ActiveListNameType } from './ActiveListName'
import { BorderWidths } from '@/theme'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE } from '@/components/liquid/tide'

export interface HeaderBarProps {
  onShowBound: () => void
  onSourceChange: (source: LX.OnlineSource) => void
}

export interface HeaderBarType {
  setBound: (source: LX.OnlineSource, id: string, name: string) => void
}


export default forwardRef<HeaderBarType, HeaderBarProps>(({ onShowBound, onSourceChange }, ref) => {
  const activeListNameRef = useRef<ActiveListNameType>(null)
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setBound(source, id, name) {
      sourceSelectorRef.current?.setSource(source)
      activeListNameRef.current?.setBound(id, name)
    },
  }), [])


  return (
    <View style={[styles.currentList, { borderBottomColor: theme['c-border-background'] }, theme.id === 'liquid_glass' && styles.tideHeader]}>
      <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
      <ActiveListName ref={activeListNameRef} onShowBound={onShowBound} />
    </View>
  )
})

const styles = createStyle({
  tideHeader: {
    height: 44,
    marginHorizontal: TIDE_SPACE.row,
    marginVertical: TIDE_SPACE.row,
    borderBottomWidth: 1,
    borderWidth: 1,
    borderRadius: TIDE_RADIUS.md,
    borderColor: TIDE_COLOR.edgeSoft,
    borderBottomColor: TIDE_COLOR.edgeSoft,
    backgroundColor: TIDE_COLOR.fillMid,
  },
  currentList: {
    flexDirection: 'row',
    height: 38,
    zIndex: 2,
    // paddingRight: 10,
    borderBottomWidth: BorderWidths.normal,
  },
  selector: {
    width: 86,
  },
})
