import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { View, TouchableOpacity, type ImageSourcePropType } from 'react-native'
import { setTheme } from '@/core/theme'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'

import SubTitle from '../../components/SubTitle'
import { BG_IMAGES, getAllThemes, type LocalTheme } from '@/theme/themes'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { Icon } from '@/components/common/Icon'
import ImageBackground from '@/components/common/ImageBackground'

const useActive = (id: string) => {
  const activeThemeId = useSettingValue('theme.id')
  const isActive = useMemo(() => activeThemeId == id, [activeThemeId, id])
  return isActive
}

// 默认只铺开 3 套精选主题，其余收进「更多主题」。
// 17 套一次摊开会造成选择过载，且大多数主题只有配色差异，用户并不需要逐个比对。
// 顺序即展示顺序：液态玻璃（默认）/ 黑灯瞎火（唯一深色备选）/ 绿意盎然（浅色最常用）
const FEATURED_THEME_IDS = ['liquid_glass', 'black', 'green']

const ThemeItem = ({ id, name, color, image, setTheme }: {
  id: string
  name: string
  color: string
  image?: ImageSourcePropType
  setTheme: (id: string) => void
}) => {
  const theme = useTheme()
  const isActive = useActive(id)

  // 是否显示由父级 displayThemes 统一过滤，这里不再自行判断：
  // 原实现在此处又判了一次 showAll，折叠态下非当前选中的主题会被一并滤掉
  return (
    <TouchableOpacity style={{ ...styles.item, width: scaleSizeH(ITEM_HEIGHT) }} activeOpacity={0.5} onPress={() => { setTheme(id) }}>
      <View style={{ ...styles.colorContent, width: scaleSizeH(COLOR_ITEM_HEIGHT), borderColor: isActive ? color : 'transparent' }}>
        {
          image
            ? <ImageBackground style={{ ...styles.imageContent, width: scaleSizeH(IMAGE_HEIGHT), backgroundColor: color }}
                imageStyle={{ borderRadius: 4 }}
                source={image} />
            : <View style={{ ...styles.imageContent, width: scaleSizeH(IMAGE_HEIGHT), backgroundColor: color }}></View>
          }
      </View>
      <Text style={styles.name} size={12} color={isActive ? color : theme['c-font']} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  )
}

const MoreBtn = ({ expanded, onToggle }: {
  expanded: boolean
  onToggle: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()

  // 展开后按钮仍需存在，否则用户无法收回（17 套全部铺开太长）。
  // chevron-right 展开时旋转 90° 朝下，收起时朝右，符合常见折叠语义
  return (
    <TouchableOpacity style={styles.moreBtn} activeOpacity={0.5} onPress={onToggle}>
      <Text size={14} color={theme['c-primary-font']} numberOfLines={1}>
        {t(expanded ? 'setting_basic_theme_more_btn_hide' : 'setting_basic_theme_more_btn_show')}
      </Text>
      <Icon
        name="chevron-right"
        size={12}
        color={theme['c-primary-font']}
        style={expanded ? styles.arrowExpanded : undefined}
      />
    </TouchableOpacity>
  )
}

interface ThemeInfo {
  themes: Readonly<LocalTheme[]>
  userThemes: LX.Theme[]
  dataPath: string
}
const initInfo: ThemeInfo = { themes: [], userThemes: [], dataPath: '' }
export default memo(() => {
  const [showAll, setShowAll] = useState(false)
  const t = useI18n()
  const activeThemeId = useSettingValue('theme.id')
  const [themeInfo, setThemeInfo] = useState(initInfo)
  const setThemeId = useCallback((id: string) => {
    requestAnimationFrame(() => {
      setTheme(id)
    })
  }, [])

  useEffect(() => {
    void getAllThemes().then(setThemeInfo)
  }, [])

  // 折叠态下：3 个精选 + 当前生效主题（若它不在精选内）。
  // 当前主题必须始终显示，否则用户切到某个非精选主题后，
  // 会看不到自己正在用哪一套，也无法确认选中状态。
  // 注意：filter 按原数组顺序遍历，而原数组里 green 排第一、liquid_glass 在末尾，
  // 直接 filter 得不到期望顺序，需按 FEATURED_THEME_IDS 重新排序
  const displayThemes = useMemo(() => {
    if (showAll) return themeInfo.themes
    const picked = themeInfo.themes.filter(({ id }) => (
      FEATURED_THEME_IDS.includes(id) || id == activeThemeId
    ))
    const rank = (id: string) => {
      const i = FEATURED_THEME_IDS.indexOf(id)
      // 非精选（仅因当前选中而临时显示）排在精选之后
      return i < 0 ? FEATURED_THEME_IDS.length : i
    }
    return picked.slice().sort((a, b) => rank(a.id) - rank(b.id))
  }, [themeInfo.themes, showAll, activeThemeId])

  return (
    <SubTitle title={t('setting_basic_theme')}>
      <View style={styles.list}>
        {
          displayThemes.map(({ id, config }) => {
            return <ThemeItem
              key={id}
              color={config.themeColors['c-theme']}
              image={config.extInfo['bg-image'] ? BG_IMAGES[config.extInfo['bg-image']] : undefined}
              id={id}
              name={t(`theme_${id}`)}
              setTheme={setThemeId} />
          })
        }
        {
          themeInfo.userThemes.map(({ id, name, config }) => {
            return <ThemeItem
              key={id}
              color={config.themeColors['c-theme']}
              // image={undefined}
              id={id}
              name={name}
              setTheme={setThemeId} />
          })
        }
        <MoreBtn expanded={showAll} onToggle={() => { setShowAll(!showAll) }} />
      </View>
    </SubTitle>
  )
})

const ITEM_HEIGHT = 62
const COLOR_ITEM_HEIGHT = 36
const IMAGE_HEIGHT = 29
const styles = createStyle({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  item: {
    // marginRight: 15,
    alignItems: 'center',
    // marginTop: 5,
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  colorContent: {
    height: COLOR_ITEM_HEIGHT,
    borderRadius: 4,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  imageContent: {
    height: IMAGE_HEIGHT,
    borderRadius: 4,
    // elevation: 1,
  },
  name: {
    marginTop: 2,
  },
  moreBtn: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center',
    gap: 8,
  },
  // 展开态箭头由右转向下，用旋转而非换图标，避免多引一个资源
  arrowExpanded: {
    transform: [{ rotate: '90deg' }],
  },
})
