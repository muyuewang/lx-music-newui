import { memo, useCallback, useEffect, useRef } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { getExternalStoragePaths, stat } from '@/utils/fs'
import { useTheme } from '@/store/theme/hook'
import { isLiquidGlass } from '@/theme/isLiquidGlass'
import { TIDE_COLOR, TIDE_TYPE } from '@/components/liquid/tide'
import { scaleSizeH } from '@/utils/pixelRatio'
import { useStatusbarHeight } from '@/store/common/hook'
import NewFolderModal, { type NewFolderType } from './NewFolderModal'
import OpenStorageModal, { type OpenDirModalType } from './OpenStorageModal'
import type { PathItem } from './ListItem'


export default memo(({
  title,
  path,
  onRefreshDir,
  onOpenDir,
}: {
  title: string
  path: string
  onRefreshDir: (dir: string) => Promise<PathItem[]>
  onOpenDir: (dir: string) => Promise<PathItem[]>
}) => {
  const theme = useTheme()
  const newFolderTypeRef = useRef<NewFolderType>(null)
  const openDirModalTypeRef = useRef<OpenDirModalType>(null)
  const storagePathsRef = useRef<string[]>([])
  const statusBarHeight = useStatusbarHeight()

  const checkExternalStoragePath = useCallback(() => {
    storagePathsRef.current = []
    void getExternalStoragePaths().then(async(storagePaths) => {
      for (const path of storagePaths) {
        try {
          if (!(await stat(path)).canRead) continue
        } catch { continue }
        storagePathsRef.current.push(path)
      }
    })
  }, [])
  useEffect(() => {
    checkExternalStoragePath()
  }, [checkExternalStoragePath])

  const refresh = () => {
    void onRefreshDir(path)
    checkExternalStoragePath()
  }

  const openStorage = () => {
    openDirModalTypeRef.current?.show(storagePathsRef.current)
  }

  const handleShowNewFolderModal = () => {
    newFolderTypeRef.current?.show(path)
  }

  return (
    <>
      {/* 液态玻璃主题下这一条曾直接铺 c-content-background ——
          那是 rgb(22,31,60) 的不透明深蓝，压在磨砂面板顶部就是一道突兀的蓝条。
          改成半透明的 fillBottom + 极细底描边：与下方列表同属一块玻璃，
          只靠一层薄色和分隔线区分层级，而不是换一种材质。 */}
      <View style={{
        ...styles.header,
        height: scaleSizeH(50) + statusBarHeight,
        paddingTop: statusBarHeight,
        backgroundColor: isLiquidGlass(theme) ? TIDE_COLOR.fillBottom : theme['c-content-background'],
        borderBottomWidth: isLiquidGlass(theme) ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: TIDE_COLOR.edgeSoft,
      }} onStartShouldSetResponder={() => true}>
        <View style={styles.titleContent}>
          <Text
            color={isLiquidGlass(theme) ? TIDE_COLOR.t1 : theme['c-primary-font']}
            size={isLiquidGlass(theme) ? TIDE_TYPE.headline.size : 15}
            numberOfLines={1}
          >{title}</Text>
          <Text
            style={styles.subTitle}
            color={isLiquidGlass(theme) ? TIDE_COLOR.t3 : theme['c-primary-font']}
            size={isLiquidGlass(theme) ? TIDE_TYPE.foot.size : 13}
            numberOfLines={1}
          >{path}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={openStorage}>
            <Icon name="sd-card" color={isLiquidGlass(theme) ? TIDE_COLOR.t2 : theme['c-primary-font']} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShowNewFolderModal}>
            <Icon name="add_folder" color={isLiquidGlass(theme) ? TIDE_COLOR.t2 : theme['c-primary-font']} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={refresh}>
            <Icon name="available_updates" color={isLiquidGlass(theme) ? TIDE_COLOR.t2 : theme['c-primary-font']} size={22} />
          </TouchableOpacity>
        </View>
      </View>
      <OpenStorageModal ref={openDirModalTypeRef} onOpenDir={onOpenDir} />
      <NewFolderModal ref={newFolderTypeRef} onRefreshDir={onRefreshDir} />
    </>
  )
})

const styles = createStyle({
  header: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    elevation: 2,
    zIndex: 2,
    // borderBottomWidth: BorderWidths.normal,
  },
  titleContent: {
    flexGrow: 1,
    flexShrink: 1,
    // height: 57,
    // paddingRight: 5,
    // paddingBottom: 10,
  },
  // title: {
  //   paddingTop: 10,
  // },
  subTitle: {
    paddingTop: 1,
  },
  actions: {
    flexDirection: 'row',
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  actionBtn: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 6,
    paddingRight: 6,
    marginLeft: 10,
  },
  newFolderContent: {
    flexShrink: 1,
    flexDirection: 'column',
  },
  newFolderTitle: {
    marginBottom: 5,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 240,
    borderRadius: 4,
    paddingTop: 2,
    paddingBottom: 2,
  },
})

