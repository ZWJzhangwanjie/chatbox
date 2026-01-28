/**
 * SDK 集成模块
 *
 * 提供与 @ai-ad-network/frontend-sdk 的集成接口
 */

export {
  ClientInfoAdapter,
  getClientInfoAdapter,
  getSdkClientInfo,
  getSdkUserId,
  clearSdkClientInfoCache,
  getSdkClientInfoStatus,
} from './clientInfoAdapter';

export type {
  SdkDeviceInfo,
  SdkUserInfo,
  SdkAppInfo,
  SdkGeoInfo,
  SdkClientInfo,
  ClientInfoOptions,
  ClientInfoResult,
} from './clientInfoAdapter';
