"use client";

import { useEffect, useState } from "react";
import { useSnapBack } from "../context/SnapBackContext";
import type { Notification } from "../domain/types";

export function NotificationSystem() {
	const { state, dispatch } = useSnapBack();
	const [visibleNotifications, setVisibleNotifications] = useState<
		Notification[]
	>([]);
	const [showHistory, setShowHistory] = useState(false);

	// Manage notification visibility and timeouts
	useEffect(() => {
		const newNotifications = state.notifications.filter(
			(n) => !visibleNotifications.some((vn) => vn.id === n.id),
		);

		if (newNotifications.length > 0) {
			setVisibleNotifications((prev) => [...prev, ...newNotifications]);

			// Set timeouts for auto-dismissal
			newNotifications.forEach((notification) => {
				if (notification.duration !== 0) {
					// 0 means no auto-dismissal
					const timeout =
						notification.duration || state.settings.notifications.duration;
					setTimeout(() => {
						removeNotification(notification.id);
					}, timeout);
				}
			});
		}
	}, [state.notifications]);

	const removeNotification = (id: string) => {
		setVisibleNotifications((prev) => prev.filter((n) => n.id !== id));
		dispatch({ type: "REMOVE_NOTIFICATION", payload: id });
	};

	const clearAllNotifications = () => {
		setVisibleNotifications([]);
		dispatch({ type: "CLEAR_NOTIFICATIONS" });
	};

	const toggleHistory = () => {
		setShowHistory(!showHistory);
	};

	const getIcon = (type: Notification["type"]) => {
		switch (type) {
			case "success":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6 text-green-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Success</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				);
			case "warning":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6 text-yellow-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Warning</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				);
			case "error":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6 text-red-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Error</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				);
			default:
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6 text-blue-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Info</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				);
		}
	};

	return (
		<>
			{/* Toast Notifications */}
			<div className="fixed top-4 right-4 z-50 space-y-2">
				{visibleNotifications.map((notification) => (
					<div
						key={notification.id}
						className="bg-[#252526] border border-[#3a3d41] rounded-lg shadow-lg p-4 max-w-sm animate-fade-in text-gray-100"
					>
						<div className="flex items-start">
							<div className="flex-shrink-0">{getIcon(notification.type)}</div>
							<div className="ml-3 w-0 flex-1">
								<div className="text-sm font-medium text-gray-100">
									{notification.title}
								</div>
								<div className="mt-1 text-sm text-gray-300 whitespace-pre-line">
									{notification.message}
								</div>
								{notification.actions && notification.actions.length > 0 && (
									<div className="mt-3 flex space-x-2">
										{notification.actions.map((action, index) => (
											<button
												type="button"
												key={index}
												onClick={action.action}
												className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
											>
												{action.label}
											</button>
										))}
									</div>
								)}
							</div>
							<div className="ml-4 flex-shrink-0 flex">
								<button
									type="button"
									onClick={() => removeNotification(notification.id)}
									className="rounded-md inline-flex text-gray-400 hover:text-gray-200 focus:outline-none"
								>
									<span className="sr-only">Close</span>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Close</title>
										<path
											fillRule="evenodd"
											d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
							</div>
						</div>
					</div>
				))}

				{/* History Panel Toggle */}
				<div className="bg-[#252526] border border-[#3a3d41] rounded-lg shadow-lg p-2">
					<button
						type="button"
						onClick={toggleHistory}
						className="w-full text-center text-sm text-cyan-300 hover:text-cyan-200"
					>
						{showHistory ? "Hide History" : "Show History"} (
						{state.notifications.length})
					</button>
				</div>
			</div>

			{/* Notification History Panel */}
			{showHistory && (
				<div className="fixed top-4 right-64 z-50 w-96 max-h-96 overflow-y-auto bg-[#1e1e1e] border border-[#3a3d41] rounded-lg shadow-lg text-gray-100">
					<div className="p-4 border-b border-[#3a3d41] flex justify-between items-center">
						<h3 className="font-semibold">Notification History</h3>
						<div className="space-x-2">
							<button
								type="button"
								onClick={clearAllNotifications}
								className="text-sm text-red-400 hover:text-red-300"
							>
								Clear All
							</button>
							<button
								type="button"
								onClick={toggleHistory}
								className="text-sm text-gray-300 hover:text-gray-100"
							>
								Close
							</button>
						</div>
					</div>
					<div className="p-2">
						{state.notifications.length === 0 ? (
							<div className="p-4 text-center text-gray-400">
								No notifications
							</div>
						) : (
							<ul className="space-y-2">
								{state.notifications.map((notification) => (
									<li
										key={notification.id}
										className="p-3 border-b border-[#2d2d2d] hover:bg-[#252526] rounded"
									>
										<div className="flex items-start">
											<div className="flex-shrink-0 mt-0.5">
												{getIcon(notification.type)}
											</div>
											<div className="ml-3 flex-1">
												<div className="flex justify-between">
													<div className="text-sm font-medium text-gray-100">
														{notification.title}
													</div>
													<div className="text-xs text-gray-400">
														{notification.timestamp.toLocaleTimeString()}
													</div>
												</div>
												<div className="mt-1 text-sm text-gray-300 whitespace-pre-line">
													{notification.message}
												</div>
											</div>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}
		</>
	);
}
