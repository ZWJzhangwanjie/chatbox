import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useMemo } from 'react'
import type { ModelPersonalization, ResponseStyle } from 'src/shared/types/personalization'
import {
  applyResponseStylePresetAtom,
  customInstructionDialogAtom,
  customInstructionsListAtom,
  deleteModelPersonalizationAtom,
  getModelPersonalizationAtom,
  modelPersonalizationsAtom,
  personalizedModelsListAtom,
  updateModelPersonalizationAtom,
} from '@/stores/atoms/personalizationAtoms'

/**
 * 模型个性化设置 Hook
 * 提供完整的个性化配置管理功能
 */
export function useModelPersonalization() {
  // 获取所有个性化配置（只读）
  const personalizations = useAtomValue(modelPersonalizationsAtom)

  // 获取已配置模型的列表
  const personalizedModels = useAtomValue(personalizedModelsListAtom)

  // 获取特定模型的配置
  const getPersonalization = useCallback(
    (provider: string, modelId: string): ModelPersonalization | undefined => {
      const key = `${provider}:${modelId}`
      return personalizations[key]
    },
    [personalizations]
  )

  // 更新特定模型的配置
  const updatePersonalization = useSetAtom(updateModelPersonalizationAtom)

  // 删除特定模型的配置
  const deletePersonalization = useSetAtom(deleteModelPersonalizationAtom)

  // 应用预设风格
  const applyStylePreset = useSetAtom(applyResponseStylePresetAtom)

  // 检查模型是否有个性化配置
  const hasPersonalization = useCallback(
    (provider: string, modelId: string): boolean => {
      return getPersonalization(provider, modelId) !== undefined
    },
    [getPersonalization]
  )

  return {
    personalizations,
    personalizedModels,
    getPersonalization,
    updatePersonalization,
    deletePersonalization,
    applyStylePreset,
    hasPersonalization,
  }
}

/**
 * 单个模型的个性化配置 Hook
 * 用于在设置页面中编辑特定模型的配置
 */
export function useModelPersonalizationEdit(provider: string, modelId: string) {
  const personalizations = useAtomValue(modelPersonalizationsAtom)
  const updatePersonalization = useSetAtom(updateModelPersonalizationAtom)
  const deletePersonalization = useSetAtom(deleteModelPersonalizationAtom)

  const config = useMemo(() => {
    const key = `${provider}:${modelId}`
    return personalizations[key]
  }, [personalizations, provider, modelId])

  const updateConfig = useCallback(
    (updates: Partial<ModelPersonalization>) => {
      updatePersonalization({ provider, modelId, config: updates })
    },
    [provider, modelId, updatePersonalization]
  )

  const removeConfig = useCallback(() => {
    deletePersonalization({ provider, modelId })
  }, [provider, modelId, deletePersonalization])

  const applyStyle = useCallback(
    (style: ResponseStyle) => {
      // 导入预设风格
      const { responseStylePresets } = require('@/stores/atoms/personalizationAtoms')
      const preset = responseStylePresets[style]
      if (!preset) return

      updateConfig({
        temperature: preset.temperature,
        responseStyle: preset.responseStyle,
        customInstructions: preset.customInstructions,
      })
    },
    [updateConfig]
  )

  return {
    config,
    updateConfig,
    removeConfig,
    applyStyle,
    hasConfig: config !== undefined,
  }
}

/**
 * 自定义指令库 Hook
 * 管理全局可复用的自定义指令
 */
export function useCustomInstructions() {
  const instructions = useAtomValue(customInstructionsListAtom)

  const [dialogState, setDialogState] = useAtom(customInstructionDialogAtom)

  const openCreateDialog = useCallback(() => {
    setDialogState({ open: true, mode: 'create' })
  }, [setDialogState])

  const openEditDialog = useCallback(
    (id: string) => {
      setDialogState({ open: true, mode: 'edit', editingId: id })
    },
    [setDialogState]
  )

  const closeDialog = useCallback(() => {
    setDialogState({ open: false })
  }, [setDialogState])

  return {
    instructions,
    dialogState,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  }
}

/**
 * 获取模型个性化后的会话设置
 * 将个性化配置与基础会话设置合并
 */
export function usePersonalizedSessionSettings(
  baseSettings: Record<string, unknown>,
  provider: string,
  modelId: string
): Record<string, unknown> {
  const getPersonalization = useAtomValue(getModelPersonalizationAtom)

  const personalization = useMemo(() => getPersonalization(provider, modelId), [getPersonalization, provider, modelId])

  return useMemo(() => {
    if (!personalization) return baseSettings

    const merged: Record<string, unknown> = { ...baseSettings }

    // 应用基础参数
    if (personalization.temperature !== undefined) {
      merged.temperature = personalization.temperature
    }
    if (personalization.maxTokens !== undefined) {
      merged.maxTokens = personalization.maxTokens
    }
    if (personalization.topP !== undefined) {
      merged.topP = personalization.topP
    }

    // 应用自定义指令（合并到系统提示）
    if (personalization.customInstructions && personalization.customInstructions.length > 0) {
      const enabledInstructions = personalization.customInstructions
        .filter((inst) => inst.enabled)
        .map((inst) => inst.content)
        .join('\n\n')

      if (enabledInstructions) {
        const existingPrompt = merged.systemPrompt as string | undefined
        merged.systemPrompt = existingPrompt
          ? `${enabledInstructions}\n\n${existingPrompt}`
          : enabledInstructions
      }
    }

    // 应用系统提示词
    if (personalization.systemPrompt) {
      const existingPrompt = merged.systemPrompt as string | undefined
      merged.systemPrompt = personalization.systemPrompt
    }

    return merged
  }, [baseSettings, personalization])
}
