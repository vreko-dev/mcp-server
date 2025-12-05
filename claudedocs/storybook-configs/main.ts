import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../modules/ui/components/**/*.stories.@(js|jsx|ts|tsx)',
    '../modules/marketing/components/**/*.stories.@(js|jsx|ts|tsx)',
    '../components/**/*.stories.@(js|jsx|ts|tsx)',
    '../app/**/components/**/*.stories.@(js|jsx|ts|tsx)',
  ],

  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-coverage',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: undefined,
      },
    },
  },

  core: {
    disableTelemetry: true,
  },

  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@ui': path.resolve(__dirname, '../modules/ui'),
          '@marketing': path.resolve(__dirname, '../modules/marketing'),
          '@': path.resolve(__dirname, '../'),
          // Add other aliases from your tsconfig paths
        },
      },
      define: {
        // Ensure process.env is available for any env checks
        'process.env': {},
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'motion', // Your Framer Motion fork
          '@radix-ui/react-accordion',
          '@radix-ui/react-alert-dialog',
          '@radix-ui/react-avatar',
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-label',
          '@radix-ui/react-select',
          '@radix-ui/react-separator',
          '@radix-ui/react-slot',
          '@radix-ui/react-switch',
          '@radix-ui/react-tabs',
          '@radix-ui/react-toast',
          '@radix-ui/react-tooltip',
        ],
      },
    });
  },

  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },

  staticDirs: ['../public'],

  typescript: {
    check: false, // Disable type checking for faster builds
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },
};

export default config;
