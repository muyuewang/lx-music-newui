import { Pressable, StyleSheet } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { TIDE_COLOR, createThemedStyle } from '@/components/liquid/tide'
import { useIsPlay } from '@/store/player/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useHorizontalMode } from '@/utils/hooks'

/** 播放条自身承担材质，内部次操作不再套一层玻璃圆钮。 */
export default () => {
  const isPlay = useIsPlay()
  const horizontal = useHorizontalMode()
  // 原来三个图标都硬编码 #FFFFFF：浅色玻璃上白图标等于消失，
  // 必须换成会随明暗切换的 TIDE_COLOR.t1。
  return (
    <>
      {horizontal
        ? <Pressable
            accessibilityRole="button"
            accessibilityLabel="上一首"
            onPress={() => { void playPrev() }}
            style={({ pressed }) => [styles.control, pressed ? styles.pressed : null]}
          >
            <Icon name="prevMusic" size={21} color={TIDE_COLOR.t1} />
          </Pressable>
        : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPlay ? '暂停' : '播放'}
        onPress={togglePlay}
        style={({ pressed }) => [styles.control, styles.primary, pressed ? styles.pressed : null]}
      >
        <Icon name={isPlay ? 'pause' : 'play'} size={24} color={TIDE_COLOR.t1} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="下一首"
        onPress={() => { void playNext() }}
        style={({ pressed }) => [styles.control, pressed ? styles.pressed : null]}
      >
        <Icon name="nextMusic" size={21} color={TIDE_COLOR.t1} />
      </Pressable>
    </>
  )
}

const styles = createThemedStyle(() => StyleSheet.create({
  control: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  primary: { backgroundColor: TIDE_COLOR.fillMid },
  pressed: { opacity: 0.65, transform: [{ scale: 0.94 }] },
}))
