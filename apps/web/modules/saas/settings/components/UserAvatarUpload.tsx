"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { Spinner } from "@shared/components/Spinner";
import { UserAvatar } from "@shared/components/UserAvatar";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { CropImageDialog } from "./CropImageDialog";

export function UserAvatarUpload({ onSuccess, onError }: { onSuccess: () => void; onError: () => void }) {
	const { user, reloadSession } = useSession();
	const [uploading, setUploading] = useState(false);
	const [cropDialogOpen, setCropDialogOpen] = useState(false);
	const [image, setImage] = useState<File | null>(null);

	const getSignedUploadUrlMutation = useMutation({
		mutationFn: async (_variables: any) => {
			// Stub implementation
			return { signedUploadUrl: "", path: "" };
		},
	});

	const { getRootProps, getInputProps } = useDropzone({
		onDrop: (acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0 && acceptedFiles[0]) {
				setImage(acceptedFiles[0]);
				setCropDialogOpen(true);
			}
		},
		accept: {
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
		},
		multiple: false,
	} as any);

	if (!user) {
		return null;
	}
	const onCrop = async (croppedImageData: Blob | null) => {
		if (!croppedImageData) {
			return;
		}

		setUploading(true);
		try {
			const { signedUploadUrl, path: _path } = await getSignedUploadUrlMutation.mutateAsync({});

			const response = await fetch(signedUploadUrl, {
				method: "PUT",
				body: croppedImageData,
				headers: {
					"Content-Type": "image/png",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to upload image");
			}

			// TODO: Replace with actual auth client when backend is ready
			// const { error } = await authClient.updateUser({ image: path });
			const { error } = { error: null };

			if (error) {
				throw error;
			}

			await reloadSession();

			onSuccess();
		} catch {
			onError();
		} finally {
			setUploading(false);
		}
	};

	return (
		<>
			<div className="relative size-24 rounded-full" {...getRootProps()}>
				<input {...(getInputProps() as any)} />
				<UserAvatar className="size-24 cursor-pointer text-xl" avatarUrl={user.image} name={user.name ?? ""} />

				{uploading && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-card/90">
						<Spinner className="size-6" />
					</div>
				)}
			</div>

			<CropImageDialog image={image} open={cropDialogOpen} onOpenChange={setCropDialogOpen} onCrop={onCrop} />
		</>
	);
}
