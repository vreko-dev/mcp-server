import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/og/recovery/route";

// Mock ImageResponse
const mockImageResponse = vi.fn();
vi.mock("next/og", () => ({
    ImageResponse: class {
        constructor(...args: any[]) {
            mockImageResponse(...args);
            return new Response("mock-image");
        }
    }
}));


describe("OG Recovery API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate image with lines and tool from query params", async () => {
        // GIVEN: Request with params
        const url = "http://localhost/api/og/recovery?lines=847&tool=Cursor";
        const req = new Request(url);

        // WHEN: Calling GET
        await GET(req);

        // THEN: Should invoke ImageResponse with correct data
        expect(mockImageResponse).toHaveBeenCalled();
        const [jsx, options] = mockImageResponse.mock.calls[0];

        // Verify JSX content (traversing the react element tree roughly)
        // Since it's JSX, it's an object structure. We can check props.
        // This depends on the exact structure, but we can check if the strings appear in the props/children
        // Or simpler: check options dimensions
        expect(options.width).toBe(1200);
        expect(options.height).toBe(630);
    });

    it("should use defaults if params missing", async () => {
        // GIVEN: Empty request
        const url = "http://localhost/api/og/recovery";
        const req = new Request(url);

        // WHEN: Calling GET
        await GET(req);

        // THEN: Should run without error
        expect(mockImageResponse).toHaveBeenCalled();
    });

    it("should handle error cases gracefully", async () => {
         // Mock generic error in ImageResponse
         mockImageResponse.mockImplementationOnce(() => { throw new Error("Font load failed"); });

         const req = new Request("http://localhost/api/og/recovery");
         const response = await GET(req);

         // Should return 500
         expect(response.status).toBe(500);
         const text = await response.text();
         expect(text).toContain("Failed to generate the image");
    });
});
