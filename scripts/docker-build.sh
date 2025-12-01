#!/bin/bash

# Docker build script for SnapBack application
# Handles production and development builds with proper error handling

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${IMAGE_NAME:-snapback}"
BUILD_TYPE="${1:-production}"
TAG="${2:-latest}"
DOCKER_CONTEXT="${DOCKER_CONTEXT:-.}"
PLATFORM="${PLATFORM:-linux/amd64,linux/arm64}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up build cache..."
    docker system prune -f --filter "label=snapback.build.cache=true" 2>/dev/null || true
}

check_dependencies() {
    log_info "Checking dependencies..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check buildx for multi-platform builds
    if ! docker buildx version &> /dev/null; then
        log_warning "Docker buildx not available, multi-platform builds disabled"
        PLATFORM="linux/amd64"
    fi

    log_success "Dependencies check passed"
}

build_production() {
    log_info "Building production image: ${IMAGE_NAME}:${TAG}"

    # Create buildx builder if needed
    docker buildx create --use --name snapback-builder 2>/dev/null || docker buildx use snapback-builder 2>/dev/null || true

    # Build with caching and multi-platform support
    docker buildx build \
        --platform="${PLATFORM}" \
        --file="Dockerfile" \
        --target="runner" \
        --tag="${IMAGE_NAME}:${TAG}" \
        --tag="${IMAGE_NAME}:production" \
        --cache-from=type=local,src=/tmp/.buildx-cache \
        --cache-to=type=local,dest=/tmp/.buildx-cache-new,mode=max \
        --label="snapback.build.type=production" \
        --label="snapback.build.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --label="snapback.build.cache=true" \
        --push=${PUSH_IMAGE:-false} \
        "${DOCKER_CONTEXT}"

    # Move cache to avoid storage issues
    rm -rf /tmp/.buildx-cache
    mv /tmp/.buildx-cache-new /tmp/.buildx-cache 2>/dev/null || true

    log_success "Production build completed: ${IMAGE_NAME}:${TAG}"
}

build_development() {
    log_info "Building development image: ${IMAGE_NAME}:dev"

    docker build \
        --file="Dockerfile.dev" \
        --tag="${IMAGE_NAME}:dev" \
        --tag="${IMAGE_NAME}:development" \
        --label="snapback.build.type=development" \
        --label="snapback.build.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --label="snapback.build.cache=true" \
        "${DOCKER_CONTEXT}"

    log_success "Development build completed: ${IMAGE_NAME}:dev"
}

show_usage() {
    echo "Usage: $0 [BUILD_TYPE] [TAG]"
    echo ""
    echo "BUILD_TYPE:"
    echo "  production   Build production image (default)"
    echo "  development  Build development image"
    echo "  both         Build both production and development images"
    echo ""
    echo "TAG:"
    echo "  Image tag (default: latest)"
    echo ""
    echo "Environment variables:"
    echo "  IMAGE_NAME      Docker image name (default: snapback)"
    echo "  DOCKER_CONTEXT  Build context path (default: .)"
    echo "  PLATFORM        Target platform (default: linux/amd64,linux/arm64)"
    echo "  PUSH_IMAGE      Push image after build (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Build production image with latest tag"
    echo "  $0 development              # Build development image"
    echo "  $0 production v1.2.3        # Build production image with v1.2.3 tag"
    echo "  PUSH_IMAGE=true $0          # Build and push to registry"
}

# Main execution
main() {
    # Handle help flag
    if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
        show_usage
        exit 0
    fi

    log_info "Starting Docker build process..."
    log_info "Build type: ${BUILD_TYPE}"
    log_info "Image: ${IMAGE_NAME}:${TAG}"
    log_info "Platform: ${PLATFORM}"

    check_dependencies

    case "${BUILD_TYPE}" in
        production)
            build_production
            ;;
        development|dev)
            build_development
            ;;
        both)
            build_production
            build_development
            ;;
        *)
            log_error "Invalid build type: ${BUILD_TYPE}"
            show_usage
            exit 1
            ;;
    esac

    # Show image sizes
    log_info "Image sizes:"
    docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

    log_success "Docker build process completed successfully!"
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"