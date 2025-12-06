import { ContactForm } from "@marketing/home/components/ContactForm";
import { redirect } from "next/navigation";

export async function generateMetadata() {
	return {
		title: "Contact Us",
	};
}

export default async function ContactPage() {
	// Hardcoded value since we're removing legacy config
	const contactFormEnabled = true;

	if (!contactFormEnabled) {
		redirect("/");
	}

	return (
		<div className="container max-w-xl pt-32 pb-16">
			<div className="mb-12 pt-8 text-center">
				<h1 className="mb-2 font-bold text-5xl">Contact Us</h1>
				<p className="text-balance text-lg opacity-50">Get in touch with our team</p>
			</div>

			<ContactForm />
		</div>
	);
}
