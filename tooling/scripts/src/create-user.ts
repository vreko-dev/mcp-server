import * as readline from "node:readline";
import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import {
	createUser,
	createUserAccount,
	getUserByEmail,
} from "@snapback/platform/db/queries";
import { nanoid } from "nanoid";

// Create readline interface for user input
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

// Helper function to get user input
function getUserInput(question: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer);
		});
	});
}

// Helper function for yes/no questions
async function getConfirmation(question: string): Promise<boolean> {
	const answer = await getUserInput(`${question} (y/n): `);
	return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

async function main() {
	logger.info("Let's create a new user for your application!");

	const email = await getUserInput("Enter an email: ");
	if (!email) {
		logger.error("Email is required!");
		rl.close();
		return;
	}

	const name = await getUserInput("Enter a name: ");
	if (!name) {
		logger.error("Name is required!");
		rl.close();
		return;
	}

	const isAdmin = await getConfirmation("Should user be an admin?");

	const authContext = await auth.$context;
	const adminPassword = nanoid(16);
	const hashedPassword = await authContext.password.hash(adminPassword);

	// check if user exists
	const user = await getUserByEmail(email);

	if (user) {
		logger.error("User with this email already exists!");
		rl.close();
		return;
	}

	const adminUser = await createUser({
		email,
		name,
		role: isAdmin ? "admin" : "user",
		emailVerified: true,
		onboardingComplete: true,
	});

	if (!adminUser) {
		logger.error("Failed to create user!");
		rl.close();
		return;
	}

	await createUserAccount({
		userId: adminUser.id,
		providerId: "credential",
		accountId: adminUser.id,
		hashedPassword,
	});

	logger.info("User created successfully!");
	logger.info(`Here is the password for the new user: ${adminPassword}`);
	rl.close();
}

main().catch((error) => {
	logger.error("Error creating user:", error);
	rl.close();
});
