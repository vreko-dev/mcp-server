#!/usr/bin/env python3
import re

def analyze_svg_structure():
    """Analyze SVG structure for optimization opportunities"""

    with open('/Users/user1/WebstormProjects/SnapBack-Site/apps/web/public/images/snapback-glass-cropped.svg', 'r') as f:
        content = f.read()

    # Extract current viewBox
    viewbox_pattern = r'viewBox="([^"]*)"'
    viewbox_match = re.search(viewbox_pattern, content)

    if viewbox_match:
        current_viewbox = viewbox_match.group(1)
        print(f"Current viewBox: {current_viewbox}")

        # Parse viewBox values
        values = [float(x) for x in current_viewbox.split()]
        min_x, min_y, width, height = values

        print(f"Current bounds: x=[{min_x}, {min_x + width}], y=[{min_y}, {min_y + height}]")

    # Extract transform matrix
    transform_pattern = r'transform="matrix\(([^)]*)\)"'
    transform_matches = re.findall(transform_pattern, content)

    if transform_matches:
        for i, transform in enumerate(transform_matches):
            values = [float(x) for x in transform.split(', ')]
            print(f"Transform {i+1}: scale_x={values[0]}, scale_y={values[3]}, translate_x={values[4]}, translate_y={values[5]}")

    # Check for image dimensions
    image_pattern = r'<image[^>]*width="(\d+)"[^>]*height="(\d+)"'
    image_match = re.search(image_pattern, content)

    if image_match:
        img_width = int(image_match.group(1))
        img_height = int(image_match.group(2))
        print(f"Embedded image size: {img_width} x {img_height}")

        # Calculate actual content area
        if transform_matches:
            transform_vals = [float(x) for x in transform_matches[0].split(', ')]
            scale_x = transform_vals[0]
            scale_y = transform_vals[3]
            translate_x = transform_vals[4]
            translate_y = transform_vals[5]

            actual_width = img_width * scale_x
            actual_height = img_height * scale_y

            content_min_x = translate_x
            content_min_y = translate_y
            content_max_x = translate_x + actual_width
            content_max_y = translate_y + actual_height

            print(f"Calculated content bounds: x=[{content_min_x}, {content_max_x}], y=[{content_min_y}, {content_max_y}]")

            # Calculate optimal viewBox with slight padding
            padding = 0.1
            optimal_min_x = content_min_x - padding
            optimal_min_y = content_min_y - padding
            optimal_width = actual_width + (2 * padding)
            optimal_height = actual_height + (2 * padding)

            print(f"Optimal viewBox with {padding} padding: {optimal_min_x} {optimal_min_y} {optimal_width} {optimal_height}")

            # Compare with current
            if viewbox_match:
                current_area = width * height
                optimal_area = optimal_width * optimal_height
                savings = ((current_area - optimal_area) / current_area) * 100

                print(f"Current area: {current_area:.2f}")
                print(f"Optimal area: {optimal_area:.2f}")
                print(f"Area reduction: {savings:.2f}%")

                if abs(savings) < 1:
                    print("Current viewBox is already well optimized (< 1% potential savings)")
                    return None
                else:
                    return f"{optimal_min_x} {optimal_min_y} {optimal_width} {optimal_height}"

    return None

if __name__ == "__main__":
    result = analyze_svg_structure()
    if result:
        print(f"Recommended new viewBox: {result}")
    else:
        print("Current viewBox is already optimal or near-optimal.")