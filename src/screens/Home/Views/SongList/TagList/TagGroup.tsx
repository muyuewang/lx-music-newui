import { View } from 'react-native'

import Button from '@/components/common/Button'
import { type TagInfoItem } from '@/store/songlist/state'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE } from '@/components/liquid/tide'

export interface TagGroupProps {
  name: string
  list: TagInfoItem[]
  onTagChange: (name: string, id: string) => void
  activeId: string
}

export default ({ name, list, onTagChange, activeId }: TagGroupProps) => {
  const theme = useTheme()
  return (
    <View>
      {
        name
          ? <Text style={styles.tagTypeTitle} color={theme['c-font-label']}>{name}</Text>
          : null
      }
      <View style={styles.tagTypeList}>
        {list.map(item => (
          activeId == item.id
            ? (
                <View style={[styles.tagButton, { backgroundColor: theme['c-button-background'] }, theme.id === 'liquid_glass' && styles.tideTag, theme.id === 'liquid_glass' && activeId == item.id && styles.tideActive]} key={item.id}>
                  <Text style={styles.tagButtonText} color={theme.id === 'liquid_glass' ? TIDE_COLOR.a2 : theme['c-primary-font-active']}>{item.name}</Text>
                </View>
              )
            : (
                <Button
                  style={[styles.tagButton, { backgroundColor: theme['c-button-background'] }, theme.id === 'liquid_glass' && styles.tideTag, theme.id === 'liquid_glass' && activeId == item.id && styles.tideActive]}
                  key={item.id}
                  onPress={() => { onTagChange(item.name, item.id) }}
                >
                  <Text style={styles.tagButtonText} color={theme.id === 'liquid_glass' ? TIDE_COLOR.t2 : theme['c-font']} >{item.name}</Text>
                </Button>
              )

        ))}
      </View>
    </View>
  )
}

const styles = createStyle({
  tideTag: {
    borderRadius: TIDE_RADIUS.pill,
    backgroundColor: TIDE_COLOR.fillMid,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    marginRight: TIDE_SPACE.row,
    marginBottom: TIDE_SPACE.row,
    overflow: 'hidden',
  },
  tideActive: {
    borderColor: TIDE_COLOR.a2,
    backgroundColor: 'rgba(121, 230, 255, 0.10)',
  },
  tagTypeTitle: {
    marginTop: 15,
    marginBottom: 10,
  },
  tagTypeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagButton: {
    // marginRight: 10,
    borderRadius: 4,
    marginRight: 10,
    marginBottom: 10,
  },
  tagButtonText: {
    fontSize: 13,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
})
