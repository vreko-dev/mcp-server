import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className, ...props }: any) => (
			<div className={className} data-testid="motion-div" {...props}>
				{children}
			</div>
		),
	},
}));

vi.mock("../../../modules/saas/dashboard/components/vitals/VitalBar", () => ({
	VitalBar: ({ label, value, subtitle, variant, isActive }: any) => (
		<div
			data-testid={`vital-bar-${label.toLowerCase()}`}
			data-value={value}
			data-variant={variant}
			data-active={isActive}
		>
			{label}: {value}% - {subtitle}
		</div>
	),
}));

import { VitalsGrid } from "../../../modules/saas/dashboard/components/vitals/VitalsGrid";

const healthyVitals = {
	pulse: 0,
	temperature: 0,
	pressure: 0,
	oxygen: 100,
	score: 100,
};

const elevatedVitals = {
	pulse: 5,
	temperature: 30,
	pressure: 40,
	oxygen: 85,
	score: 75,
};

describe("VitalsGrid", () => {
	describe("Healthy State (All Green)", () => {
		it("should render healthy hero state when score is 100", () => {
			render(<VitalsGrid vitals={healthyVitals} />);
			const heroState = screen.getByTestId("vitals-hero-healthy");
			expect(heroState).toBeInTheDocument();
		});

		it("should show heart emoji in healthy state", () => {
			render(<VitalsGrid vitals={healthyVitals} />);
			expect(screen.getByText("All Protected")).toBeInTheDocument();
		});

		it("should show healthy message", () => {
			render(<VitalsGrid vitals={healthyVitals} />);
			expect(screen.getByText(/no action needed/i)).toBeInTheDocument();
		});

		it("should not show individual vital bars when healthy", () => {
			render(<VitalsGrid vitals={healthyVitals} />);
			expect(screen.queryByTestId("vital-bar-oxygen")).not.toBeInTheDocument();
		});
	});

	describe("Elevated State (Showing Vitals)", () => {
		it("should render vitals grid when not fully healthy", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			expect(screen.queryByTestId("vitals-hero-healthy")).not.toBeInTheDocument();
		});

		it("should show oxygen bar as hero metric", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const oxygenBar = screen.getByTestId("vital-bar-oxygen");
			expect(oxygenBar).toBeInTheDocument();
		});

		it("should show pulse bar", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const pulseBar = screen.getByTestId("vital-bar-pulse");
			expect(pulseBar).toBeInTheDocument();
		});

		it("should show temperature bar", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const tempBar = screen.getByTestId("vital-bar-temperature");
			expect(tempBar).toBeInTheDocument();
		});

		it("should show pressure bar", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const pressureBar = screen.getByTestId("vital-bar-pressure");
			expect(pressureBar).toBeInTheDocument();
		});
	});

	describe("Vital Values", () => {
		it("should pass correct oxygen value", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const oxygenBar = screen.getByTestId("vital-bar-oxygen");
			expect(oxygenBar).toHaveAttribute("data-value", "85");
		});

		it("should pass correct pulse value", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const pulseBar = screen.getByTestId("vital-bar-pulse");
			expect(pulseBar).toHaveAttribute("data-value", "5");
		});

		it("should pass correct temperature value", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const tempBar = screen.getByTestId("vital-bar-temperature");
			expect(tempBar).toHaveAttribute("data-value", "30");
		});

		it("should pass correct pressure value", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const pressureBar = screen.getByTestId("vital-bar-pressure");
			expect(pressureBar).toHaveAttribute("data-value", "40");
		});
	});

	describe("Variant Assignment", () => {
		it("should assign warning variant to oxygen when below 80%", () => {
			render(<VitalsGrid vitals={{ ...elevatedVitals, oxygen: 75 }} />);
			const oxygenBar = screen.getByTestId("vital-bar-oxygen");
			expect(oxygenBar).toHaveAttribute("data-variant", "warning");
		});

		it("should assign success variant to oxygen when 80% or above", () => {
			render(<VitalsGrid vitals={{ ...elevatedVitals, oxygen: 85 }} />);
			const oxygenBar = screen.getByTestId("vital-bar-oxygen");
			expect(oxygenBar).toHaveAttribute("data-variant", "success");
		});

		it("should assign warning variant to pressure when above 50%", () => {
			render(<VitalsGrid vitals={{ ...elevatedVitals, pressure: 60 }} />);
			const pressureBar = screen.getByTestId("vital-bar-pressure");
			expect(pressureBar).toHaveAttribute("data-variant", "warning");
		});
	});

	describe("Activity State", () => {
		it("should set oxygen as active when below 100", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const oxygenBar = screen.getByTestId("vital-bar-oxygen");
			expect(oxygenBar).toHaveAttribute("data-active", "true");
		});

		it("should set pulse as active when above 0", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const pulseBar = screen.getByTestId("vital-bar-pulse");
			expect(pulseBar).toHaveAttribute("data-active", "true");
		});

		it("should set temperature as active when above 0", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const tempBar = screen.getByTestId("vital-bar-temperature");
			expect(tempBar).toHaveAttribute("data-active", "true");
		});

		it("should set pressure as active when above 0", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const pressureBar = screen.getByTestId("vital-bar-pressure");
			expect(pressureBar).toHaveAttribute("data-active", "true");
		});
	});

	describe("Grid Layout", () => {
		it("should use 2-column grid", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const grid = screen.getByTestId("vitals-grid");
			expect(grid).toHaveClass("grid-cols-2");
		});

		it("should make oxygen span full width", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const oxygenContainer = screen.getByTestId("vital-bar-oxygen").parentElement;
			expect(oxygenContainer).toHaveClass("col-span-2");
		});

		it("should make pressure span full width", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const pressureContainer = screen.getByTestId("vital-bar-pressure").parentElement;
			expect(pressureContainer).toHaveClass("col-span-2");
		});
	});

	describe("Accessibility", () => {
		it("should have grid role", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const grid = screen.getByTestId("vitals-grid");
			expect(grid).toHaveAttribute("role", "group");
		});

		it("should have accessible label", () => {
			render(<VitalsGrid vitals={elevatedVitals} />);
			const grid = screen.getByTestId("vitals-grid");
			expect(grid).toHaveAttribute("aria-label", "Workspace vitals metrics");
		});
	});
});
