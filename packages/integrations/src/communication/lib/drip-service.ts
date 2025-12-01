import { logger } from "@snapback/infrastructure";

export interface DripEmail {
	template: string;
	delayDays: number;
}

export interface DripCampaign {
	id: string;
	userId: string;
	emails: DripEmail[];
}

export async function scheduleCampaign(campaign: DripCampaign): Promise<void> {
	logger.info("Scheduling drip campaign", {
		campaignId: campaign.id,
		userId: campaign.userId,
		emailCount: campaign.emails.length,
	});

	for (const [index, email] of campaign.emails.entries()) {
		const delay = email.delayDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

		setTimeout(async () => {
			try {
				logger.info("Sending drip email", {
					campaignId: campaign.id,
					userId: campaign.userId,
					template: email.template,
					sequence: index + 1,
				});

				// In real implementation, this would call the email service
				// await sendEmail({ ... });
			} catch (error) {
				logger.error("Failed to send drip email", {
					error,
					campaignId: campaign.id,
					userId: campaign.userId,
					template: email.template,
				});
			}
		}, delay);
	}
}
