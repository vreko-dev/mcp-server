/**
 * Core Services
 *
 * Centralized business logic services for SnapBack core functionality.
 * All services follow the Result<T, E> pattern for type-safe error handling.
 *
 * @module @snapback/core/services
 * @package @snapback/core
 */

export { DEVICE_TRIAL_CONSTANTS, type DeviceTrialConstants } from "./device-trials.constants";
// Device Trial Service
export {
	DeviceBlockedError,
	type DeviceTrialData,
	DeviceTrialDatabaseError,
	DeviceTrialErrorBase,
	DeviceTrialErrorCode,
	DeviceTrialService,
	InvalidFingerprintError,
	isDeviceTrialError,
} from "./device-trials.service";
