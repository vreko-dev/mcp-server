# Contributing to SnapBack MCP Server

Thank you for your interest in contributing to SnapBack! This document provides guidelines for contributing to the MCP server.

## Code of Conduct

Please be respectful and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Open an issue with `[Feature Request]` prefix
2. Describe the use case
3. Explain why it would be valuable

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make your changes**
4. **Add tests** if applicable
5. **Run tests**: `pnpm test`
6. **Commit** with clear message: `feat: add X` or `fix: resolve Y`
7. **Push** to your fork
8. **Open PR** against `main`

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mcp-server.git
cd mcp-server

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Start in development mode
pnpm dev
```

## Project Structure

```
mcp-server/
├── src/
│   ├── index.ts          # Main server entry
│   ├── auth.ts           # Authentication logic
│   ├── services/         # Analysis, routing
│   ├── tools/            # MCP tool implementations
│   └── context7/         # Context7 integration
├── test/                 # Test files
└── package.json
```

## Guidelines

### Code Style

- Use TypeScript
- Follow existing patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance

### Testing

- Add tests for new features
- Ensure existing tests pass
- Aim for good coverage on core logic

## Areas We Need Help

- 🐛 Bug fixes
- 📝 Documentation improvements
- 🧪 More test coverage
- 🌐 Internationalization
- ♿ Accessibility improvements

## Questions?

- Open an issue
- Join our community: [Discord link]
- Email: hello@snapback.dev

## License

By contributing, you agree your contributions will be licensed under Apache-2.0.
