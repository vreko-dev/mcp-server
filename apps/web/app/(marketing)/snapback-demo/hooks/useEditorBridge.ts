import { useRef } from "react";

interface EditorBridgeOptions {
	impl: "monaco" | "sandpack";
	onSave: (content: string) => void;
	onContentChange: (content: string) => void;
}

interface EditorBridge {
	handleMount: (editor: any) => void;
	handleChange: (value: string | undefined) => void;
	handleSave: () => void;
}

/**
 * Hook to bridge different editor implementations (Monaco vs Sandpack)
 */
export function useEditorBridge({
	impl,
	onSave,
	onContentChange,
}: EditorBridgeOptions): EditorBridge {
	const editorRef = useRef<any>(null);

	const handleMount = (editor: any) => {
		editorRef.current = editor;

		// Add save command for Monaco
		if (impl === "monaco" && editor.addCommand) {
			// Note: In a real implementation, we would import monaco
			// editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
		}
	};

	const handleChange = (value: string | undefined) => {
		if (value !== undefined) {
			onContentChange(value);
		}
	};

	const handleSave = () => {
		if (editorRef.current) {
			let content = "";

			if (impl === "monaco") {
				content = editorRef.current.getValue();
			} else {
				// For Sandpack, content is managed differently
				// This would be passed from the Sandpack component
				content = ""; // Would be passed as parameter in real implementation
			}

			onSave(content);
		}
	};

	return {
		handleMount,
		handleChange,
		handleSave,
	};
}
