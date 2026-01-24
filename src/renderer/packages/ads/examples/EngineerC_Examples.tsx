/**
 * 工程师C (UI与集成层) 参考示例
 *
 * 展示如何在UI组件中使用配置系统
 */

import { useState } from 'react';
import {
  // Hooks
  useAdConfig,
  useIsAdEnabled,
  useIsDebugMode,
  useActiveFormats,
  useIsFormatEnabled,
  useFormatConfig,
  useAllFormatsConfig,
  useApiConfig,
  useDataCollectionConfig,
  usePrivacyConfig,
  useToggleAds,
  useToggleFormat,
  useUpdateApiConfig,
  useUpdateFormatConfig,
  useUpdateDataCollectionConfig,
  useUpdatePrivacyConfig,
  useAdSystemStatus,
  useAdSystemReady,
  useResetAdConfig,
  // 常量
  AD_FORMAT_COMPONENT_MAP,
  SUPPORTED_AD_FORMATS,
  SUPPORTED_AD_PLACEMENTS,
  // 类型
  type AdFormat,
  type AdPlacement,
} from '@/packages/ads';

// ============================================================================
// 示例 1: 基本设置 UI
// ============================================================================

/**
 * 基本广告设置面板
 */
export function BasicAdSettings() {
  const enabled = useIsAdEnabled();
  const debugMode = useIsDebugMode();
  const toggleAds = useToggleAds();
  const updateConfig = useAdConfigStore((s) => s.updateConfig);

  return (
    <div className="ad-settings">
      <h2>广告设置</h2>

      {/* 广告开关 */}
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={toggleAds}
        />
        启用广告系统
      </label>

      {/* 调试模式开关 */}
      <label>
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(e) => updateConfig({ debug: e.target.checked })}
        />
        调试模式
      </label>
    </div>
  );
}

// ============================================================================
// 示例 2: API 配置 UI
// ============================================================================

/**
 * API 配置表单
 */
export function ApiConfigForm() {
  const apiConfig = useApiConfig();
  const updateApi = useUpdateApiConfig();

  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateApi({
      baseUrl,
      apiKey,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>API 配置</h3>

      <div>
        <label>API 地址:</label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.ad-network.com/v1"
        />
      </div>

      <div>
        <label>API Key:</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="ak_your_tenant_your_key"
        />
      </div>

      <button type="submit">保存配置</button>
    </form>
  );
}

// ============================================================================
// 示例 3: 广告格式配置 UI
// ============================================================================

/**
 * 单个格式配置卡片
 */
function FormatConfigCard({ format }: { format: AdFormat }) {
  const isEnabled = useIsFormatEnabled(format);
  const config = useFormatConfig(format);
  const toggleFormat = useToggleFormat();
  const updateFormat = useUpdateFormatConfig();

  return (
    <div className="format-card">
      <div className="format-header">
        <h3>{format}</h3>
        <label>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={() => toggleFormat(format)}
          />
          启用
        </label>
      </div>

      {isEnabled && (
        <div className="format-config">
          {/* ActionCard 特有配置 */}
          {format === 'action_card' && 'variant' in config && (
            <div>
              <label>变体:</label>
              <select
                value={config.variant}
                onChange={(e) => updateFormat(format, { variant: e.target.value as any })}
              >
                <option value="horizontal">横向</option>
                <option value="vertical">纵向</option>
                <option value="compact">紧凑</option>
              </select>
            </div>
          )}

          {/* 通用配置 */}
          {'frequency' in config && (
            <div>
              <label>频率 (每N条消息):</label>
              <input
                type="number"
                min={1}
                max={20}
                value={config.frequency}
                onChange={(e) => updateFormat(format, { frequency: parseInt(e.target.value) })}
              />
            </div>
          )}

          {'maxPerSession' in config && (
            <div>
              <label>单次会话最大次数:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={config.maxPerSession}
                onChange={(e) => updateFormat(format, { maxPerSession: parseInt(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 所有格式配置面板
 */
export function FormatConfigPanel() {
  const allFormats = useAllFormatsConfig();

  return (
    <div className="format-config-panel">
      <h2>广告格式配置</h2>
      {SUPPORTED_AD_FORMATS.map((format) => (
        <FormatConfigCard key={format} format={format as AdFormat} />
      ))}
    </div>
  );
}

// ============================================================================
// 示例 4: 数据收集配置 UI
// ============================================================================

/**
 * 数据收集设置面板
 */
export function DataCollectionSettings() {
  const config = useDataCollectionConfig();
  const updateConfig = useUpdateDataCollectionConfig();

  return (
    <div className="data-collection-settings">
      <h2>数据收集设置</h2>

      <div className="checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={config.includeQuery}
            onChange={(e) => updateConfig({ includeQuery: e.target.checked })}
          />
          收集用户输入
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.includeResponse}
            onChange={(e) => updateConfig({ includeResponse: e.target.checked })}
          />
          收集 AI 响应
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.includeFullContext}
            onChange={(e) => updateConfig({ includeFullContext: e.target.checked })}
          />
          收集完整上下文
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.includeMemory}
            onChange={(e) => updateConfig({ includeMemory: e.target.checked })}
          />
          收集用户记忆
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.includeProfile}
            onChange={(e) => updateConfig({ includeProfile: e.target.checked })}
          />
          收集用户画像
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.enableAnonymization}
            onChange={(e) => updateConfig({ enableAnonymization: e.target.checked })}
          />
          启用数据脱敏
        </label>
      </div>

      <div>
        <label>上下文窗口大小 (最近N轮):</label>
        <input
          type="number"
          min={1}
          max={100}
          value={config.contextWindow}
          onChange={(e) => updateConfig({ contextWindow: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// 示例 5: 隐私配置 UI
// ============================================================================

/**
 * 隐私设置面板
 */
export function PrivacySettings() {
  const config = usePrivacyConfig();
  const updateConfig = useUpdatePrivacyConfig();

  return (
    <div className="privacy-settings">
      <h2>隐私设置</h2>

      <label>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => updateConfig({ enabled: e.target.checked })}
        />
        启用隐私保护
      </label>

      <label>
        <input
          type="checkbox"
          checked={config.requireConsent}
          onChange={(e) => updateConfig({ requireConsent: e.target.checked })}
        />
        需要用户同意
      </label>

      <div>
        <label>数据保留期限 (天, 0=不保留):</label>
        <input
          type="number"
          min={0}
          value={config.dataRetentionDays}
          onChange={(e) => updateConfig({ dataRetentionDays: parseInt(e.target.value) })}
        />
      </div>

      <div>
        <h3>允许收集的数据类型:</h3>
        {config.allowedDataTypes.map((type) => (
          <label key={type}>
            <input type="checkbox" checked readOnly />
            {type}
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 示例 6: 系统状态显示
// ============================================================================

/**
 * 广告系统状态面板
 */
export function AdSystemStatus() {
  const status = useAdSystemStatus();
  const ready = useAdSystemReady();

  return (
    <div className="ad-system-status">
      <h2>系统状态</h2>

      <div className="status-grid">
        <div className="status-item">
          <span>广告系统:</span>
          <span className={status.enabled ? 'status-enabled' : 'status-disabled'}>
            {status.enabled ? '已启用' : '已禁用'}
          </span>
        </div>

        <div className="status-item">
          <span>API 配置:</span>
          <span className={status.apiConfigured ? 'status-ok' : 'status-error'}>
            {status.apiConfigured ? '已配置' : '未配置'}
          </span>
        </div>

        <div className="status-item">
          <span>调试模式:</span>
          <span>{status.debugMode ? '开' : '关'}</span>
        </div>

        <div className="status-item">
          <span>Mock 模式:</span>
          <span>{status.useMock ? '开' : '关'}</span>
        </div>

        <div className="status-item">
          <span>隐私保护:</span>
          <span>{status.privacyEnabled ? '开' : '关'}</span>
        </div>

        <div className="status-item">
          <span>启用的格式:</span>
          <span>{status.activeFormats.length} 个</span>
        </div>

        <div className="status-item">
          <span>准备就绪:</span>
          <span className={ready ? 'status-ok' : 'status-warning'}>
            {ready ? '是' : '否'}
          </span>
        </div>
      </div>

      {status.activeFormats.length > 0 && (
        <div className="active-formats">
          <h3>已启用的格式:</h3>
          <ul>
            {status.activeFormats.map((format) => (
              <li key={format}>
                {format} ({AD_FORMAT_COMPONENT_MAP[format] || 'Unknown'})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 示例 7: 配置导入/导出
// ============================================================================

/**
 * 配置导入/导出面板
 */
export function ConfigImportExport() {
  const config = useAdConfig();
  const updateConfig = useAdConfigStore((s) => s.updateConfig);
  const resetConfig = useResetAdConfig();

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ad-config.json';
    a.click();
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        updateConfig(imported);
        alert('配置导入成功');
      } catch (error) {
        alert('配置导入失败: 无效的 JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="config-import-export">
      <h2>配置管理</h2>

      <button onClick={exportConfig}>导出配置</button>

      <label>
        <input type="file" accept=".json" onChange={importConfig} />
        导入配置
      </label>

      <button onClick={() => {
        if (confirm('确定要重置为默认配置吗？')) {
          resetConfig();
        }
      }}>
        重置为默认
      </button>
    </div>
  );
}

// ============================================================================
// 示例 8: 广告插槽组件 (简化版)
// ============================================================================

/**
 * 广告插槽组件示例
 *
 * 根据配置决定是否展示广告
 */
export function AdSlot({ format, context }: { format: AdFormat; context: any }) {
  const isEnabled = useIsFormatEnabled(format);
  const isSystemReady = useAdSystemReady();
  const formatConfig = useFormatConfig(format);

  // 如果格式未启用或系统未就绪，不展示
  if (!isEnabled || !isSystemReady) {
    return null;
  }

  // TODO: 这里应该调用工程师B提供的 hooks 来获取广告数据
  // const { ads, loading } = useAdData(context);

  return (
    <div className={`ad-slot ad-slot-${format}`}>
      {/* 这里应该渲染 SDK 提供的广告组件 */}
      <div className="ad-placeholder">
        {format} 广告将在这里显示
        <br />
        变体: {('variant' in formatConfig) ? formatConfig.variant : 'N/A'}
      </div>
    </div>
  );
}

// ============================================================================
// 示例 9: 预设配置快速切换
// ============================================================================

/**
 * 预设配置切换器
 */
export function PresetSwitcher() {
  const updateConfig = useAdConfigStore((s) => s.updateConfig);

  const applyPreset = async (preset: 'default' | 'dev' | 'demo' | 'minimal') => {
    let presetConfig;
    switch (preset) {
      case 'dev':
        const { getDevPresetConfig, mergePreset } = await import('@/packages/ads');
        presetConfig = mergePreset(getDevPresetConfig());
        break;
      case 'demo':
        const { getDemoPresetConfig, mergePreset } = await import('@/packages/ads');
        presetConfig = mergePreset(getDemoPresetConfig());
        break;
      case 'minimal':
        const { getMinimalPresetConfig, mergePreset } = await import('@/packages/ads');
        presetConfig = mergePreset(getMinimalPresetConfig());
        break;
      default:
        const { getDefaultAdConfig } = await import('@/packages/ads');
        presetConfig = getDefaultAdConfig();
    }
    updateConfig(presetConfig);
  };

  return (
    <div className="preset-switcher">
      <h2>快速预设</h2>
      <button onClick={() => applyPreset('default')}>默认配置</button>
      <button onClick={() => applyPreset('dev')}>开发环境</button>
      <button onClick={() => applyPreset('demo')}>演示环境</button>
      <button onClick={() => applyPreset('minimal')}>最小化配置</button>
    </div>
  );
}

// ============================================================================
// 示例 10: 完整的设置页面
// ============================================================================

/**
 * 完整的广告设置页面
 */
export function AdSettingsPage() {
  const [activeTab, setActiveTab] = useState<'basic' | 'formats' | 'data' | 'privacy' | 'status'>('basic');

  return (
    <div className="ad-settings-page">
      <div className="tabs">
        <button onClick={() => setActiveTab('basic')} className={activeTab === 'basic' ? 'active' : ''}>
          基本设置
        </button>
        <button onClick={() => setActiveTab('formats')} className={activeTab === 'formats' ? 'active' : ''}>
          格式配置
        </button>
        <button onClick={() => setActiveTab('data')} className={activeTab === 'data' ? 'active' : ''}>
          数据收集
        </button>
        <button onClick={() => setActiveTab('privacy')} className={activeTab === 'privacy' ? 'active' : ''}>
          隐私设置
        </button>
        <button onClick={() => setActiveTab('status')} className={activeTab === 'status' ? 'active' : ''}>
          系统状态
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'basic' && (
          <>
            <BasicAdSettings />
            <ApiConfigForm />
            <ConfigImportExport />
            <PresetSwitcher />
          </>
        )}
        {activeTab === 'formats' && <FormatConfigPanel />}
        {activeTab === 'data' && <DataCollectionSettings />}
        {activeTab === 'privacy' && <PrivacySettings />}
        {activeTab === 'status' && <AdSystemStatus />}
      </div>
    </div>
  );
}

// 添加必要的导入
import { useAdConfigStore } from '@/packages/ads';
