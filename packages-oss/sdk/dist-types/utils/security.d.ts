/**
 * Custom error class for security violations
 */
export declare class SecurityError extends Error {
    constructor(message: string);
}
/**
 * Validate file paths to prevent path traversal attacks
 * @param filePath - The file path to validate
 * @throws SecurityError if the path is invalid
 */
export declare function validatePath(filePath: string): void;
/**
 * Sanitize input for JSON to prevent injection attacks
 * @param obj - The object to sanitize
 * @throws SecurityError if dangerous patterns are found
 */
export declare function sanitizeForJSON(obj: any): any;
//# sourceMappingURL=security.d.ts.map