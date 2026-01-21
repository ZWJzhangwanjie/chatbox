import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { focusAtom } from 'jotai-optics'
import type { ModelPersonalization, ResponseStyle } from 'src/shared/types/personalization'
import { settingsAtom } from './settingsAtoms'
import storage, { StorageKey } from '@/storage'

/**
 * 个性化设置状态管理
 * 使用 Jotai 实现响应式状态管理
 */

// ==================== 个性化配置 Atoms ====================

/**
 * 所有模型个性化配置的 atom（只读）
 * key: `${provider}:${modelId}`, value: ModelPersonalization
 */
export const modelPersonalizationsAtom = atom((get) => {
  const settings = get(settingsAtom)
  return settings.modelPersonalizations || {}
})

/**
 * 更新 settings 中的 modelPersonalizations
 * 内部 atom，用于持久化存储
 */
const _updateModelPersonalizationsAtom = atom(
  null,
  (get, set, update: Settings['modelPersonalizations']) => {
    const currentSettings = get(settingsAtom)
    // 使用 setSettings 更新整个 settings
    set(currentSettings.modelPersonalizations !== update ? { ...currentSettings, modelPersonalizations: update } : currentSettings)
  }
)

/**
 * 更新或新增特定模型的个性化配置
 * 使用方式: const updatePersonalization = useAtomValue(updateModelPersonalizationAtom)
 *   updatePersonalization(provider, modelId, { temperature: 0.8 })
 */
export const updateModelPersonalizationAtom = atom(
  null,
  (get, set, update: { provider: string; modelId: string; config: Partial<ModelPersonalization> }) => {
    const all = get(modelPersonalizationsAtom)
    const key = `${update.provider}:${update.modelId}`

    const existing = all[key]
    const updated: ModelPersonalization = {
      provider: update.provider,
      modelId: update.modelId,
      ...(existing || {}),
      ...update.config,
      customInstructions: update.config.customInstructions ?? existing?.customInstructions ?? [],
    }

    const newPersonalizations = {
      ...all,
      [key]: updated,
    }

    // 更新到 settings
    const currentSettings = get(settingsAtom)
    set(currentSettings.modelPersonalizations !== newPersonalizations
      ? { ...currentSettings, modelPersonalizations: newPersonalizations }
      : currentSettings)
  }
)

/**
 * 删除特定模型的个性化配置
 */
export const deleteModelPersonalizationAtom = atom(
  null,
  (get, set, { provider, modelId }: { provider: string; modelId: string }) => {
    const all = get(modelPersonalizationsAtom)
    const key = `${provider}:${modelId}`
    const { [key]: removed, ...rest } = all

    const currentSettings = get(settingsAtom)
    set(Object.keys(rest).length > 0
      ? { ...currentSettings, modelPersonalizations: rest }
      : { ...currentSettings, modelPersonalizations: undefined })
  }
)

/**
 * 获取所有已配置个性化设置的模型列表
 */
export const personalizedModelsListAtom = atom((get) => {
  const all = get(modelPersonalizationsAtom)
  return Object.entries(all).map(([key, config]) => ({
    key,
    provider: config.provider,
    modelId: config.modelId,
    config,
  }))
})

/**
 * 获取特定模型的个性化配置
 * 使用方式: const personalization = useAtomValue(getModelPersonalizationAtom)
 */
export const getModelPersonalizationAtom = atom(
  (get) => (provider: string, modelId: string): ModelPersonalization | undefined => {
    const all = get(modelPersonalizationsAtom)
    const key = `${provider}:${modelId}`
    return all[key]
  }
)

// ==================== 预设风格模板 ====================

/**
 * 预设回复风格模板
 * 用户可以选择预设风格，自动应用相关参数
 */
export const responseStylePresets: Record<ResponseStyle, Omit<ModelPersonalization, 'provider' | 'modelId'>> = {
  precise: {
    temperature: 0.2,
    responseStyle: 'precise',
    customInstructions: [
      {
        id: 'precise-1',
        title: 'Precise Answers',
        content: 'Provide accurate, concise, fact-based responses. Avoid redundancy and speculation.',
        enabled: true,
      },
    ],
  },
  creative: {
    temperature: 1.2,
    responseStyle: 'creative',
    customInstructions: [
      {
        id: 'creative-1',
        title: 'Creative Mode',
        content: 'Encourage creative thinking, provide diverse and novel solutions. Feel free to explore and diverge.',
        enabled: true,
      },
    ],
  },
  balanced: {
    temperature: 0.7,
    responseStyle: 'balanced',
    customInstructions: [
      {
        id: 'balanced-1',
        title: 'Balanced Mode',
        content: 'Maintain a balance between accuracy and creativity, providing practical and easy-to-understand responses.',
        enabled: true,
      },
    ],
  },
}

/**
 * 应用预设风格到模型配置
 */
export const applyResponseStylePresetAtom = atom(
  null,
  (get, set, { provider, modelId, style }: { provider: string; modelId: string; style: ResponseStyle }) => {
    const preset = responseStylePresets[style]
    if (!preset) return

    get(updateModelPersonalizationAtom)({
      provider,
      modelId,
      config: {
        temperature: preset.temperature,
        responseStyle: preset.responseStyle,
        customInstructions: preset.customInstructions,
      },
    })
  }
)

// ==================== 自定义指令管理 ====================

/**
 * 自定义指令库（全局共享）
 * 用户可以创建可复用的自定义指令
 */
interface CustomInstructionLibrary {
  id: string
  title: string
  content: string
  createdAt: number
  category?: string
}

const CUSTOM_INSTRUCTIONS_STORAGE_KEY = 'custom-instructions-library'

export const customInstructionsLibraryAtom = atomWithStorage<Record<string, CustomInstructionLibrary>>(
  CUSTOM_INSTRUCTIONS_STORAGE_KEY,
  {},
  storage
)

/**
 * 添加自定义指令到库
 */
export const addCustomInstructionAtom = atom(
  null,
  (get, set, instruction: Omit<CustomInstructionLibrary, 'id' | 'createdAt'>) => {
    const library = get(customInstructionsLibraryAtom)
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`
    set(customInstructionsLibraryAtom, {
      ...library,
      [id]: {
        ...instruction,
        id,
        createdAt: Date.now(),
      },
    })
    return id
  }
)

/**
 * 更新自定义指令
 */
export const updateCustomInstructionAtom = atom(
  null,
  (get, set, { id, ...updates }: Partial<CustomInstructionLibrary> & { id: string }) => {
    const library = get(customInstructionsLibraryAtom)
    if (!library[id]) return
    set(customInstructionsLibraryAtom, {
      ...library,
      [id]: { ...library[id], ...updates },
    })
  }
)

/**
 * 删除自定义指令
 */
export const deleteCustomInstructionAtom = atom(
  null,
  (get, set, id: string) => {
    const library = get(customInstructionsLibraryAtom)
    const { [id]: removed, ...rest } = library
    set(customInstructionsLibraryAtom, rest)
  }
)

/**
 * 获取所有自定义指令列表
 */
export const customInstructionsListAtom = atom((get) => {
  const library = get(customInstructionsLibraryAtom)
  return Object.values(library).sort((a, b) => b.createdAt - a.createdAt)
})

// ==================== UI 状态 ====================

/**
 * 当前正在编辑的模型个性化配置
 * 用于设置页面的编辑状态
 */
export const editingModelPersonalizationAtom = atom<{
  provider: string
  modelId: string
} | null>(null)

/**
 * 自定义指令编辑对话框状态
 */
export const customInstructionDialogAtom = atom<{
  open: boolean
  editingId?: string
  mode?: 'create' | 'edit'
}>({ open: false })
