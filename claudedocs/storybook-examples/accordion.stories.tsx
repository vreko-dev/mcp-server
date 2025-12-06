import type { Meta, StoryObj } from '@storybook/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ui/components/accordion';

const meta = {
  title: 'UI/Primitives/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['single', 'multiple'],
      description: 'Whether only one item can be open at a time',
    },
    collapsible: {
      control: 'boolean',
      description: 'Whether items can be collapsed (only for type="single")',
    },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[450px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is SnapBack?</AccordionTrigger>
        <AccordionContent>
          SnapBack is an automatic version control system that creates snapshots
          of your code every time you save, giving you the freedom to experiment
          without fear of losing your work.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2">
        <AccordionTrigger>How does automatic protection work?</AccordionTrigger>
        <AccordionContent>
          SnapBack monitors your file changes and automatically creates snapshots
          based on intelligent policies. You can configure protection levels, file
          patterns, and cooldown periods to match your workflow.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3">
        <AccordionTrigger>Can I restore previous versions?</AccordionTrigger>
        <AccordionContent>
          Yes! You can browse your snapshot timeline and restore any previous
          version with a single click. All snapshots are stored securely and can
          be accessed through the VSCode extension or web dashboard.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-[450px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Free Plan</AccordionTrigger>
        <AccordionContent>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            <li>100 snapshots per month</li>
            <li>7-day snapshot retention</li>
            <li>Single workspace</li>
            <li>Community support</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2">
        <AccordionTrigger>Solo Plan - $9/month</AccordionTrigger>
        <AccordionContent>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            <li>Unlimited snapshots</li>
            <li>30-day snapshot retention</li>
            <li>Unlimited workspaces</li>
            <li>Priority email support</li>
            <li>Advanced protection policies</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3">
        <AccordionTrigger>Team Plan - $29/month</AccordionTrigger>
        <AccordionContent>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            <li>Everything in Solo</li>
            <li>90-day snapshot retention</li>
            <li>Shared team workspaces</li>
            <li>Team analytics</li>
            <li>Priority chat support</li>
            <li>SSO integration</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const FAQ: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[600px]">
      <AccordionItem value="general">
        <AccordionTrigger>General Questions</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">How do I get started?</p>
              <p className="text-muted-foreground">
                Install the VSCode extension from the marketplace, sign in with
                your account, and SnapBack will start protecting your files
                automatically.
              </p>
            </div>
            <div>
              <p className="font-medium">Is my code secure?</p>
              <p className="text-muted-foreground">
                Yes, all snapshots are encrypted at rest and in transit. We use
                industry-standard AES-256 encryption.
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="technical">
        <AccordionTrigger>Technical Details</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Which files are protected?</p>
              <p className="text-muted-foreground">
                By default, all code files in your workspace. You can configure
                file patterns and exclusions in the settings.
              </p>
            </div>
            <div>
              <p className="font-medium">How long are snapshots kept?</p>
              <p className="text-muted-foreground">
                Retention period depends on your plan: 7 days (Free), 30 days
                (Solo), 90 days (Team).
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="billing">
        <AccordionTrigger>Billing & Plans</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Can I change plans?</p>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade at any time. Changes take
                effect immediately.
              </p>
            </div>
            <div>
              <p className="font-medium">Do you offer refunds?</p>
              <p className="text-muted-foreground">
                We offer a 30-day money-back guarantee for all paid plans.
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const CustomStyling: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[500px]">
      <AccordionItem value="item-1" className="border-0 bg-muted/30 rounded-lg px-4 mb-2">
        <AccordionTrigger className="hover:no-underline">
          🚀 Getting Started
        </AccordionTrigger>
        <AccordionContent>
          Install the extension and authenticate to begin automatic protection.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2" className="border-0 bg-muted/30 rounded-lg px-4 mb-2">
        <AccordionTrigger className="hover:no-underline">
          ⚙️ Configuration
        </AccordionTrigger>
        <AccordionContent>
          Customize protection policies, file patterns, and notification settings.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3" className="border-0 bg-muted/30 rounded-lg px-4 mb-2">
        <AccordionTrigger className="hover:no-underline">
          📊 Analytics
        </AccordionTrigger>
        <AccordionContent>
          View your protection statistics, restore history, and usage metrics.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Nested: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[500px]">
      <AccordionItem value="workspace">
        <AccordionTrigger>Workspace Settings</AccordionTrigger>
        <AccordionContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="protection">
              <AccordionTrigger className="text-sm">
                Protection Policies
              </AccordionTrigger>
              <AccordionContent className="text-sm">
                Configure automatic protection rules, cooldown periods, and file
                patterns for this workspace.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="notifications">
              <AccordionTrigger className="text-sm">
                Notifications
              </AccordionTrigger>
              <AccordionContent className="text-sm">
                Choose when and how you receive notifications about snapshots
                and protection events.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="account">
        <AccordionTrigger>Account Settings</AccordionTrigger>
        <AccordionContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="profile">
              <AccordionTrigger className="text-sm">Profile</AccordionTrigger>
              <AccordionContent className="text-sm">
                Update your email, name, and avatar.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="billing">
              <AccordionTrigger className="text-sm">Billing</AccordionTrigger>
              <AccordionContent className="text-sm">
                Manage your subscription, payment method, and invoices.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark">
      <div className="bg-background p-8">
        <Accordion type="single" collapsible className="w-[450px]">
          <AccordionItem value="item-1">
            <AccordionTrigger>Dark mode support</AccordionTrigger>
            <AccordionContent>
              The accordion component automatically adapts to dark mode using
              semantic color tokens.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Theme customization</AccordionTrigger>
            <AccordionContent>
              All colors are driven by CSS custom properties, making it easy to
              customize the appearance.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

export const WithDefaultValue: Story = {
  args: {
    type: 'single',
    defaultValue: 'item-2',
  },
  render: (args) => (
    <Accordion {...args} collapsible className="w-[450px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>First item</AccordionTrigger>
        <AccordionContent>This item is closed by default.</AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2">
        <AccordionTrigger>Second item (open by default)</AccordionTrigger>
        <AccordionContent>
          This item is open by default because defaultValue is set to "item-2".
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3">
        <AccordionTrigger>Third item</AccordionTrigger>
        <AccordionContent>This item is also closed by default.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
