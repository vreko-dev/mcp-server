/**
 * Bridge exports
 * @module bridge
 */

export {
	BridgeReceiver,
	type BridgeReceiverConfig,
	type BridgeReceiverStatus,
	createPatternObservation,
	createProgressObservation,
	createRiskObservation,
	createSuggestionObservation,
	createWarningObservation,
	getBridgeReceiver,
	startBridgeReceiver,
	stopBridgeReceiver,
} from "./receiver.js";
