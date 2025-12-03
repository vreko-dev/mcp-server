# Contributing to SnapBack

First off, thank you for considering contributing to SnapBack! It's people like you that make SnapBack such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps which reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots or animated GIFs** if relevant
* **Include your environment details**: OS, Node.js version, VS Code version (if using extension)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior** and **explain which behavior you expected to see instead**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required template
* Follow the TypeScript styleguide
* Include tests when adding new features
* Update documentation as needed
* End all files with a newline

## Development Setup

### Prerequisites

* Node.js 18.17.0 or higher
* pnpm 10.14.0 or higher
* Git

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork locally**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/snapback-oss.git
   cd snapback-oss
   ```

3. **Install dependencies**:
   ```bash
   corepack enable
   pnpm install
   ```

4. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Make your changes** and commit them:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** on GitHub

### Building the Project

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @snapback/sdk build

# Watch mode for development
pnpm dev
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @snapback/sdk test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

### Code Style

We use Biome for code formatting and linting:

```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Fix lint issues
pnpm lint:fix
```

## Coding Standards

### TypeScript

* Use TypeScript for all new code
* Prefer interfaces over types for object shapes
* Use explicit return types for functions
* Avoid `any` - use `unknown` if type is truly unknown
* Use strict mode

### Testing

* Write tests for all new features
* Maintain or improve code coverage
* Test edge cases and error conditions
* Use descriptive test names

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

* `feat:` - New feature
* `fix:` - Bug fix
* `docs:` - Documentation only changes
* `style:` - Code style changes (formatting, etc.)
* `refactor:` - Code refactoring
* `test:` - Adding or updating tests
* `chore:` - Maintenance tasks

Examples:
```
feat: add snapshot search functionality
fix: resolve race condition in file watcher
docs: update SDK installation guide
```

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Ensure all tests pass** (`pnpm test`)
4. **Ensure code is formatted** (`pnpm format`)
5. **Ensure no lint errors** (`pnpm lint`)
6. **Update the CHANGELOG** using changesets:
   ```bash
   pnpm changeset
   ```
7. **Request review** from maintainers
8. **Address review feedback** promptly

### Review Criteria

Your PR will be reviewed for:

* **Functionality**: Does it work as intended?
* **Tests**: Are there adequate tests?
* **Code Quality**: Is the code clean and maintainable?
* **Documentation**: Is it well documented?
* **Performance**: Does it impact performance?
* **Breaking Changes**: Are breaking changes necessary and documented?

## Contributor License Agreement (CLA)

By contributing to SnapBack, you agree that your contributions will be licensed under the MIT License (for most packages) or Apache 2.0 License (for @snapback/core).

You retain copyright to your contributions, but grant SnapBack the right to use, modify, and distribute your contributions as part of the project.

## Project Structure

```
snapback-oss/
├── apps/
│   ├── cli/           # CLI tool
│   └── vscode/        # VS Code extension
├── packages/
│   ├── sdk/           # TypeScript SDK
│   ├── core/          # Core functionality
│   ├── contracts/     # Shared types
│   ├── config/        # Configuration utilities
│   └── events/        # Event system
├── examples/          # Example projects
└── docs/              # Documentation
```

## Package-Specific Guidelines

### @snapback/sdk

* Keep the API simple and intuitive
* Maintain backward compatibility when possible
* Document all public methods
* Include JSDoc comments

### @snapback/core

* Focus on performance
* Minimize dependencies
* Write comprehensive tests
* Consider edge cases

### @snapback/cli

* Keep commands intuitive
* Provide helpful error messages
* Include examples in help text
* Test on multiple platforms

### snapback-vscode

* Follow VS Code extension guidelines
* Test in multiple VS Code versions
* Keep bundle size minimal
* Respect VS Code themes and settings

## Getting Help

* **GitHub Issues**: For bugs and feature requests
* **GitHub Discussions**: For questions and general discussion
* **Discord**: For real-time chat with the community

## Recognition

Contributors are recognized in:

* `CONTRIBUTORS.md` file
* Release notes for their contributions
* GitHub contributors page

Thank you for contributing to SnapBack! 🧢
