// Export all test utilities for easy importing

// Data Factories
export {
	type ApiKey,
	type Checkpoint,
	createApiKey,
	createCheckpoint,
	createDevice,
	createOrganization,
	createUser,
	type Device,
	type Organization,
	type User,
} from "./data/factories";
// Fixtures
export { expect, login, logout, test } from "./fixtures/auth";
// Helper Functions
export {
	checkAccessibility,
	checkHeadingStructure,
} from "./helpers/accessibility";
export {
	mockApiResponses,
	mockNetworkError,
	mockSlowResponse,
} from "./helpers/api-mocking";
export {
	expectDateDisplayed,
	fillDateInput,
	fillDateTimeInput,
	formatDateForInput,
	getDateInFuture,
	getDateInPast,
} from "./helpers/datetime";
export {
	createTestFile,
	deleteTestFile,
	uploadFile,
	uploadMultipleFiles,
	waitForFileUpload,
} from "./helpers/file-upload";
export {
	expectFormErrors,
	expectNoFormErrors,
	fillAndSubmitForm,
	fillForm,
	submitForm,
	submitValidForm,
} from "./helpers/forms";
export {
	assertApiResponseTime,
	assertPageLoadTime,
	measureApiResponseTime,
	measurePageLoadPerformance,
	simulateNetworkConditions,
} from "./helpers/performance";
export {
	clearSearch,
	expectNoSearchResults,
	expectSearchResultsContain,
	expectSearchResultsCount,
	expectSearchSuggestions,
	performSearch,
	selectSearchSuggestion,
} from "./helpers/search";
export {
	compareElementScreenshot,
	compareResponsiveScreenshots,
	compareScreenshot,
	waitForAnimations,
} from "./helpers/visual-regression";
export { DashboardPage } from "./pages/dashboard";
// Page Object Models
export { LoginPage } from "./pages/login";
